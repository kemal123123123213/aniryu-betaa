import { useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/home/hero-section';
import { AnimeSection } from '@/components/home/anime-section';
import { ContinueWatching } from '@/components/home/continue-watching';
import { Categories } from '@/components/home/categories';
import { RecentAnimeSection } from '@/components/home/recent-anime-section';
import { AiWhatToWatch, AiPersonalizedRecommendations } from '@/components/home/ai-recommendations';
import { usePopularAnime, useSeasonalAnime, useTrendingAnime } from '@/hooks/use-anilist';
import { useRecommendations } from '@/hooks/use-recommendations';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Zap, Calendar, Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0a0118] via-[#121212] to-[#121212] text-white">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section with Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <HeroSection featuredAnimeId={featuredAnimeId} />
        </motion.div>
        
        {/* New Feature Badge */}
        <motion.div 
          className="flex justify-center mt-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 py-1.5 px-4 text-white text-sm gap-1.5 shadow-lg shadow-purple-900/20">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            YENİ! AI Destekli Kişiselleştirilmiş Öneriler
          </Badge>
        </motion.div>
        
        {/* Animated Content Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {/* AI What to Watch Today */}
          <AiWhatToWatch />
        </motion.div>
        
        {/* Continue Watching Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <ContinueWatching />
        </motion.div>
        
        {/* AI Personalized Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <AiPersonalizedRecommendations />
        </motion.div>
        
        {/* Featured Content Collection */}
        <div className="px-4 md:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Featured Card 1 */}
            <motion.div 
              className="bg-gradient-to-br from-violet-900/50 to-purple-900/30 p-6 rounded-xl border border-purple-800/40 shadow-xl"
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <TrendingUp className="h-10 w-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Trend Animeler</h3>
              <p className="text-gray-300 mb-3">En çok izlenen ve beğenilen animeleri keşfedin.</p>
            </motion.div>
            
            {/* Featured Card 2 */}
            <motion.div 
              className="bg-gradient-to-br from-blue-900/50 to-indigo-900/30 p-6 rounded-xl border border-blue-800/40 shadow-xl"
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <Zap className="h-10 w-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Hızlı İzleme</h3>
              <p className="text-gray-300 mb-3">İzlemeye başladığınız yerden hızlıca devam edin.</p>
            </motion.div>
            
            {/* Featured Card 3 */}
            <motion.div 
              className="bg-gradient-to-br from-pink-900/50 to-rose-900/30 p-6 rounded-xl border border-pink-800/40 shadow-xl"
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              <Heart className="h-10 w-10 text-pink-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Favorileriniz</h3>
              <p className="text-gray-300 mb-3">En sevdiğiniz animeleri koleksiyonunuza ekleyin.</p>
            </motion.div>
          </div>
        </div>
        
        {/* Recommended Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
        >
          <AnimeSection
            title="Senin İçin Önerilenler"
            icon={<Star className="h-5 w-5 text-yellow-400 mr-2" />}
            animeList={formatAnimeData(recommendedAnime)}
            viewAllLink="/kategori/all"
            isLoading={recommendationsLoading}
          />
        </motion.div>
        
        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <Categories />
        </motion.div>
        
        {/* Popular Weekly */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <AnimeSection
            title="Bu Hafta Popüler"
            icon={<TrendingUp className="h-5 w-5 text-pink-400 mr-2" />}
            animeList={formatAnimeData(trendingAnime)}
            viewAllLink="/kategori/popular"
            isLoading={trendingLoading}
            error={trendingError}
          />
        </motion.div>

        {/* Seasonal Anime */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
        >
          <AnimeSection
            title="Yeni Sezon Animeleri"
            icon={<Calendar className="h-5 w-5 text-blue-400 mr-2" />}
            animeList={formatAnimeData(seasonalAnime)}
            viewAllLink="/kategori/seasonal"
            isLoading={seasonalLoading}
            error={seasonalError}
          />
        </motion.div>
        
        {/* Son Eklenen Animeler */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          <RecentAnimeSection />
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}
