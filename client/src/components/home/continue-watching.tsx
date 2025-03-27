import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnimeById } from '@/hooks/use-anilist';
import { formatTime } from '@/lib/utils';
import { Play } from 'lucide-react';

interface WatchHistoryItem {
  id: number;
  animeId: number;
  episodeId: number;
  progress: number;
  duration: number;
  lastWatched: string;
}

export function ContinueWatching() {
  const { data: watchHistory, isLoading } = useQuery<WatchHistoryItem[]>({
    queryKey: ['/api/watch-history'],
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-6 md:px-8 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-sans">İzlemeye Devam Et</h2>
          <span className="text-primary hover:text-primary-light text-sm font-medium flex items-center">
            Tümünü Gör
            <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#2a2a2a] rounded-lg overflow-hidden">
              <div className="relative aspect-video">
                <Skeleton className="w-full h-full absolute inset-0" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!watchHistory || watchHistory.length === 0) {
    return null;
  }

  // Take the most recent 3 items
  const recentHistory = watchHistory.slice(0, 3);

  return (
    <section className="container mx-auto px-6 md:px-8 mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-sans">İzlemeye Devam Et</h2>
        <Link href="/profil?tab=history">
          <a className="text-primary hover:text-primary-light text-sm font-medium flex items-center">
            Tümünü Gör
            <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {recentHistory.map((historyItem) => (
          <WatchHistoryCard
            key={historyItem.id}
            historyItem={historyItem}
          />
        ))}
      </div>
    </section>
  );
}

function WatchHistoryCard({ historyItem }: { historyItem: WatchHistoryItem }) {
  const { data: anime, isLoading } = useAnimeById(historyItem.animeId);
  
  if (isLoading || !anime) {
    return (
      <div className="bg-[#2a2a2a] rounded-lg overflow-hidden">
        <div className="relative aspect-video">
          <Skeleton className="w-full h-full absolute inset-0" />
        </div>
      </div>
    );
  }

  // Calculate completion percentage
  const completionPercentage = Math.min((historyItem.progress / historyItem.duration) * 100, 100);
  
  // Calculate time remaining
  const remainingSeconds = Math.max(historyItem.duration - historyItem.progress, 0);
  const remainingTime = formatTime(remainingSeconds);

  return (
    <motion.div 
      className="anime-card bg-[#2a2a2a] rounded-lg overflow-hidden"
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative aspect-video">
        <img
          src={anime.coverImage?.extraLarge || anime.coverImage?.large}
          alt={anime.title?.turkish || anime.title?.romaji}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent"></div>
        
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-white truncate pr-2">
              {anime.title?.turkish || anime.title?.romaji}
            </h3>
            <div className="text-xs text-gray-300">B{historyItem.episodeId}</div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-1 mb-2">
            <div 
              className="bg-primary h-full rounded-full" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>{Math.round(completionPercentage)}% tamamlandı</span>
            <span>{remainingTime} kaldı</span>
          </div>
        </div>
        
        <Link href={`/izle/${historyItem.animeId}/${historyItem.episodeId}`}>
          <div className="absolute inset-0 bg-[#121212] bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <button className="bg-primary hover:bg-primary-dark text-white p-3 rounded-full flex items-center justify-center transition-colors">
              <Play className="h-6 w-6" />
            </button>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
