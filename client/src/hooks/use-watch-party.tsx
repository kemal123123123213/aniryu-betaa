import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { WatchParty } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WatchPartyStateUpdate {
  currentTime: number;
  isPlaying: boolean;
}

interface ChatMessage {
  userId: number;
  username: string;
  content: string;
  timestamp: string;
}

interface PartyParticipant {
  userId: number;
  username: string;
  joinedAt: string;
}

interface UseWatchPartyOptions {
  onSyncUpdate?: (update: WatchPartyStateUpdate) => void;
  onParticipantJoined?: (participant: PartyParticipant) => void;
  onParticipantLeft?: (userId: number) => void;
  onChatMessage?: (message: ChatMessage) => void;
}

export function useWatchParty(options: UseWatchPartyOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [activeParty, setActiveParty] = useState<WatchParty | null>(null);
  const [participants, setParticipants] = useState<PartyParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Host a new watch party
  const createPartyMutation = useMutation({
    mutationFn: async ({ animeId, episodeId, isPublic = true }: { animeId: number, episodeId: number, isPublic?: boolean }) => {
      const response = await apiRequest('POST', '/api/watch-party', {
        animeId,
        episodeId,
        isPublic
      });
      return await response.json();
    },
    onSuccess: (party: WatchParty) => {
      setActiveParty(party);
      connectToParty(party.id);
      toast({
        title: "İzleme partisi oluşturuldu",
        description: `Oda kodu: ${party.roomCode}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "İzleme partisi oluşturulamadı",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Join an existing watch party by code
  const joinPartyMutation = useMutation({
    mutationFn: async (roomCode: string) => {
      const response = await fetch(`/api/watch-party/${roomCode}`);
      if (!response.ok) {
        throw new Error('İzleme partisi bulunamadı');
      }
      return await response.json();
    },
    onSuccess: (party: WatchParty) => {
      setActiveParty(party);
      connectToParty(party.id);
      toast({
        title: "İzleme partisine katıldınız",
        description: "Diğer izleyicilerle senkronize ediliyorsunuz...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "İzleme partisine katılınamadı",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Connect to WebSocket when party is active
  const connectToParty = useCallback((partyId: number) => {
    // Kullanıcı kimliğini belirle (oturum açılmadıysa misafir kimliği kullan)
    const currentUserId = user ? user.id : 1;
    const currentUsername = user ? user.username : 'Misafir';
    
    // WebSocket bağlantısı oluştur
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    // Bağlantı açıldığında ilk mesajı gönder
    ws.onopen = () => {
      console.log('WebSocket bağlantısı kuruldu');
      setIsConnected(true);
      
      // İlk olarak basit bir "join" mesajı gönder (eski format uyumluluğu için)
      ws.send('join');
      
      // Sonra detaylı bilgileri JSON formatında gönder
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'join',
          partyId,
          userId: currentUserId,
          username: currentUsername
        }));
      }, 500);
    };
    
    ws.onclose = () => {
      console.log('WebSocket bağlantısı kapatıldı');
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket hatası:', error);
      toast({
        title: "Bağlantı hatası",
        description: "İzleme partisine bağlantı kurulamadı. Lütfen tekrar deneyin.",
        variant: "destructive"
      });
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'sync_update':
            if (activeParty?.id === message.partyId) {
              // Update local state
              setActiveParty((prev) => prev ? {
                ...prev,
                currentTime: message.currentTime,
                isPlaying: message.isPlaying
              } : null);
              
              // Trigger callback for video player
              options.onSyncUpdate?.({
                currentTime: message.currentTime,
                isPlaying: message.isPlaying
              });
            }
            break;
            
          case 'participant_joined':
            if (activeParty?.id === message.partyId) {
              const newParticipant = {
                userId: message.userId,
                username: message.username || `Kullanıcı ${message.userId}`,
                joinedAt: new Date().toISOString()
              };
              
              setParticipants((prev) => [
                ...prev.filter(p => p.userId !== message.userId),
                newParticipant
              ]);
              
              options.onParticipantJoined?.(newParticipant);
              
              toast({
                title: "Yeni katılımcı",
                description: `${message.username || 'Bir kullanıcı'} partiye katıldı`,
              });
            }
            break;
            
          case 'participant_left':
            if (activeParty?.id === message.partyId) {
              setParticipants((prev) => prev.filter(p => p.userId !== message.userId));
              options.onParticipantLeft?.(message.userId);
            }
            break;
            
          case 'chat_message':
            if (activeParty?.id === message.partyId) {
              const chatMessage = {
                userId: message.userId,
                username: message.username || `Kullanıcı ${message.userId}`,
                content: message.content,
                timestamp: message.timestamp
              };
              
              setChatMessages((prev) => [...prev, chatMessage]);
              options.onChatMessage?.(chatMessage);
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [user, activeParty, options, toast]);
  
  // Cleanup WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  // Send sync update to server and other participants
  const syncVideoState = useCallback((currentTime: number, isPlaying: boolean) => {
    if (!isConnected || !activeParty || !wsRef.current) return;
    
    // İlk olarak basit string mesajı gönder (eski format uyumluluğu için)
    const ws = wsRef.current;
    ws.send('sync');
    
    // Sonra detaylı bilgileri JSON formatında gönder
    setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'sync',
          partyId: activeParty.id,
          currentTime,
          isPlaying
        }));
      }
    }, 100);
  }, [isConnected, activeParty]);
  
  // Send chat message
  const sendChatMessage = useCallback((content: string) => {
    if (!isConnected || !activeParty || !wsRef.current) return;
    
    // Kullanıcı kimliğini belirle
    const currentUserId = user ? user.id : 1;
    const currentUsername = user ? user.username : 'Misafir';
    
    // İlk olarak basit string mesajı gönder (eski format uyumluluğu için)
    const ws = wsRef.current;
    ws.send('chat');
    
    // Sonra detaylı bilgileri JSON formatında gönder
    setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'chat',
          partyId: activeParty.id,
          userId: currentUserId,
          username: currentUsername,
          content
        }));
      }
    }, 100);
  }, [isConnected, activeParty, user]);
  
  // Leave the party
  const leaveParty = useCallback(() => {
    if (activeParty && wsRef.current) {
      const ws = wsRef.current;
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave',
          partyId: activeParty.id,
          userId: user?.id || 1
        }));
        
        ws.close();
      }
      
      setActiveParty(null);
      setParticipants([]);
      setChatMessages([]);
      setIsConnected(false);
      
      toast({
        title: "İzleme partisinden ayrıldınız",
        description: "İzleme partisinden başarıyla ayrıldınız",
      });
    }
  }, [activeParty, user, toast]);
  
  return {
    createParty: createPartyMutation.mutate,
    joinParty: joinPartyMutation.mutate,
    leaveParty,
    syncVideoState,
    sendChatMessage,
    isConnected,
    activeParty,
    participants,
    chatMessages,
  };
}