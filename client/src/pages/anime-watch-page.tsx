import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAnimeById } from '@/hooks/use-anilist';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { VideoPlayer } from '@/components/ui/video-player';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, ChevronLeft, ChevronRight, Send, Smile, BarChart } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

// Reaksiyon bileşeni
interface ReactionProps {
  animeId: number;
  episodeId: number;
}

function ReactionSection({ animeId, episodeId }: ReactionProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const reactionEmojis = ['😆', '😍', '😮', '😢', '😡', '🤔', '👍', '👎'];
  const socketRef = useRef<WebSocket | null>(null);
  
  // Bölüme ait reaksiyonları getir
  const { data: reactions = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/anime/${animeId}/episode/${episodeId}/reactions`]
  });
  
  // Son 5 reaksiyonu gösterecek şekilde filtrele
  const recentReactions = reactions.slice(-5).reverse();
  
  // WebSocket bağlantısı kur
  useEffect(() => {
    if (!socketRef.current) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_reaction' && 
              data.reaction.animeId === animeId && 
              data.reaction.episodeId === episodeId) {
            // Yeni reaksiyon geldiğinde query cache'i güncelle
            queryClient.setQueryData(
              [`/api/anime/${animeId}/episode/${episodeId}/reactions`],
              (old: any[] = []) => [...old, data.reaction]
            );
          }
        } catch (error) {
          console.error('WebSocket message processing error:', error);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      socketRef.current = socket;
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [animeId, episodeId]);
  
  // Reaksiyon gönder
  const sendReaction = (emoji: string) => {
    if (!user) return;
    
    const message = {
      type: 'reaction',
      animeId,
      episodeId,
      userId: user.id,
      reaction: emoji,
      timestamp: Date.now()
    };
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      setShowReactions(false);
    }
  };
  
  return (
    <div className="fixed bottom-24 right-6 z-20 flex flex-col items-end">
      {/* Son reaksiyonları göster */}
      <AnimatePresence>
        {recentReactions.map((reaction, index) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="bg-black/60 rounded-full px-3 py-1.5 mb-2 text-white backdrop-blur-sm"
          >
            <span className="text-xl mr-2">{reaction.reaction}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Reaksiyon paneli */}
      <div className="relative">
        <AnimatePresence>
          {showReactions && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute bottom-14 right-0 bg-black/80 backdrop-blur-sm rounded-lg p-3 grid grid-cols-4 gap-2"
            >
              {reactionEmojis.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className="text-2xl h-12 w-12 rounded-full hover:bg-white/10"
                  onClick={() => sendReaction(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          className="rounded-full bg-black/70 backdrop-blur-sm hover:bg-black/90 p-2 h-12 w-12"
          onClick={() => setShowReactions(!showReactions)}
        >
          <Smile className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

// Yorum bileşeni
interface CommentSectionProps {
  animeId: number;
  episodeId: number;
}

function CommentSection({ animeId, episodeId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [username, setUsername] = useState('Misafir');
  const commentInputRef = useRef<HTMLInputElement>(null);
  
  // Bölüme ait yorumları getir
  const { data: comments = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/anime/${animeId}/episode/${episodeId}/comments`]
  });
  
  // Yorum gönder
  const commentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      const response = await apiRequest('POST', '/api/comments', {
        animeId,
        episodeId,
        content: commentText,
        username: user ? user.username : username,
        userId: user ? user.id : undefined,
        parentId: null,
        timestamp: Math.floor(Date.now() / 1000)
      });
      return await response.json();
    },
    onSuccess: () => {
      setComment('');
      // Yorumları yeniden getir
      queryClient.invalidateQueries({ queryKey: [`/api/anime/${animeId}/episode/${episodeId}/comments`] });
    },
    onError: (error) => {
      console.error("Yorum gönderme hatası:", error);
    }
  });
  
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      commentMutation.mutate(comment);
    }
  };
  
  // Tarih formatlama
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (isLoading) {
    return (
      <div className="bg-[#2a2a2a] rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-[#333] rounded w-1/4"></div>
          <div className="h-32 bg-[#333] rounded"></div>
          <div className="h-32 bg-[#333] rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-[#2a2a2a] rounded-lg p-6">
      <form onSubmit={handleSubmitComment} className="mb-8">
        <div className="flex gap-3 items-start">
          <Avatar className="w-10 h-10">
            <AvatarImage src="" />
            <AvatarFallback>{user ? user.username.slice(0, 2).toUpperCase() : username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {user ? (
              <p className="text-sm font-medium mb-1">{user.username}</p>
            ) : (
              <div className="flex gap-2 mb-2">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="İsminiz"
                  className="w-1/3 bg-[#333] border-0"
                />
                <p className="text-xs text-gray-400 self-center">(Misafir olarak yorum yapıyorsunuz)</p>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                ref={commentInputRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Bir yorum yaz..."
                className="flex-1 bg-[#333] border-0"
              />
              <Button 
                type="submit" 
                disabled={commentMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {commentMutation.isPending ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
      
      {comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment: any) => (
            <div key={comment.id} className="group">
              <div className="flex gap-3 items-start">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-[#333]">
                    {comment.user?.username?.slice(0, 2).toUpperCase() || 'AN'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">
                      {comment.user?.username || 'Misafir'}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-300">{comment.content}</p>
                  
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-gray-500 hover:text-white">
                      Beğen
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-gray-500 hover:text-white">
                      Yanıtla
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-400">Henüz yorum bulunmuyor.</p>
          <p className="text-gray-500 text-sm mt-2">İlk yorumu sen yap!</p>
        </div>
      )}
    </div>
  );
}

// Anket bileşeni
interface PollSectionProps {
  animeId: number;
  episodeId: number;
}

function PollSection({ animeId, episodeId }: PollSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPollDrawer, setShowPollDrawer] = useState(false);
  
  // Bölüme ait anketleri getir
  const { data: polls = [], isLoading: isLoadingPolls } = useQuery<any[]>({
    queryKey: [`/api/anime/${animeId}/episode/${episodeId}/polls`]
  });
  
  // Eğer açık anket varsa onu göster
  const activePolls = polls.filter((poll: any) => poll.isActive);
  const latestPoll = activePolls.length > 0 ? activePolls[0] : null;
  
  // Anket seçeneklerini getir
  const { data: options = [], isLoading: isLoadingOptions } = useQuery<any[]>({
    queryKey: [`/api/polls/${latestPoll?.id}/options`],
    enabled: !!latestPoll
  });
  
  // Anket oylarını getir
  const { data: votes = [], isLoading: isLoadingVotes } = useQuery<any[]>({
    queryKey: [`/api/polls/${latestPoll?.id}/votes`],
    enabled: !!latestPoll
  });
  
  // Kullanıcının oyunu bul
  const userVote = user && votes.find((vote: any) => vote.userId === user.id);
  
  // Oyları hesapla
  const totalVotes = votes.length;
  const getVotePercentage = (optionId: number) => {
    if (totalVotes === 0) return 0;
    const optionVotes = votes.filter((vote: any) => vote.optionId === optionId).length;
    return Math.round((optionVotes / totalVotes) * 100);
  };
  
  // Oy ver
  const voteMutation = useMutation({
    mutationFn: async (optionId: number) => {
      if (!user || !latestPoll) return null;
      
      // WebSocket üzerinden oy gönder
      const message = {
        type: 'poll_vote',
        pollId: latestPoll.id,
        optionId,
        userId: user.id
      };
      
      // WebSocket bağlantısı
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      
      return new Promise((resolve, reject) => {
        socket.onopen = () => {
          socket.send(JSON.stringify(message));
          resolve(true);
        };
        
        socket.onerror = (error) => {
          reject(error);
        };
        
        // WebSocket kapandığında anket verilerini yenile
        socket.onclose = () => {
          queryClient.invalidateQueries({ queryKey: [`/api/polls/${latestPoll.id}/votes`] });
        };
      });
    },
    onSuccess: () => {
      toast({
        title: "Oy kaydedildi",
        description: "Oyunuz başarıyla kaydedildi."
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Oyunuz kaydedilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  });
  
  if (!latestPoll) {
    return null;
  }
  
  const isLoading = isLoadingPolls || isLoadingOptions || isLoadingVotes || voteMutation.isPending;
  
  return (
    <Drawer open={showPollDrawer} onOpenChange={setShowPollDrawer}>
      <DrawerTrigger asChild>
        <Button 
          className="fixed bottom-24 left-6 z-20 rounded-full bg-black/70 backdrop-blur-sm hover:bg-black/90 p-2 h-12 w-12"
        >
          <BarChart className="h-6 w-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-[#1a1a1a] text-white border-t border-gray-800">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="text-xl text-white">Bölüm Anketi</DrawerTitle>
            <DrawerDescription className="text-gray-400">
              {latestPoll.question}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-3">
            {options.map((option: any) => {
              const votePercentage = getVotePercentage(option.id);
              const isSelected = userVote?.optionId === option.id;
              
              return (
                <div key={option.id} className="relative">
                  <Button 
                    className={`w-full justify-start text-left p-4 h-auto ${
                      isSelected ? 'border-primary' : 'border-gray-700'
                    } relative z-10 bg-transparent`}
                    variant="outline"
                    disabled={!!userVote || isLoading}
                    onClick={() => voteMutation.mutate(option.id)}
                  >
                    {option.text}
                    {userVote && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2">
                        {votePercentage}%
                      </span>
                    )}
                  </Button>
                  
                  {userVote && (
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary/20 rounded-md transition-all duration-500 ease-out"
                      style={{ width: `${votePercentage}%`, zIndex: 5 }}
                    />
                  )}
                </div>
              );
            })}
            
            {userVote && (
              <p className="text-center text-sm text-gray-400 mt-4">
                Toplam {totalVotes} oy
              </p>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default function AnimeWatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const { data: anime, isLoading, error } = useAnimeById(Number(id));
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('episodes');
  const episodeId = parseInt(episode);
  
  useEffect(() => {
    if (anime) {
      document.title = `${anime.title?.turkish || anime.title?.romaji} Bölüm ${episode} - AnimeMax`;
    }
  }, [anime, episode]);
  
  // Intro skip özelliğinin simülasyonu için
  // Gerçek bir uygulamada, bu verilerin API'den gelmesi gerekir
  const hasIntro = true; // API'den gelecek gerçek veri
  useEffect(() => {
    // İlk 10 saniye içinde intro skip butonunu gösterme simülasyonu
    const timer = setTimeout(() => {
      // Bu değişken gerçekte VideoPlayer bileşeni içindedir
      // Bu sadece nasıl bir mantık kurulacağını göstermek için eklenmiştir
      console.log("Intro skip butonu gösterilebilir");
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [episodeId]);
  
  // Generate fake episode data for this demo
  // In a real application, this would come from an API
  const generateEpisodes = (count: number | null) => {
    return Array.from({ length: count || 12 }, (_, i) => ({
      id: i + 1,
      title: `Bölüm ${i + 1}`,
      thumbnail: anime?.coverImage?.medium || '',
      duration: 24 * 60, // 24 minutes in seconds
    }));
  };
  
  const episodes = anime ? generateEpisodes(anime.episodes || 12) : [];
  const currentEpisode = episodes.find(ep => ep.id === episodeId);
  
  // For demo purposes, create a static video URL
  // In a real app, you would fetch this from your API
  const videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  
  // Navigation between episodes
  const goToNextEpisode = () => {
    if (episodeId < (anime?.episodes || 0)) {
      setLocation(`/izle/${id}/${episodeId + 1}`);
      toast({
        title: "Bir sonraki bölüme geçiliyor",
        description: `Bölüm ${episodeId + 1}`
      });
    }
  };
  
  const goToPrevEpisode = () => {
    if (episodeId > 1) {
      setLocation(`/izle/${id}/${episodeId - 1}`);
    }
  };
  
  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/anime/${id}`}>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ChevronLeft className="h-5 w-5 mr-1" />
                Geri
              </Button>
            </Link>
            <Skeleton className="h-8 w-64 bg-[#2a2a2a]" />
          </div>
          
          <Skeleton className="w-full aspect-video mb-8 rounded-lg bg-[#2a2a2a]" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-12 w-full bg-[#2a2a2a] mb-4" />
              <Skeleton className="h-32 w-full bg-[#2a2a2a]" />
            </div>
            <div>
              <Skeleton className="h-8 w-full bg-[#2a2a2a] mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-16 w-full bg-[#2a2a2a]" />
                <Skeleton className="h-16 w-full bg-[#2a2a2a]" />
                <Skeleton className="h-16 w-full bg-[#2a2a2a]" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (error || !anime || !currentEpisode) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Bölüm bulunamadı</h1>
          <p className="text-gray-400 mb-8">İstediğiniz bölüm mevcut değil veya bir hata oluştu.</p>
          <div className="flex justify-center space-x-4">
            <Button onClick={() => setLocation('/')} className="bg-primary hover:bg-primary-dark">
              <Home className="mr-2 h-5 w-5" />
              Ana Sayfaya Dön
            </Button>
            {id && (
              <Button onClick={() => setLocation(`/anime/${id}`)} variant="outline" className="border-gray-600">
                Anime Sayfasına Dön
              </Button>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  const title = anime.title?.turkish || anime.title?.romaji || anime.title?.english;
  const description = anime.description?.replace(/<[^>]*>?/gm, '') || 'Açıklama bulunmuyor';
  const nextEpisodeAvailable = episodeId < (anime.episodes || 0);
  const prevEpisodeAvailable = episodeId > 1;

  // For demo purposes, create fake Turkish and English subtitles
  // In a real app, these would come from your API
  // Bu altyazı URL'lerini gerçek VTT dosyalarıyla değiştirin
  const subtitles = [
    { 
      lang: 'tr', 
      label: 'Türkçe', 
      url: 'https://raw.githubusercontent.com/mozilla/vtt.js/master/docs/samples/with-cue-settings.vtt' 
    },
    { 
      lang: 'en', 
      label: 'İngilizce', 
      url: 'https://raw.githubusercontent.com/mozilla/vtt.js/master/docs/samples/with-metadata.vtt' 
    },
    { 
      lang: 'ja', 
      label: 'Japonca', 
      url: 'https://raw.githubusercontent.com/mozilla/vtt.js/master/docs/samples/with-positioning.vtt' 
    }
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />
      
      <div className="container mx-auto px-6 md:px-8 py-8">
        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link href={`/anime/${id}`}>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ChevronLeft className="h-5 w-5 mr-1" />
                Anime Sayfasına Dön
              </Button>
            </Link>
          </div>
          
          <h1 className="text-xl font-bold hidden md:block">
            {title} - Bölüm {episodeId}
          </h1>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToPrevEpisode}
              disabled={!prevEpisodeAvailable}
              className={!prevEpisodeAvailable ? 'text-gray-600' : 'text-gray-400 hover:text-white'}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden md:inline">Önceki</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToNextEpisode}
              disabled={!nextEpisodeAvailable}
              className={!nextEpisodeAvailable ? 'text-gray-600' : 'text-gray-400 hover:text-white'}
            >
              <span className="hidden md:inline">Sonraki</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Mobile title (visible on small screens) */}
        <h1 className="text-xl font-bold mb-4 md:hidden">
          {title} - Bölüm {episodeId}
        </h1>
        
        {/* Video Player */}
        <div className="mb-8 relative">
          <VideoPlayer 
            videoUrl={videoUrl}
            animeId={Number(id)}
            episodeId={episodeId}
            duration={currentEpisode.duration}
            title={title || ""}
            episodeTitle={`Bölüm ${episodeId}`}
            subtitles={subtitles}
            onNext={nextEpisodeAvailable ? goToNextEpisode : undefined}
            nextEpisodeAvailable={nextEpisodeAvailable}
            thumbnailUrl={anime.coverImage?.medium || ""}
          />
          
          {/* Reaksiyon bileşeni */}
          <ReactionSection animeId={Number(id)} episodeId={episodeId} />
          
          {/* Anket bileşeni */}
          <PollSection animeId={Number(id)} episodeId={episodeId} />
        </div>
        
        {/* Content section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Info and comments */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-[#2a2a2a]">
                <TabsTrigger value="info">Bilgi</TabsTrigger>
                <TabsTrigger value="comments">Yorumlar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-4">
                <div className="bg-[#2a2a2a] rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-2">
                    {title} - Bölüm {episodeId}
                  </h2>
                  <p className="text-gray-400 mb-4">
                    {anime.format} • {anime.duration} dk • {anime.status === 'RELEASING' ? 'Devam Ediyor' : 'Tamamlandı'}
                  </p>
                  <p className="text-gray-300">{description}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="comments" className="mt-4">
                <CommentSection animeId={Number(id)} episodeId={episodeId} />
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right column - Episode list */}
          <div>
            <h3 className="text-lg font-bold mb-4">Bölümler</h3>
            <div className="bg-[#2a2a2a] rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {episodes.map((ep) => (
                  <Link key={ep.id} href={`/izle/${id}/${ep.id}`}>
                    <div className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${ep.id === episodeId ? 'bg-[#3a3a3a]' : 'hover:bg-[#3a3a3a]'}`}>
                      <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={ep.thumbnail} 
                          alt={`Bölüm ${ep.id}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">Bölüm {ep.id}</h4>
                        <p className="text-xs text-gray-400">{Math.floor(ep.duration / 60)} dk</p>
                      </div>
                      {ep.id === episodeId && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
