import { useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/home/hero-section';
import { AnimeSection } from '@/components/home/anime-section';
import { ContinueWatching } from '@/components/home/continue-watching';
import { Categories } from '@/components/home/categories';
import { usePopularAnime, useSeasonalAnime, useTrendingAnime } from '@/hooks/use-anilist';
import { useRecommendations } from '@/hooks/use-recommendations';

export default function HomePage() {
  const { data: popularAnime, isLoading: popularLoading, error: popularError } = usePopularAnime();
  const { data: seasonalAnime, isLoading: seasonalLoading, error: seasonalError } = useSeasonalAnime();
  const { data: trendingAnime, isLoading: trendingLoading, error: trendingError } = useTrendingAnime();
  const { recommendedAnime, isLoading: recommendationsLoading } = useRecommendations();

  // Set featured anime - either first trending or popular anime
  const featuredAnimeId = trendingAnime?.[0]?.id || popularAnime?.[0]?.id || 21;

  // Format anime data for sections
  const formatAnimeData = (animeList: any[] = []) => {
    return animeList.map(anime => ({
      id: anime.id,
      title: anime.title?.turkish || anime.title?.romaji || anime.title?.english,
      coverImage: anime.coverImage?.extraLarge || anime.coverImage?.large,
      averageScore: anime.averageScore,
      genres: anime.genres
    }));
  };

  useEffect(() => {
    // Set page title
    document.title = 'AnimeMax - Premium Anime İzleme Platformu';
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#121212] text-white">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <HeroSection featuredAnimeId={featuredAnimeId} />
        
        {/* Recommended Section */}
        <AnimeSection
          title="Senin İçin Önerilenler"
          animeList={formatAnimeData(recommendedAnime)}
          viewAllLink="/kategori/all"
          isLoading={recommendationsLoading}
        />
        
        {/* Continue Watching Section */}
        <ContinueWatching />
        
        {/* Categories */}
        <Categories />
        
        {/* Popular Weekly */}
        <AnimeSection
          title="Bu Hafta Popüler"
          animeList={formatAnimeData(trendingAnime)}
          viewAllLink="/kategori/popular"
          isLoading={trendingLoading}
          error={trendingError}
        />

        {/* Seasonal Anime */}
        <AnimeSection
          title="Yeni Sezon Animeleri"
          animeList={formatAnimeData(seasonalAnime)}
          viewAllLink="/kategori/seasonal"
          isLoading={seasonalLoading}
          error={seasonalError}
        />
      </main>
      
      <Footer />
    </div>
  );
}
