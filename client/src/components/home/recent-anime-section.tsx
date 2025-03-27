import { useRecentAnime } from '@/hooks/use-recent-anime';
import { RecentAnimeCard } from './recent-anime-card';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Clock } from 'lucide-react';

export function RecentAnimeSection() {
  const { data: recentAnime, isLoading, error } = useRecentAnime();
  
  return (
    <section className="container mx-auto px-6 md:px-8 mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-sans flex items-center">
          <span className="mr-2"><Clock className="h-5 w-5 text-blue-400" /></span>
          Son Eklenen Animeler
        </h2>
        <Link href="/kategori/recent">
          <a className="text-primary hover:text-primary-light text-sm font-medium flex items-center">
            Tümünü Gör
            <ArrowRight className="ml-1 h-4 w-4" />
          </a>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#2a2a2a] rounded-lg overflow-hidden">
              <div className="relative aspect-[3/4]">
                <Skeleton className="w-full h-full absolute inset-0" />
              </div>
              <div className="p-3">
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-gray-400">Veri yüklenirken bir hata oluştu.</p>
        </div>
      ) : !recentAnime || recentAnime.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-400">Hiç yeni anime bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {recentAnime.map((anime: any) => (
            <RecentAnimeCard
              key={anime.id}
              id={anime.id}
              title={anime.title}
              image={anime.coverImage}
              score={anime.averageScore ? Number((anime.averageScore / 10).toFixed(1)) : undefined}
              genres={anime.genres}
              badge={anime.badge}
            />
          ))}
        </div>
      )}
    </section>
  );
}