import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import { getAnimeById } from "@/lib/anilist";

// Simple ML-based recommendation system that runs on the client
// In a production environment, this would be a server-side implementation

export function useRecommendations() {
  const { user } = useAuth();

  const { data: watchHistory } = useQuery({
    queryKey: ['/api/watch-history'],
    enabled: !!user,
  });

  const { data: favorites } = useQuery({
    queryKey: ['/api/favorites'],
    enabled: !!user,
  });

  const { data: preferences } = useQuery({
    queryKey: ['/api/preferences'],
    enabled: !!user,
  });

  // Get server-stored recommendations
  const { data: recommendations, isLoading, refetch } = useQuery({
    queryKey: ['/api/recommendations'],
    enabled: !!user,
  });

  // This would be a server-side API in production
  const updateRecommendationsMutation = useMutation({
    mutationFn: async (animeIds: number[]) => {
      await apiRequest("POST", "/api/recommendations", { animeIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    },
  });

  // Get anime details for recommended IDs
  const { data: recommendedAnime } = useQuery({
    queryKey: ['recommended-anime-details', recommendations?.animeIds],
    queryFn: async () => {
      if (!recommendations?.animeIds?.length) return [];
      
      // Fetch details for each recommended anime
      const animePromises = recommendations.animeIds.map(id => getAnimeById(id));
      const animeData = await Promise.all(animePromises);
      return animeData.filter(anime => !!anime); // Filter out any nulls
    },
    enabled: !!recommendations?.animeIds?.length,
  });

  return {
    recommendedAnime: recommendedAnime || [],
    isLoading,
    refetch,
    updateRecommendations: updateRecommendationsMutation.mutate
  };
}
