// Common types used throughout the application

export interface AnilistAnime {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
    userPreferred: string | null;
    turkish?: string | null;
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
  tags?: {
    id: number;
    name: string;
    category: string;
  }[] | null;
  studios?: {
    nodes: {
      id: number;
      name: string;
    }[];
  } | null;
  
  // Additional fields
  type?: string;
  seasonCount?: number;
  nextAiringEpisode?: {
    airingAt: number;
    episode: number;
  } | null;
  
  recommendations?: {
    nodes: {
      mediaRecommendation: {
        id: number;
        title: {
          romaji: string;
          english: string | null;
        };
        coverImage: {
          large: string;
        };
        averageScore: number | null;
      };
    }[];
  };
  
  relations?: {
    edges: {
      id: number;
      relationType: string;
      node: {
        id: number;
        title: {
          romaji: string;
          english: string | null;
        };
        format: string;
        type: string;
        status: string;
      };
    }[];
  };
  
  // Custom fields for the recent anime component
  updatedAt?: number;
  updatedDate?: Date;
  daysSinceUpdate?: number;
  badge?: {
    text: string;
    color: string;
  };
}

export interface AnimeEpisode {
  id: number;
  animeId: number;
  number: number;
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl: string;
  duration: number;
  releaseDate: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl?: string;
  displayName?: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface WatchHistory {
  id: number;
  userId: number;
  animeId: number;
  episodeId?: number;
  progress: number; // Seconds into the episode
  completed: boolean;
  lastWatched: Date;
}

export interface WatchParty {
  id: number;
  creatorId: number;
  animeId: number;
  episodeId: number;
  roomCode: string;
  currentTime: number;
  isPlaying: boolean;
  isPublic: boolean;
  startTime?: Date;
  endTime?: Date;
}