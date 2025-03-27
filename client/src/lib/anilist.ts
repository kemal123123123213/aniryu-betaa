// AniList GraphQL API client

// API endpoint
const API_URL = 'https://graphql.anilist.co';

// Common query fragments
const MEDIA_FRAGMENT = `
  id
  title {
    romaji
    english
    native
    userPreferred
  }
  description
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  genres
  seasonYear
  season
  format
  episodes
  duration
  status
  averageScore
  popularity
  favourites
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  tags {
    id
    name
    category
  }
  studios {
    nodes {
      id
      name
    }
  }
`;

// Add Turkish title for convenience - in real app, this would come from a translation service
interface AnilistAnime {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
    userPreferred: string | null;
    turkish?: string | null; // Added for convenience
  };
  description: string | null;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    medium: string | null;
    color: string | null;
  };
  bannerImage: string | null;
  genres: string[] | null;
  seasonYear: number | null;
  season: string | null;
  format: string | null;
  episodes: number | null;
  duration: number | null;
  status: string | null;
  averageScore: number | null;
  popularity: number | null;
  favourites: number | null;
  startDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  endDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  tags: {
    id: number;
    name: string;
    category: string;
  }[] | null;
  studios: {
    nodes: {
      id: number;
      name: string;
    }[];
  } | null;
  seasonCount?: number; // Custom field, calculated in post-processing

  // Additional fields used in the UI
  type?: string;
  nextAiringEpisode?: {
    airingAt: number;
    episode: number;
  } | null;
}

// Helper function to make GraphQL requests
async function fetchFromAnilist(query: string, variables: Record<string, any> = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching from AniList:', error);
    throw error;
  }
}

// Add Turkish titles to anime data
function addTurkishTitles(anime: AnilistAnime | AnilistAnime[]): AnilistAnime | AnilistAnime[] {
  // In a real app, these would come from a translation service or database
  // This is just a simple mapping for demonstration
  const turkishTitles: Record<string, string> = {
    'Demon Slayer: Kimetsu no Yaiba': 'Kılıç Ustası: Kimetsu no Yaiba',
    'Attack on Titan': 'Titana Saldırı',
    'My Hero Academia': 'Boku no Hero Academia',
    'One Punch Man': 'Tek Yumruk Adam',
    'Tokyo Ghoul': 'Tokyo Ghoul',
    'Naruto': 'Naruto',
    'Death Note': 'Ölüm Defteri',
    'Fullmetal Alchemist: Brotherhood': 'Çelik Simyacı: Kardeşlik',
    'Jujutsu Kaisen': 'Büyücü Savaşı',
    'Spy x Family': 'Casus x Aile',
    'Chainsaw Man': 'Testere Adam',
    'Bleach': 'Bleach',
    'Blue Lock': 'Mavi Kilit',
    'Oshi no Ko': 'Oshi no Ko'
  };

  const processSingleAnime = (item: AnilistAnime): AnilistAnime => {
    const titleRomaji = item.title.romaji || '';
    const titleEnglish = item.title.english || '';
    
    // Assign Turkish title if available, otherwise use romaji or english
    item.title.turkish = turkishTitles[titleRomaji] || turkishTitles[titleEnglish] || titleRomaji;
    
    return item;
  };

  if (Array.isArray(anime)) {
    return anime.map(processSingleAnime);
  } else {
    return processSingleAnime(anime);
  }
}

// Get popular anime
export async function getPopularAnime(page = 1, perPage = 10): Promise<AnilistAnime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: ANIME) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;

  const data = await fetchFromAnilist(query, { page, perPage });
  return addTurkishTitles(data.Page.media) as AnilistAnime[];
}

// Get anime by ID
export async function getAnimeById(id: number): Promise<AnilistAnime | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FRAGMENT}
        nextAiringEpisode {
          airingAt
          episode
        }
        relations {
          edges {
            id
            relationType
            node {
              id
              title {
                romaji
                english
              }
              format
              type
              status
            }
          }
        }
        recommendations(sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id
              title {
                romaji
                english
              }
              coverImage {
                large
              }
              averageScore
            }
          }
        }
      }
    }
  `;

  const data = await fetchFromAnilist(query, { id });
  
  if (!data.Media) {
    return null;
  }
  
  const anime = data.Media;
  
  // Calculate season count based on relations
  if (anime.relations?.edges) {
    const sequels = anime.relations.edges.filter(
      (edge: any) => edge.relationType === 'SEQUEL' || edge.relationType === 'PREQUEL'
    );
    anime.seasonCount = sequels.length > 0 ? sequels.length + 1 : 1;
  } else {
    anime.seasonCount = 1;
  }
  
  return addTurkishTitles(anime) as AnilistAnime;
}

// Get seasonal anime
export async function getSeasonalAnime(page = 1, perPage = 10): Promise<AnilistAnime[]> {
  // Get current season
  const now = new Date();
  const month = now.getMonth();
  
  let season;
  if (month >= 0 && month <= 2) season = 'WINTER';
  else if (month >= 3 && month <= 5) season = 'SPRING';
  else if (month >= 6 && month <= 8) season = 'SUMMER';
  else season = 'FALL';
  
  const query = `
    query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
      Page(page: $page, perPage: $perPage) {
        media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;

  const data = await fetchFromAnilist(query, { 
    page, 
    perPage,
    season,
    seasonYear: now.getFullYear()
  });
  
  return addTurkishTitles(data.Page.media) as AnilistAnime[];
}

// Get trending anime
export async function getTrendingAnime(page = 1, perPage = 10): Promise<AnilistAnime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;

  const data = await fetchFromAnilist(query, { page, perPage });
  return addTurkishTitles(data.Page.media) as AnilistAnime[];
}

// Search anime
export async function searchAnime(
  search: string, 
  options: { genre?: string; year?: number; sort?: string } = {},
  page = 1, 
  perPage = 20
): Promise<AnilistAnime[]> {
  const { genre, year, sort = 'POPULARITY_DESC' } = options;
  
  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genre: String, $year: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, genre: $genre, seasonYear: $year, type: ANIME, sort: $sort) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;

  const data = await fetchFromAnilist(query, { 
    page, 
    perPage,
    search: search || undefined, 
    genre: genre || undefined,
    year: year || undefined,
    sort: [sort]
  });
  
  return addTurkishTitles(data.Page.media) as AnilistAnime[];
}

// Get genres list
export async function getGenres(): Promise<string[]> {
  const query = `
    query {
      GenreCollection
    }
  `;

  const data = await fetchFromAnilist(query);
  return data.GenreCollection;
}

// Get anime recommendations based on user preferences
export async function getAnimeRecommendations(
  genres: string[] = [], 
  excludeIds: number[] = [],
  page = 1, 
  perPage = 10
): Promise<AnilistAnime[]> {
  // If no genres specified, get generally popular anime
  if (genres.length === 0) {
    return getPopularAnime(page, perPage);
  }
  
  // Randomize which genre to query to get variety
  const randomGenre = genres[Math.floor(Math.random() * genres.length)];
  
  const query = `
    query ($page: Int, $perPage: Int, $genre: String, $excludeIds: [Int]) {
      Page(page: $page, perPage: $perPage) {
        media(genre: $genre, type: ANIME, sort: POPULARITY_DESC, id_not_in: $excludeIds) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;

  const data = await fetchFromAnilist(query, { 
    page, 
    perPage,
    genre: randomGenre,
    excludeIds: excludeIds.length ? excludeIds : undefined
  });
  
  return addTurkishTitles(data.Page.media) as AnilistAnime[];
}

export default {
  getPopularAnime,
  getAnimeById,
  getSeasonalAnime,
  getTrendingAnime,
  searchAnime,
  getGenres,
  getAnimeRecommendations
};
