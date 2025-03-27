import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { AnimeCard } from '@/components/home/anime-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useAnimeByGenre, usePopularAnime, useSeasonalAnime, useTrendingAnime } from '@/hooks/use-anilist';

export default function CategoryPage() {
  const { genre } = useParams<{ genre: string }>();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('POPULARITY_DESC');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allAnime, setAllAnime] = useState<any[]>([]);
  
  // Get appropriate data based on category
  const { 
    data: genreAnime, 
    isLoading: genreLoading, 
    error: genreError 
  } = useAnimeByGenre(genre !== 'all' && genre !== 'seasonal' && genre !== 'popular' ? genre : '');
  
  const { 
    data: popularAnime, 
    isLoading: popularLoading, 
    error: popularError 
  } = usePopularAnime();
  
  const { 
    data: seasonalAnime, 
    isLoading: seasonalLoading, 
    error: seasonalError 
  } = useSeasonalAnime();
  
  const { 
    data: trendingAnime, 
    isLoading: trendingLoading, 
    error: trendingError 
  } = useTrendingAnime();
  
  // Determine which data to show
  let animeData: any[] = [];
  let isLoading = false;
  let error = null;
  
  if (genre === 'all') {
    animeData = popularAnime || [];
    isLoading = popularLoading;
    error = popularError;
  } else if (genre === 'seasonal') {
    animeData = seasonalAnime || [];
    isLoading = seasonalLoading;
    error = seasonalError;
  } else if (genre === 'popular') {
    animeData = trendingAnime || [];
    isLoading = trendingLoading;
    error = trendingError;
  } else {
    animeData = genreAnime || [];
    isLoading = genreLoading;
    error = genreError;
  }
  
  // Update title and anime list when data changes
  useEffect(() => {
    if (animeData.length > 0 && page === 1) {
      setAllAnime(animeData);
    }
    
    // Update page title
    let title;
    if (genre === 'all') {
      title = 'Tüm Animeler';
    } else if (genre === 'seasonal') {
      title = 'Sezon Animeleri';
    } else if (genre === 'popular') {
      title = 'Popüler Animeler';
    } else {
      title = `${genre} Animeleri`;
    }
    
    document.title = `${title} - AnimeMax`;
  }, [animeData, genre, page]);
  
  // Load more anime (in a real app, this would call an API with pagination)
  const loadMoreAnime = async () => {
    setIsLoadingMore(true);
    
    // Simulate loading more (in reality, this would fetch the next page)
    setTimeout(() => {
      // In a real app, you would fetch the next page of data
      // For this demo, we'll just duplicate the current data
      setAllAnime(prev => [...prev, ...animeData]);
      setPage(prev => prev + 1);
      setIsLoadingMore(false);
    }, 1000);
  };
  
  // Sort anime based on selected criteria
  const sortedAnime = [...allAnime].sort((a, b) => {
    switch (sort) {
      case 'TITLE_ASC':
        return (a.title?.romaji || '').localeCompare(b.title?.romaji || '');
      case 'TITLE_DESC':
        return (b.title?.romaji || '').localeCompare(a.title?.romaji || '');
      case 'SCORE_DESC':
        return (b.averageScore || 0) - (a.averageScore || 0);
      case 'POPULARITY_DESC':
        return (b.popularity || 0) - (a.popularity || 0);
      case 'TRENDING_DESC':
        return ((b.trending || 0) - (a.trending || 0));
      case 'START_DATE_DESC':
        const bYear = b.startDate?.year || 0;
        const aYear = a.startDate?.year || 0;
        return bYear - aYear;
      default:
        return 0;
    }
  });
  
  // Get category name for display
  const getCategoryName = () => {
    if (genre === 'all') return 'Tüm Animeler';
    if (genre === 'seasonal') return 'Sezon Animeleri';
    if (genre === 'popular') return 'Popüler Animeler';
    return `${genre} Animeleri`;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />
      
      <div className="container mx-auto px-6 md:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">{getCategoryName()}</h1>
          
          <div className="w-full md:w-auto">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="bg-[#2a2a2a] border-[#3a3a3a] w-full md:w-[200px]">
                <SelectValue placeholder="Sıralama seçin" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white">
                <SelectItem value="POPULARITY_DESC">Popülerlik</SelectItem>
                <SelectItem value="SCORE_DESC">Puan (Yüksek-Düşük)</SelectItem>
                <SelectItem value="TITLE_ASC">İsim (A-Z)</SelectItem>
                <SelectItem value="TITLE_DESC">İsim (Z-A)</SelectItem>
                <SelectItem value="START_DATE_DESC">En Yeni</SelectItem>
                <SelectItem value="TRENDING_DESC">Trend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[...Array(15)].map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full mb-2 bg-[#2a2a2a]" />
                <Skeleton className="h-5 w-full mb-2 bg-[#2a2a2a]" />
                <Skeleton className="h-4 w-2/3 bg-[#2a2a2a]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-300 mb-4">Bir hata oluştu</p>
            <p className="text-gray-400">Lütfen daha sonra tekrar deneyin.</p>
          </div>
        ) : sortedAnime.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-300 mb-4">Sonuç bulunamadı</p>
            <p className="text-gray-400">Bu kategoride henüz anime bulunmuyor.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {sortedAnime.map(anime => (
                <AnimeCard
                  key={`${anime.id}-${page}`}
                  id={anime.id}
                  title={anime.title?.turkish || anime.title?.romaji || anime.title?.english || ''}
                  image={anime.coverImage?.extraLarge || anime.coverImage?.large || ''}
                  score={anime.averageScore ? (anime.averageScore / 10).toFixed(1) : undefined}
                  genres={anime.genres || []}
                />
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <Button 
                onClick={loadMoreAnime} 
                className="bg-primary hover:bg-primary-dark"
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>Daha Fazla Yükle</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
