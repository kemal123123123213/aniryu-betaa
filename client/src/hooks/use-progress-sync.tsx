import { useAuth } from './use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';

interface WatchProgress {
  animeId: number;
  episodeId: number;
  progress: number;
  duration: number;
  lastWatched: string;
}

export function useProgressSync() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all watch progress data
  const { 
    data: progressData = [], 
    isLoading,
    isError,
    refetch 
  } = useQuery<WatchProgress[]>({
    queryKey: ['/api/sync-progress', user?.id || '1'],
    queryFn: async () => {
      const userId = user?.id || '1';
      const response = await fetch(`/api/sync-progress?userId=${userId}`);
      if (!response.ok) {
        throw new Error('İzleme ilerlemesi alınamadı');
      }
      return await response.json();
    }
  });

  // Sync progress with server
  const syncMutation = useMutation({
    mutationFn: async () => {
      const userId = user?.id || '1';
      const response = await fetch(`/api/sync-progress?userId=${userId}`);
      if (!response.ok) {
        throw new Error('İzleme ilerlemesi alınamadı');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      // Update cache with the latest data
      queryClient.setQueryData(['/api/sync-progress', user?.id || '1'], data);
      toast({
        title: "İzleme İlerlemesi Senkronize Edildi",
        description: "Tüm cihazlarınız arasında izleme ilerlemesi güncellendi.",
      });
    },
    onError: () => {
      toast({
        title: "Senkronizasyon Hatası",
        description: "İzleme ilerlemesi senkronize edilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  });

  // Get progress for a specific anime and episode
  const getProgress = (animeId: number, episodeId?: number) => {
    if (!progressData || !progressData.length) return null;
    
    // If episodeId is provided, find that specific episode
    if (episodeId) {
      return progressData.find(p => p.animeId === animeId && p.episodeId === episodeId) || null;
    }
    
    // Otherwise find all episodes for this anime, sorted by lastWatched
    const animeProgress = progressData
      .filter(p => p.animeId === animeId)
      .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());
    
    return animeProgress.length > 0 ? animeProgress[0] : null;
  };

  // Check if user has started watching this anime
  const hasStartedWatching = (animeId: number) => {
    return progressData.some(p => p.animeId === animeId);
  };

  // Get the most recently watched anime
  const getRecentlyWatched = (limit = 5) => {
    if (!progressData || !progressData.length) return [];
    
    // Group by animeId and get the most recent for each anime
    const animeMap = new Map<number, WatchProgress>();
    
    progressData.forEach(progress => {
      const existing = animeMap.get(progress.animeId);
      if (!existing || new Date(progress.lastWatched) > new Date(existing.lastWatched)) {
        animeMap.set(progress.animeId, progress);
      }
    });
    
    // Convert map to array, sort by lastWatched, and take the first 'limit' items
    return Array.from(animeMap.values())
      .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime())
      .slice(0, limit);
  };

  return {
    progressData,
    isLoading,
    isError,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    refetchProgress: refetch,
    getProgress,
    hasStartedWatching,
    getRecentlyWatched
  };
}