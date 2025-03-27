import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAnimeById } from '@/hooks/use-anilist';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimeSection } from '@/components/home/anime-section';
import { AIAnalysis } from '@/components/anime/ai-analysis';
import { Play, Heart, Plus, Calendar, Clock, Star, Users, Award, Info } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { AnilistAnime } from '@/lib/types';

export default function AnimeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: anime, isLoading, error } = useAnimeById(Number(id));
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('episodes');
  
  // Check if anime is in favorites
  useEffect(() => {
    if (user && anime) {
      fetch(`/api/favorites/check/${anime.id}`)
        .then(res => res.json())
        .then(data => {
          setIsFavorite(data.isFavorite);
        })
        .catch(error => {
          console.error('Error checking favorite status:', error);
        });
    }
  }, [user, anime]);
  
  // Get watch history
  const { data: watchHistory } = useQuery({
    queryKey: ['/api/watch-history', anime?.id],
    queryFn: async () => {
      if (!anime) return null;
      const response = await fetch(`/api/watch-history?animeId=${anime.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!anime && !!user,
  });
  
  // Add to favorites
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      if (!anime) return;
      await apiRequest("POST", "/api/favorites", {
        animeId: anime.id
      });
    },
    onSuccess: () => {
      setIsFavorite(true);
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      toast({
        title: "Favorilere Eklendi",
        description: "Anime favorilerinize eklendi!",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Favorilere eklenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  });
  
  // Remove from favorites
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      if (!anime) return;
      await apiRequest("DELETE", `/api/favorites/${anime.id}`, undefined);
    },
    onSuccess: () => {
      setIsFavorite(false);
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      toast({
        title: "Favorilerden Çıkarıldı",
        description: "Anime favorilerinizden çıkarıldı!",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Favorilerden çıkarılırken bir hata oluştu",
        variant: "destructive",
      });
    }
  });
  
  const toggleFavorite = () => {
    if (isFavorite) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };
  
  // Generate episode data for the anime
  // In a real application, this would come from an API
  const generateEpisodes = (count: number | null) => {
    return Array.from({ length: count || 12 }, (_, i) => ({
      id: i + 1,
      title: `Bölüm ${i + 1}`,
      thumbnail: anime?.coverImage?.medium || '',
      duration: 24 * 60, // 24 minutes in seconds
      watched: watchHistory ? (
        watchHistory.find((history: any) => history.episodeId === i + 1)
      ) : false
    }));
  };
  
  const episodes = anime ? generateEpisodes(anime.episodes || 12) : [];
  
  // Get recommendations based on this anime
  const recommendations = anime?.recommendations?.nodes
    ?.map((node: any) => node.mediaRecommendation)
    ?.filter(Boolean)
    ?.map((rec: any) => ({
      id: rec.id,
      title: rec.title?.romaji || rec.title?.english,
      coverImage: rec.coverImage?.large,
      averageScore: rec.averageScore
    })) || [];
  
  useEffect(() => {
    if (anime) {
      document.title = `${anime.title?.turkish || anime.title?.romaji} - AnimeMax`;
    }
  }, [anime]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="w-full md:w-64 h-96 rounded-lg bg-[#2a2a2a]" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-3/4 bg-[#2a2a2a]" />
              <Skeleton className="h-6 w-1/3 bg-[#2a2a2a]" />
              <Skeleton className="h-32 w-full bg-[#2a2a2a]" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-32 bg-[#2a2a2a]" />
                <Skeleton className="h-12 w-32 bg-[#2a2a2a]" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (error || !anime) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Anime bulunamadı</h1>
          <p className="text-gray-400 mb-8">İstediğiniz anime mevcut değil veya bir hata oluştu.</p>
          <Button onClick={() => setLocation('/')} className="bg-primary hover:bg-primary-dark">
            Ana Sayfaya Dön
          </Button>
        </div>
        <Footer />
      </div>
    );
  }
  
  // Process anime data
  const title: string = anime.title?.turkish || anime.title?.romaji || anime.title?.english || '';
  const genres = anime.genres?.join(', ') || 'Kategori bilgisi yok';
  const description = anime.description?.replace(/<[^>]*>?/gm, '') || 'Açıklama bulunmuyor';
  const startYear = anime.startDate?.year || 'Bilinmiyor';
  const episodeCount = anime.episodes || 'Bilinmiyor';
  const duration = anime.duration ? `${anime.duration} dk` : 'Bilinmiyor';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
  const popularity = anime.popularity?.toLocaleString() || 'N/A';
  const status = getStatusText(anime.status);
  
  function getStatusText(status: string | null) {
    if (!status) return 'Bilinmiyor';
    
    switch (status) {
      case 'FINISHED': return 'Tamamlandı';
      case 'RELEASING': return 'Devam Ediyor';
      case 'NOT_YET_RELEASED': return 'Yayınlanmadı';
      case 'CANCELLED': return 'İptal Edildi';
      case 'HIATUS': return 'Ara Verildi';
      default: return status;
    }
  }
  
  // Generate episode progress
  const lastWatchedEpisode = watchHistory?.sort((a: any, b: any) => 
    new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime()
  )[0];
  
  const hasStarted = !!lastWatchedEpisode;
  const continueEpisodeId = lastWatchedEpisode?.episodeId || 1;

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />
      
      {/* Banner */}
      <div className="relative h-[300px] w-full">
        {anime.bannerImage ? (
          <img 
            src={anime.bannerImage} 
            alt={title || "Anime Banner"} 
            className="h-full w-full object-cover opacity-40"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a]"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-6 md:px-8 -mt-40 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="w-full md:w-64 flex-shrink-0">
            <img 
              src={anime.coverImage?.extraLarge || anime.coverImage?.large || ''} 
              alt={title || "Anime Cover"} 
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
          
          {/* Details */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <div className="text-gray-400 mb-6">{genres}</div>
            
            <p className="text-gray-300 mb-6 line-clamp-4 md:line-clamp-none">{description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-400">Yıl</div>
                  <div>{startYear}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-400">Süre</div>
                  <div>{duration}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-400">Puan</div>
                  <div>{score}/10</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-400">İzleyici</div>
                  <div>{popularity}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Info className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-400">Durum</div>
                  <div>{status}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Award className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-400">Bölüm</div>
                  <div>{episodeCount}</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => setLocation(`/izle/${anime.id}/${continueEpisodeId}`)} 
                className="bg-primary hover:bg-primary-dark text-white"
              >
                <Play className="mr-2 h-5 w-5" />
                {hasStarted ? 'İzlemeye Devam Et' : 'İzlemeye Başla'}
              </Button>
              
              <Button 
                onClick={toggleFavorite} 
                variant="outline" 
                className="border-gray-600 hover:bg-[#2a2a2a] text-white"
              >
                {isFavorite ? (
                  <>
                    <Heart className="mr-2 h-5 w-5 fill-primary text-primary" />
                    Favorilerden Çıkar
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Favorilere Ekle
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Tabs Section */}
        <div className="mt-12">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full md:w-auto grid-cols-2 md:inline-flex bg-[#2a2a2a]">
              <TabsTrigger value="episodes">Bölümler</TabsTrigger>
              <TabsTrigger value="details">Detaylar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="episodes" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {episodes.map((episode) => (
                  <div 
                    key={episode.id} 
                    className="bg-[#2a2a2a] rounded-lg overflow-hidden cursor-pointer transition-colors hover:bg-[#3a3a3a]"
                    onClick={() => setLocation(`/izle/${anime.id}/${episode.id}`)}
                  >
                    <div className="relative aspect-video">
                      <img 
                        src={episode.thumbnail} 
                        alt={episode.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="h-12 w-12 text-primary" />
                      </div>
                      {episode.watched && (
                        <div className="absolute bottom-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                          İzlendi
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-medium">{episode.title}</div>
                      <div className="text-sm text-gray-400">{Math.floor(episode.duration / 60)} dk</div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="mt-6">
              <div className="bg-[#2a2a2a] rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Anime Hakkında</h3>
                <p className="text-gray-300 mb-6 whitespace-pre-line">{description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2 text-gray-200">Türler</h4>
                    <div className="flex flex-wrap gap-2">
                      {anime.genres?.map((genre) => (
                        <span 
                          key={genre} 
                          className="bg-[#3a3a3a] text-gray-300 rounded-full px-3 py-1 text-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {anime.studios?.nodes && anime.studios.nodes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-200">Stüdyolar</h4>
                      <div className="flex flex-wrap gap-2">
                        {anime.studios.nodes.map((studio: any) => (
                          <span 
                            key={studio.id} 
                            className="bg-[#3a3a3a] text-gray-300 rounded-full px-3 py-1 text-sm"
                          >
                            {studio.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* AI Analysis */}
        <AIAnalysis 
          animeId={anime.id} 
          title={title || ''} 
          genres={anime.genres || []} 
        />
        
        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-12">
            <AnimeSection 
              title="Benzer Animeler" 
              animeList={recommendations.slice(0, 5)} 
            />
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
