import { useQuery } from '@tanstack/react-query';
import anilistAPI from '@/lib/anilist';
import { AnilistAnime } from '@/lib/types';

// Gelecekte doğrudan API'den alabiliriz, şimdilik Anilist kullanıyoruz
export function useRecentAnime() {
  return useQuery({
    queryKey: ['/api/anime/recent'],
    queryFn: async () => {
      // Anilist API'sinden veri almak için getTrendingAnime işlevini kullanıyoruz
      const animeList = await anilistAPI.getTrendingAnime(1, 10);
      
      // Tarih bilgisini ekle
      return animeList.map((anime: any) => {
        // Önce updatedAt ya da startDate'i millisaniye cinsinden alalım
        const timestamp = anime.updatedAt 
          ? anime.updatedAt * 1000 // Anilist unix timestamp (saniye) kullanıyor
          : anime.startDate && anime.startDate.year 
            ? new Date(anime.startDate.year, (anime.startDate.month || 1) - 1, anime.startDate.day || 1).getTime()
            : Date.now(); // Varsayılan olarak bugün
            
        const date = new Date(timestamp);
        const now = new Date();
        
        // Kaç gün önce eklendi hesaplaması
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Etiket ve renk belirleme
        let badge = {
          text: 'Yeni Eklendi',
          color: 'bg-blue-500'
        };
        
        if (diffDays === 0) {
          badge = {
            text: 'Bugün Yayınlandı',
            color: 'bg-green-500'
          };
        } else if (diffDays === 1) {
          badge = {
            text: 'Dün Yayınlandı',
            color: 'bg-orange-500'
          };
        } else if (diffDays === 2) {
          badge = {
            text: '2 Gün Önce Yayınlandı',
            color: 'bg-orange-600'
          };
        } else if (diffDays === 3) {
          badge = {
            text: '3 Gün Önce Yayınlandı',
            color: 'bg-red-500'
          };
        } else if (diffDays < 7) {
          badge = {
            text: `${diffDays} Gün Önce Yayınlandı`,
            color: 'bg-red-700'
          };
        }
        
        return {
          id: anime.id,
          title: anime.title?.turkish || anime.title?.romaji || anime.title?.english,
          coverImage: anime.coverImage?.extraLarge || anime.coverImage?.large,
          averageScore: anime.averageScore,
          genres: anime.genres,
          updatedDate: date,
          daysSinceUpdate: diffDays,
          badge
        };
      });
    }
  });
}