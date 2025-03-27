import { useQuery } from "@tanstack/react-query";
import { getPopularAnime, getAnimeById, getSeasonalAnime, getTrendingAnime, searchAnime } from "@/lib/anilist";

export function usePopularAnime() {
  return useQuery({
    queryKey: ['popular-anime'],
    queryFn: () => getPopularAnime(),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function useAnimeById(id: number | string) {
  return useQuery({
    queryKey: ['anime', id],
    queryFn: () => getAnimeById(Number(id)),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!id,
  });
}

export function useSeasonalAnime() {
  return useQuery({
    queryKey: ['seasonal-anime'],
    queryFn: () => getSeasonalAnime(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useTrendingAnime() {
  return useQuery({
    queryKey: ['trending-anime'],
    queryFn: () => getTrendingAnime(),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function useSearchAnime(search: string) {
  return useQuery({
    queryKey: ['search-anime', search],
    queryFn: () => searchAnime(search),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: search.length > 2, // Only search if at least 3 characters
  });
}

export function useAnimeByGenre(genre: string) {
  return useQuery({
    queryKey: ['genre-anime', genre],
    queryFn: () => searchAnime('', { genre }),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!genre,
  });
}
