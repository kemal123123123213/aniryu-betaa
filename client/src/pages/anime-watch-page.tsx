import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAnimeById } from '@/hooks/use-anilist';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { VideoPlayer } from '@/components/ui/video-player';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

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
  
  // Generate fake episode data for this demo
  // In a real application, this would come from an API
  const generateEpisodes = (count: number) => {
    return Array.from({ length: count || 12 }, (_, i) => ({
      id: i + 1,
      title: `Bölüm ${i + 1}`,
      thumbnail: anime?.coverImage?.medium || '',
      duration: 24 * 60, // 24 minutes in seconds
    }));
  };
  
  const episodes = anime ? generateEpisodes(anime.episodes) : [];
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
  const subtitles = [
    { lang: 'tr', label: 'Türkçe', url: '/path/to/turkish/subs.vtt' },
    { lang: 'en', label: 'İngilizce', url: '/path/to/english/subs.vtt' }
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
        <div className="mb-8">
          <VideoPlayer 
            videoUrl={videoUrl}
            animeId={Number(id)}
            episodeId={episodeId}
            duration={currentEpisode.duration}
            title={title}
            episodeTitle={`Bölüm ${episodeId}`}
            subtitles={subtitles}
            onNext={nextEpisodeAvailable ? goToNextEpisode : undefined}
            nextEpisodeAvailable={nextEpisodeAvailable}
          />
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
                <div className="bg-[#2a2a2a] rounded-lg p-6">
                  <div className="text-center py-10">
                    <p className="text-gray-400">Henüz yorum bulunmuyor.</p>
                    <p className="text-gray-500 text-sm mt-2">İlk yorumu sen yap!</p>
                  </div>
                </div>
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
