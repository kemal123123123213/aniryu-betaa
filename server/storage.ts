import { users, watchHistory, favorites, userPreferences, userRecommendations, watchParties, watchPartyParticipants, messages } from "@shared/schema";
import type { User, InsertUser, WatchHistory, InsertWatchHistory, Favorite, InsertFavorite, UserPreferences, InsertUserPreferences, WatchParty, InsertWatchParty } from "@shared/schema";
import { randomBytes } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Watch history methods
  getWatchHistory(userId: number): Promise<WatchHistory[]>;
  addWatchHistory(watchHistory: InsertWatchHistory): Promise<WatchHistory>;
  updateWatchHistory(id: number, watchHistory: Partial<WatchHistory>): Promise<WatchHistory | undefined>;
  getWatchHistoryByAnimeAndUser(userId: number, animeId: number): Promise<WatchHistory | undefined>;
  
  // Favorites methods
  getFavorites(userId: number): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, animeId: number): Promise<boolean>;
  isFavorite(userId: number, animeId: number): Promise<boolean>;
  
  // User preferences methods
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, preferences: Partial<UserPreferences>): Promise<UserPreferences | undefined>;
  
  // Watch party methods
  createWatchParty(watchParty: InsertWatchParty): Promise<WatchParty>;
  getWatchParty(id: number): Promise<WatchParty | undefined>;
  getWatchPartyByCode(roomCode: string): Promise<WatchParty | undefined>;
  updateWatchParty(id: number, watchParty: Partial<WatchParty>): Promise<WatchParty | undefined>;
  addParticipantToParty(partyId: number, userId: number): Promise<boolean>;
  getPartyParticipants(partyId: number): Promise<number[]>;
  removeParticipantFromParty(partyId: number, userId: number): Promise<boolean>;
  
  // Recommendations methods
  getUserRecommendations(userId: number): Promise<number[]>;
  updateUserRecommendations(userId: number, animeIds: number[]): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private watchHistories: Map<number, WatchHistory>;
  private favorites: Map<number, Favorite>;
  private userPreferences: Map<number, UserPreferences>;
  private recommendations: Map<number, number[]>;
  private watchParties: Map<number, WatchParty>;
  private partyParticipants: Map<number, Set<number>>;
  private messages: Map<number, any[]>;
  currentId: { [key: string]: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.watchHistories = new Map();
    this.favorites = new Map();
    this.userPreferences = new Map();
    this.recommendations = new Map();
    this.watchParties = new Map();
    this.partyParticipants = new Map();
    this.messages = new Map();
    this.currentId = {
      users: 1,
      watchHistories: 1,
      favorites: 1,
      userPreferences: 1,
      watchParties: 1,
      partyParticipants: 1,
      messages: 1
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { 
      ...insertUser, 
      id,
      profilePicture: insertUser.profilePicture || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Watch history methods
  async getWatchHistory(userId: number): Promise<WatchHistory[]> {
    return Array.from(this.watchHistories.values()).filter(
      (history) => history.userId === userId,
    ).sort((a, b) => b.lastWatched.getTime() - a.lastWatched.getTime());
  }

  async addWatchHistory(insertWatchHistory: InsertWatchHistory): Promise<WatchHistory> {
    // Check if entry already exists
    const existing = await this.getWatchHistoryByAnimeAndUser(
      insertWatchHistory.userId,
      insertWatchHistory.animeId
    );

    if (existing) {
      const updated = {
        ...existing,
        progress: insertWatchHistory.progress || 0,
        lastWatched: new Date()
      };
      this.watchHistories.set(existing.id, updated);
      return updated;
    }

    const id = this.currentId.watchHistories++;
    const watchHistory: WatchHistory = {
      ...insertWatchHistory,
      id,
      progress: insertWatchHistory.progress || 0,
      duration: insertWatchHistory.duration || 0,
      lastWatched: new Date()
    };
    this.watchHistories.set(id, watchHistory);
    return watchHistory;
  }

  async updateWatchHistory(id: number, watchHistoryData: Partial<WatchHistory>): Promise<WatchHistory | undefined> {
    const watchHistory = this.watchHistories.get(id);
    if (!watchHistory) return undefined;
    
    const updatedWatchHistory = { 
      ...watchHistory, 
      ...watchHistoryData,
      lastWatched: new Date() 
    };
    this.watchHistories.set(id, updatedWatchHistory);
    return updatedWatchHistory;
  }

  async getWatchHistoryByAnimeAndUser(userId: number, animeId: number): Promise<WatchHistory | undefined> {
    return Array.from(this.watchHistories.values()).find(
      (history) => history.userId === userId && history.animeId === animeId
    );
  }

  // Favorites methods
  async getFavorites(userId: number): Promise<Favorite[]> {
    return Array.from(this.favorites.values()).filter(
      (favorite) => favorite.userId === userId
    );
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    // Check if already favorited
    const alreadyFavorite = await this.isFavorite(insertFavorite.userId, insertFavorite.animeId);
    if (alreadyFavorite) {
      const existing = Array.from(this.favorites.values()).find(
        (fav) => fav.userId === insertFavorite.userId && fav.animeId === insertFavorite.animeId
      );
      return existing!;
    }

    const id = this.currentId.favorites++;
    const favorite: Favorite = {
      ...insertFavorite,
      id,
      createdAt: new Date()
    };
    this.favorites.set(id, favorite);
    return favorite;
  }

  async removeFavorite(userId: number, animeId: number): Promise<boolean> {
    const favorite = Array.from(this.favorites.values()).find(
      (fav) => fav.userId === userId && fav.animeId === animeId
    );
    
    if (!favorite) return false;
    this.favorites.delete(favorite.id);
    return true;
  }

  async isFavorite(userId: number, animeId: number): Promise<boolean> {
    return Array.from(this.favorites.values()).some(
      (fav) => fav.userId === userId && fav.animeId === animeId
    );
  }

  // User preferences methods
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return Array.from(this.userPreferences.values()).find(
      (pref) => pref.userId === userId
    );
  }

  async createUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    const id = this.currentId.userPreferences++;
    const preferences: UserPreferences = {
      ...insertPreferences,
      id,
      genres: insertPreferences.genres || null,
      watchedAnimeIds: insertPreferences.watchedAnimeIds || null,
      subtitleLanguage: insertPreferences.subtitleLanguage || null,
      darkMode: insertPreferences.darkMode || null
    };
    this.userPreferences.set(id, preferences);
    return preferences;
  }

  async updateUserPreferences(userId: number, preferencesData: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const preferences = await this.getUserPreferences(userId);
    if (!preferences) return undefined;
    
    const updatedPreferences = { ...preferences, ...preferencesData };
    this.userPreferences.set(preferences.id, updatedPreferences);
    return updatedPreferences;
  }

  // Watch party methods
  async createWatchParty(insertWatchParty: InsertWatchParty): Promise<WatchParty> {
    const id = this.currentId.watchParties++;
    
    // If roomCode is not provided in the input, generate one
    const roomCode = insertWatchParty.roomCode || randomBytes(4).toString('hex');
    
    const watchParty: WatchParty = {
      id,
      creatorId: insertWatchParty.creatorId,
      animeId: insertWatchParty.animeId,
      episodeId: insertWatchParty.episodeId,
      isPublic: insertWatchParty.isPublic ?? true,
      roomCode: roomCode,
      startTime: new Date(),
      endTime: null,
      currentTime: 0,
      isPlaying: false
    };
    
    this.watchParties.set(id, watchParty);
    this.partyParticipants.set(id, new Set([insertWatchParty.creatorId]));
    return watchParty;
  }

  async getWatchParty(id: number): Promise<WatchParty | undefined> {
    return this.watchParties.get(id);
  }

  async getWatchPartyByCode(roomCode: string): Promise<WatchParty | undefined> {
    return Array.from(this.watchParties.values()).find(
      (party) => party.roomCode === roomCode
    );
  }

  async updateWatchParty(id: number, watchPartyData: Partial<WatchParty>): Promise<WatchParty | undefined> {
    const watchParty = await this.getWatchParty(id);
    if (!watchParty) return undefined;
    
    const updatedWatchParty = { ...watchParty, ...watchPartyData };
    this.watchParties.set(id, updatedWatchParty);
    return updatedWatchParty;
  }

  async addParticipantToParty(partyId: number, userId: number): Promise<boolean> {
    const participants = this.partyParticipants.get(partyId);
    if (!participants) return false;
    
    participants.add(userId);
    return true;
  }

  async getPartyParticipants(partyId: number): Promise<number[]> {
    const participants = this.partyParticipants.get(partyId);
    if (!participants) return [];
    
    return Array.from(participants);
  }

  async removeParticipantFromParty(partyId: number, userId: number): Promise<boolean> {
    const participants = this.partyParticipants.get(partyId);
    if (!participants) return false;
    
    return participants.delete(userId);
  }

  // Recommendations methods
  async getUserRecommendations(userId: number): Promise<number[]> {
    return this.recommendations.get(userId) || [];
  }

  async updateUserRecommendations(userId: number, animeIds: number[]): Promise<void> {
    this.recommendations.set(userId, animeIds);
  }
}

export const storage = new MemStorage();
