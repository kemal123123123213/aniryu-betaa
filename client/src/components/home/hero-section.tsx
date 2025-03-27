import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useAnimeById } from '@/hooks/use-anilist';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play, Plus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface HeroSectionProps {
  featuredAnimeId: number;
}

export function HeroSection({ featuredAnimeId }: HeroSectionProps) {
  const { data: anime, isLoading } = useAnimeById(featuredAnimeId);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isFavorite, setIsFavorite] = useState(false);
  
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
  
  if (isLoading) {
    return (
      <section className="relative h-[500px] md:h-[600px] mb-8 bg-gray-900">
        <div className="container mx-auto px-6 md:px-8 relative h-full flex items-center">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-3">
              <Skeleton className="h-6 w-24 rounded-full bg-gray-800" />
              <Skeleton className="h-6 w-32 rounded-full bg-gray-800" />
            </div>
            <Skeleton className="h-12 w-full mb-4 bg-gray-800" />
            <Skeleton className="h-20 w-full mb-6 bg-gray-800" />
            <div className="flex flex-wrap items-center text-sm text-gray-300 mb-6 gap-4">
              <Skeleton className="h-5 w-16 bg-gray-800" />
              <Skeleton className="h-5 w-10 bg-gray-800" />
              <Skeleton className="h-5 w-20 bg-gray-800" />
              <Skeleton className="h-5 w-32 bg-gray-800" />
              <Skeleton className="h-5 w-20 bg-gray-800" />
            </div>
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-12 w-32 bg-gray-800" />
              <Skeleton className="h-12 w-40 bg-gray-800" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!anime) {
    return null;
  }

  // Process genres
  const genres = anime.genres ? anime.genres.join(', ') : '';
  
  // Format the date
  const startYear = anime.startDate?.year || 'N/A';
  
  // Get a clean description without HTML tags
  const description = anime.description
    ? anime.description.replace(/<[^>]*>?/gm, '')
    : 'Bu anime için açıklama bulunmuyor.';
  
  // Get a season count
  const seasonCount = anime.seasonCount || (anime.season ? 1 : 'N/A');

  return (
    <section className="relative h-[500px] md:h-[600px] mb-8">
      {/* Background image with overlay */}
      <div className="absolute inset-0 bg-black">
        {anime.bannerImage || anime.coverImage?.extraLarge ? (
          <img
            src={anime.bannerImage || anime.coverImage?.extraLarge}
            alt={anime.title?.turkish || anime.title?.romaji || 'Anime'}
            className="w-full h-full object-cover opacity-40"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#121212] to-transparent"></div>
      </div>
      
      {/* Hero content */}
      <div className="container mx-auto px-6 md:px-8 relative h-full flex items-center">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-3 mb-3">
            <span className="bg-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {anime.status === 'RELEASING' ? 'Yeni Sezon' : anime.status === 'FINISHED' ? 'Tamamlandı' : 'Yeni'}
            </span>
            {anime.popularity > 10000 && (
              <span className="bg-[#7E4DFF] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                En Çok İzlenen
              </span>
            )}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold font-sans mb-4">
            {anime.title?.turkish || anime.title?.romaji}
          </h1>
          
          <p className="text-gray-300 mb-6 text-lg line-clamp-3">
            {description}
          </p>
          
          <div className="flex flex-wrap items-center text-sm text-gray-300 mb-6 gap-4">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A'}/10</span>
            </div>
            <div>{startYear}</div>
            <div>{seasonCount} Sezon</div>
            <div>{genres}</div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-primary mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span>{anime.favourites || 'N/A'}+</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Link href={`/anime/${anime.id}`}>
              <Button className="bg-primary hover:bg-primary-dark text-white px-6 py-6 rounded-lg font-medium flex items-center transition-colors h-12">
                <Play className="mr-2 h-5 w-5" />
                Şimdi İzle
              </Button>
            </Link>
            <Button 
              onClick={toggleFavorite}
              className="bg-[#2a2a2a] hover:bg-[#353535] text-white px-6 py-6 rounded-lg font-medium flex items-center transition-colors border border-gray-700 h-12"
            >
              <Plus className="mr-2 h-5 w-5" />
              {isFavorite ? 'Favorilerden Çıkar' : 'Listeme Ekle'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
