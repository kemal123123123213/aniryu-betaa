import { 
  users, watchHistory, favorites, userPreferences, userRecommendations, 
  watchParties, watchPartyParticipants, messages,
  episodeComments, episodeReactions, episodePolls, pollOptions, pollVotes,
  fansubs, fansubSources
} from "@shared/schema";
import type { 
  User, InsertUser, WatchHistory, InsertWatchHistory, 
  Favorite, InsertFavorite, UserPreferences, InsertUserPreferences, 
  WatchParty, InsertWatchParty,
  EpisodeComment, InsertEpisodeComment,
  EpisodeReaction, InsertEpisodeReaction,
  EpisodePoll, InsertEpisodePoll,
  PollOption, InsertPollOption,
  PollVote, InsertPollVote,
  Fansub, InsertFansub, 
  FansubSource, InsertFansubSource
} from "@shared/schema";
import { randomBytes } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { eq, and, desc, asc, isNull, sql } from "drizzle-orm";
import { db } from "./db";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  deleteUser(id: number): Promise<boolean>;
  
  // Admin statistics methods
  getWatchHistoryCount(): Promise<number>;
  getCommentsCount(): Promise<number>;
  getPollsCount(): Promise<number>;
  
  // Watch history methods
  getWatchHistory(userId: number): Promise<WatchHistory[]>;
  addWatchHistory(watchHistory: InsertWatchHistory): Promise<WatchHistory>;
  updateWatchHistory(id: number, watchHistory: Partial<WatchHistory>): Promise<WatchHistory | undefined>;
  getWatchHistoryByAnimeAndUser(userId: number, animeId: number, episodeId?: number): Promise<WatchHistory | undefined>;
  
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
  
  // Episode comments methods
  getEpisodeComments(animeId: number, episodeId: number): Promise<EpisodeComment[]>;
  getCommentById(id: number): Promise<EpisodeComment | undefined>;
  addComment(comment: InsertEpisodeComment): Promise<EpisodeComment>;
  updateComment(id: number, comment: Partial<EpisodeComment>): Promise<EpisodeComment | undefined>;
  deleteComment(id: number): Promise<boolean>;
  getReplies(parentId: number): Promise<EpisodeComment[]>;
  
  // Episode reactions methods
  getEpisodeReactions(animeId: number, episodeId: number): Promise<EpisodeReaction[]>;
  addReaction(reaction: InsertEpisodeReaction): Promise<EpisodeReaction>;
  
  // Episode polls methods
  getEpisodePolls(animeId: number, episodeId: number): Promise<EpisodePoll[]>;
  getPollById(id: number): Promise<EpisodePoll | undefined>;
  createPoll(poll: InsertEpisodePoll): Promise<EpisodePoll>;
  updatePoll(id: number, poll: Partial<EpisodePoll>): Promise<EpisodePoll | undefined>;
  
  // Poll options methods
  getPollOptions(pollId: number): Promise<PollOption[]>;
  addPollOption(option: InsertPollOption): Promise<PollOption>;
  
  // Poll votes methods
  getPollVotes(pollId: number): Promise<PollVote[]>;
  getUserVote(pollId: number, userId: number): Promise<PollVote | undefined>;
  addPollVote(vote: InsertPollVote): Promise<PollVote>;
  
  // Fansub methods
  getAllFansubs(): Promise<Fansub[]>;
  getFansub(id: number): Promise<Fansub | undefined>;
  createFansub(fansub: InsertFansub): Promise<Fansub>;
  updateFansub(id: number, fansub: Partial<Fansub>): Promise<Fansub | undefined>;
  deleteFansub(id: number): Promise<boolean>;
  
  // Fansub source methods
  getFansubSources(animeId: number, episodeId: number): Promise<FansubSource[]>;
  getFansubSourcesWithDetails(animeId: number, episodeId: number): Promise<(FansubSource & { fansub: Fansub | undefined })[]>;
  getFansubSource(id: number): Promise<FansubSource | undefined>;
  createFansubSource(source: InsertFansubSource): Promise<FansubSource>;
  updateFansubSource(id: number, source: Partial<FansubSource>): Promise<FansubSource | undefined>;
  deleteFansubSource(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(users);
    return Number(result[0].count);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
  
  async getWatchHistoryCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(watchHistory);
    return Number(result[0].count);
  }
  
  async getCommentsCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(episodeComments);
    return Number(result[0].count);
  }
  
  async getPollsCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(episodePolls);
    return Number(result[0].count);
  }

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    // Set up session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    console.log("PostgreSQL database connection established");
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      profilePicture: insertUser.profilePicture || null,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Watch history methods
  async getWatchHistory(userId: number): Promise<WatchHistory[]> {
    return db.select().from(watchHistory)
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.lastWatched));
  }

  async addWatchHistory(insertWatchHistory: InsertWatchHistory): Promise<WatchHistory> {
    // Check if entry already exists for this specific episode
    const existing = await this.getWatchHistoryByAnimeAndUser(
      insertWatchHistory.userId,
      insertWatchHistory.animeId,
      insertWatchHistory.episodeId
    );

    if (existing) {
      return this.updateWatchHistory(existing.id, {
        progress: insertWatchHistory.progress || 0,
        duration: insertWatchHistory.duration || existing.duration,
        lastWatched: new Date()
      }) as Promise<WatchHistory>;
    }

    const result = await db.insert(watchHistory).values({
      ...insertWatchHistory,
      progress: insertWatchHistory.progress || 0,
      duration: insertWatchHistory.duration || 0,
      lastWatched: new Date()
    }).returning();
    
    return result[0];
  }

  async updateWatchHistory(id: number, watchHistoryData: Partial<WatchHistory>): Promise<WatchHistory | undefined> {
    const result = await db.update(watchHistory)
      .set({
        ...watchHistoryData,
        lastWatched: new Date()
      })
      .where(eq(watchHistory.id, id))
      .returning();
    
    return result[0];
  }

  async getWatchHistoryByAnimeAndUser(userId: number, animeId: number, episodeId?: number): Promise<WatchHistory | undefined> {
    let conditions = [
      eq(watchHistory.userId, userId),
      eq(watchHistory.animeId, animeId)
    ];
    
    if (episodeId !== undefined) {
      conditions.push(eq(watchHistory.episodeId, episodeId));
    }
    
    const result = await db.select().from(watchHistory)
      .where(and(...conditions));
    
    return result[0];
  }

  // Favorites methods
  async getFavorites(userId: number): Promise<Favorite[]> {
    return db.select().from(favorites)
      .where(eq(favorites.userId, userId));
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    // Check if already favorited
    const alreadyFavorite = await this.isFavorite(insertFavorite.userId, insertFavorite.animeId);
    
    if (alreadyFavorite) {
      const existing = await db.select().from(favorites)
        .where(and(
          eq(favorites.userId, insertFavorite.userId),
          eq(favorites.animeId, insertFavorite.animeId)
        ));
      return existing[0];
    }

    const result = await db.insert(favorites).values({
      ...insertFavorite,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async removeFavorite(userId: number, animeId: number): Promise<boolean> {
    const result = await db.delete(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.animeId, animeId)
      ))
      .returning();
    
    return result.length > 0;
  }

  async isFavorite(userId: number, animeId: number): Promise<boolean> {
    const result = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.animeId, animeId)
      ));
    
    return result.length > 0;
  }

  // User preferences methods
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const result = await db.select().from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    
    return result[0];
  }

  async createUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    const result = await db.insert(userPreferences).values({
      ...insertPreferences,
      genres: insertPreferences.genres || null,
      watchedAnimeIds: insertPreferences.watchedAnimeIds || null,
      subtitleLanguage: insertPreferences.subtitleLanguage || null,
      darkMode: insertPreferences.darkMode || null
    }).returning();
    
    return result[0];
  }

  async updateUserPreferences(userId: number, preferencesData: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const result = await db.update(userPreferences)
      .set(preferencesData)
      .where(eq(userPreferences.userId, userId))
      .returning();
    
    return result[0];
  }

  // Watch party methods
  async createWatchParty(insertWatchParty: InsertWatchParty): Promise<WatchParty> {
    // If roomCode is not provided in the input, generate one
    const roomCode = insertWatchParty.roomCode || randomBytes(4).toString('hex');
    
    const result = await db.insert(watchParties).values({
      creatorId: insertWatchParty.creatorId,
      animeId: insertWatchParty.animeId,
      episodeId: insertWatchParty.episodeId,
      isPublic: insertWatchParty.isPublic ?? true,
      roomCode: roomCode,
      startTime: new Date(),
      endTime: null,
      currentTime: 0,
      isPlaying: false
    }).returning();
    
    const watchParty = result[0];
    
    // Add creator as first participant
    await db.insert(watchPartyParticipants).values({
      partyId: watchParty.id,
      userId: insertWatchParty.creatorId
    });
    
    return watchParty;
  }

  async getWatchParty(id: number): Promise<WatchParty | undefined> {
    const result = await db.select().from(watchParties)
      .where(eq(watchParties.id, id));
    
    return result[0];
  }

  async getWatchPartyByCode(roomCode: string): Promise<WatchParty | undefined> {
    const result = await db.select().from(watchParties)
      .where(eq(watchParties.roomCode, roomCode));
    
    return result[0];
  }

  async updateWatchParty(id: number, watchPartyData: Partial<WatchParty>): Promise<WatchParty | undefined> {
    const result = await db.update(watchParties)
      .set(watchPartyData)
      .where(eq(watchParties.id, id))
      .returning();
    
    return result[0];
  }

  async addParticipantToParty(partyId: number, userId: number): Promise<boolean> {
    // Check if participant is already in the party
    const existing = await db.select().from(watchPartyParticipants)
      .where(and(
        eq(watchPartyParticipants.partyId, partyId),
        eq(watchPartyParticipants.userId, userId)
      ));
    
    if (existing.length > 0) {
      return true;
    }
    
    const result = await db.insert(watchPartyParticipants).values({
      partyId,
      userId
    }).returning();
    
    return result.length > 0;
  }

  async getPartyParticipants(partyId: number): Promise<number[]> {
    const result = await db.select().from(watchPartyParticipants)
      .where(eq(watchPartyParticipants.partyId, partyId));
    
    return result.map((participant: any) => participant.userId);
  }

  async removeParticipantFromParty(partyId: number, userId: number): Promise<boolean> {
    const result = await db.delete(watchPartyParticipants)
      .where(and(
        eq(watchPartyParticipants.partyId, partyId),
        eq(watchPartyParticipants.userId, userId)
      ))
      .returning();
    
    return result.length > 0;
  }

  // Recommendations methods
  async getUserRecommendations(userId: number): Promise<number[]> {
    const result = await db.select().from(userRecommendations)
      .where(eq(userRecommendations.userId, userId));
    
    if (result.length === 0) {
      return [];
    }
    
    return result[0].animeIds || [];
  }

  async updateUserRecommendations(userId: number, animeIds: number[]): Promise<void> {
    const existing = await db.select().from(userRecommendations)
      .where(eq(userRecommendations.userId, userId));
    
    if (existing.length === 0) {
      await db.insert(userRecommendations).values({
        userId,
        animeIds
      });
    } else {
      await db.update(userRecommendations)
        .set({ animeIds })
        .where(eq(userRecommendations.userId, userId));
    }
  }

  // Episode comments methods
  async getEpisodeComments(animeId: number, episodeId: number): Promise<EpisodeComment[]> {
    // Ana yorumlar, yanıtlar değil
    return db.select().from(episodeComments)
      .where(and(
        eq(episodeComments.animeId, animeId),
        eq(episodeComments.episodeId, episodeId),
        isNull(episodeComments.parentId),
        eq(episodeComments.isDeleted, false)
      ))
      .orderBy(desc(episodeComments.createdAt));
  }

  async getCommentById(id: number): Promise<EpisodeComment | undefined> {
    const result = await db.select().from(episodeComments)
      .where(eq(episodeComments.id, id));
    
    return result[0];
  }

  async addComment(insertComment: InsertEpisodeComment): Promise<EpisodeComment> {
    const result = await db.insert(episodeComments).values({
      ...insertComment,
      timestamp: insertComment.timestamp || null,
      parentId: insertComment.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      likes: 0
    }).returning();
    
    return result[0];
  }

  async updateComment(id: number, commentData: Partial<EpisodeComment>): Promise<EpisodeComment | undefined> {
    // Sadece içerik ve silme durumunu güncellemeye izin ver
    const validFields: Partial<EpisodeComment> = {
      content: commentData.content,
      isDeleted: commentData.isDeleted,
      likes: commentData.likes,
      updatedAt: new Date()
    };

    const result = await db.update(episodeComments)
      .set(validFields)
      .where(eq(episodeComments.id, id))
      .returning();
    
    return result[0];
  }

  async deleteComment(id: number): Promise<boolean> {
    // Gerçek silme yerine soft delete
    const result = await db.update(episodeComments)
      .set({ 
        isDeleted: true,
        updatedAt: new Date() 
      })
      .where(eq(episodeComments.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getReplies(parentId: number): Promise<EpisodeComment[]> {
    return db.select().from(episodeComments)
      .where(and(
        eq(episodeComments.parentId, parentId),
        eq(episodeComments.isDeleted, false)
      ))
      .orderBy(asc(episodeComments.createdAt));
  }

  // Episode reactions methods
  async getEpisodeReactions(animeId: number, episodeId: number): Promise<EpisodeReaction[]> {
    return db.select().from(episodeReactions)
      .where(and(
        eq(episodeReactions.animeId, animeId),
        eq(episodeReactions.episodeId, episodeId)
      ))
      .orderBy(asc(episodeReactions.timestamp));
  }

  async addReaction(insertReaction: InsertEpisodeReaction): Promise<EpisodeReaction> {
    const result = await db.insert(episodeReactions).values({
      ...insertReaction,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  // Episode polls methods
  async getEpisodePolls(animeId: number, episodeId: number): Promise<EpisodePoll[]> {
    return db.select().from(episodePolls)
      .where(and(
        eq(episodePolls.animeId, animeId),
        eq(episodePolls.episodeId, episodeId)
      ))
      .orderBy(desc(episodePolls.createdAt));
  }

  async getPollById(id: number): Promise<EpisodePoll | undefined> {
    const result = await db.select().from(episodePolls)
      .where(eq(episodePolls.id, id));
    
    return result[0];
  }

  async createPoll(insertPoll: InsertEpisodePoll): Promise<EpisodePoll> {
    const result = await db.insert(episodePolls).values({
      ...insertPoll,
      createdAt: new Date(),
      endedAt: null,
      isActive: insertPoll.isActive ?? true
    }).returning();
    
    return result[0];
  }

  async updatePoll(id: number, pollData: Partial<EpisodePoll>): Promise<EpisodePoll | undefined> {
    const validFields: Partial<EpisodePoll> = {
      question: pollData.question,
      endedAt: pollData.endedAt,
      isActive: pollData.isActive
    };

    const result = await db.update(episodePolls)
      .set(validFields)
      .where(eq(episodePolls.id, id))
      .returning();
    
    return result[0];
  }

  // Poll options methods
  async getPollOptions(pollId: number): Promise<PollOption[]> {
    return db.select().from(pollOptions)
      .where(eq(pollOptions.pollId, pollId));
  }

  async addPollOption(insertOption: InsertPollOption): Promise<PollOption> {
    const result = await db.insert(pollOptions).values({
      ...insertOption,
      imageUrl: insertOption.imageUrl || null
    }).returning();
    
    return result[0];
  }

  // Poll votes methods
  async getPollVotes(pollId: number): Promise<PollVote[]> {
    return db.select().from(pollVotes)
      .where(eq(pollVotes.pollId, pollId));
  }

  async getUserVote(pollId: number, userId: number): Promise<PollVote | undefined> {
    const result = await db.select().from(pollVotes)
      .where(and(
        eq(pollVotes.pollId, pollId),
        eq(pollVotes.userId, userId)
      ));
    
    return result[0];
  }

  async addPollVote(insertVote: InsertPollVote): Promise<PollVote> {
    // Mevcut oy var mı diye kontrol et
    const existingVote = await this.getUserVote(insertVote.pollId, insertVote.userId);
    
    if (existingVote) {
      // Aynı seçenek için oy verilmişse, mevcut oyu döndür
      if (existingVote.optionId === insertVote.optionId) {
        return existingVote;
      }
      
      // Farklı seçenek için oy verilmişse, mevcut oyu sil
      await db.delete(pollVotes)
        .where(eq(pollVotes.id, existingVote.id));
    }
    
    // Yeni oy ekle
    const result = await db.insert(pollVotes).values({
      ...insertVote,
      votedAt: new Date()
    }).returning();
    
    return result[0];
  }

  // Fansub methods
  async getAllFansubs(): Promise<Fansub[]> {
    return db.select().from(fansubs);
  }

  async getFansub(id: number): Promise<Fansub | undefined> {
    const result = await db.select().from(fansubs)
      .where(eq(fansubs.id, id));
    return result[0];
  }

  async createFansub(insertFansub: InsertFansub): Promise<Fansub> {
    const result = await db.insert(fansubs).values({
      ...insertFansub,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateFansub(id: number, fansubData: Partial<Fansub>): Promise<Fansub | undefined> {
    const result = await db.update(fansubs)
      .set(fansubData)
      .where(eq(fansubs.id, id))
      .returning();
    return result[0];
  }

  async deleteFansub(id: number): Promise<boolean> {
    const result = await db.delete(fansubs)
      .where(eq(fansubs.id, id))
      .returning();
    return result.length > 0;
  }

  // Fansub source methods
  async getFansubSources(animeId: number, episodeId: number): Promise<FansubSource[]> {
    return db.select().from(fansubSources)
      .where(and(
        eq(fansubSources.animeId, animeId),
        eq(fansubSources.episodeId, episodeId)
      ));
  }

  async getFansubSourcesWithDetails(animeId: number, episodeId: number): Promise<(FansubSource & { fansub: Fansub | undefined })[]> {
    const sources = await this.getFansubSources(animeId, episodeId);
    
    // Her bir kaynak için fansub bilgilerini yükle
    const sourcesWithDetails = await Promise.all(sources.map(async (source) => {
      const fansub = await this.getFansub(source.fansubId);
      return { ...source, fansub };
    }));
    
    return sourcesWithDetails;
  }

  async getFansubSource(id: number): Promise<FansubSource | undefined> {
    const result = await db.select().from(fansubSources)
      .where(eq(fansubSources.id, id));
    return result[0];
  }

  async createFansubSource(insertSource: InsertFansubSource): Promise<FansubSource> {
    const result = await db.insert(fansubSources).values({
      ...insertSource,
      addedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateFansubSource(id: number, sourceData: Partial<FansubSource>): Promise<FansubSource | undefined> {
    const result = await db.update(fansubSources)
      .set(sourceData)
      .where(eq(fansubSources.id, id))
      .returning();
    return result[0];
  }

  async deleteFansubSource(id: number): Promise<boolean> {
    const result = await db.delete(fansubSources)
      .where(eq(fansubSources.id, id))
      .returning();
    return result.length > 0;
  }
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
  private episodeComments: Map<number, EpisodeComment>;
  private episodeReactions: Map<number, EpisodeReaction>;
  private episodePolls: Map<number, EpisodePoll>;
  private pollOptions: Map<number, PollOption>;
  private pollVotes: Map<number, PollVote>;
  private fansubs: Map<number, Fansub>;
  private fansubSources: Map<number, FansubSource>;
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
    this.episodeComments = new Map();
    this.episodeReactions = new Map();
    this.episodePolls = new Map();
    this.pollOptions = new Map();
    this.pollVotes = new Map();
    this.fansubs = new Map();
    this.fansubSources = new Map();
    
    this.currentId = {
      users: 1,
      watchHistories: 1,
      favorites: 1,
      userPreferences: 1,
      watchParties: 1,
      partyParticipants: 1,
      messages: 1,
      comments: 1,
      reactions: 1,
      polls: 1,
      pollOptions: 1,
      pollVotes: 1,
      fansubs: 1,
      fansubSources: 1
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
      role: insertUser.role || "user",
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
    // Check if entry already exists for this specific episode
    const existing = await this.getWatchHistoryByAnimeAndUser(
      insertWatchHistory.userId,
      insertWatchHistory.animeId,
      insertWatchHistory.episodeId
    );

    if (existing) {
      const updated = {
        ...existing,
        progress: insertWatchHistory.progress || 0,
        duration: insertWatchHistory.duration || existing.duration,
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

  async getWatchHistoryByAnimeAndUser(userId: number, animeId: number, episodeId?: number): Promise<WatchHistory | undefined> {
    return Array.from(this.watchHistories.values()).find(
      (history) => history.userId === userId && 
                  history.animeId === animeId && 
                  (episodeId === undefined || history.episodeId === episodeId)
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

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUserCount(): Promise<number> {
    return this.users.size;
  }
  
  async getWatchHistoryCount(): Promise<number> {
    return this.watchHistories.size;
  }
  
  async getCommentsCount(): Promise<number> {
    return this.episodeComments.size;
  }
  
  async getPollsCount(): Promise<number> {
    return this.episodePolls.size;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Episode comments methods
  async getEpisodeComments(animeId: number, episodeId: number): Promise<EpisodeComment[]> {
    return Array.from(this.episodeComments.values())
      .filter(comment => 
        comment.animeId === animeId && 
        comment.episodeId === episodeId && 
        !comment.parentId && 
        !comment.isDeleted
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCommentById(id: number): Promise<EpisodeComment | undefined> {
    return this.episodeComments.get(id);
  }

  async addComment(insertComment: InsertEpisodeComment): Promise<EpisodeComment> {
    const id = this.currentId.comments || (this.currentId.comments = 1);
    this.currentId.comments++;

    const comment: EpisodeComment = {
      id,
      ...insertComment,
      timestamp: insertComment.timestamp || null,
      parentId: insertComment.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      likes: 0
    };

    this.episodeComments.set(id, comment);
    return comment;
  }

  async updateComment(id: number, commentData: Partial<EpisodeComment>): Promise<EpisodeComment | undefined> {
    const comment = this.episodeComments.get(id);
    if (!comment) return undefined;

    const updatedComment: EpisodeComment = {
      ...comment,
      content: commentData.content || comment.content,
      isDeleted: commentData.isDeleted ?? comment.isDeleted,
      likes: commentData.likes ?? comment.likes,
      updatedAt: new Date()
    };

    this.episodeComments.set(id, updatedComment);
    return updatedComment;
  }

  async deleteComment(id: number): Promise<boolean> {
    const comment = this.episodeComments.get(id);
    if (!comment) return false;

    const updatedComment: EpisodeComment = {
      ...comment,
      isDeleted: true,
      updatedAt: new Date()
    };

    this.episodeComments.set(id, updatedComment);
    return true;
  }

  async getReplies(parentId: number): Promise<EpisodeComment[]> {
    return Array.from(this.episodeComments.values())
      .filter(comment => 
        comment.parentId === parentId && 
        !comment.isDeleted
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Episode reactions methods
  async getEpisodeReactions(animeId: number, episodeId: number): Promise<EpisodeReaction[]> {
    return Array.from(this.episodeReactions.values())
      .filter(reaction => 
        reaction.animeId === animeId && 
        reaction.episodeId === episodeId
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async addReaction(insertReaction: InsertEpisodeReaction): Promise<EpisodeReaction> {
    const id = this.currentId.reactions || (this.currentId.reactions = 1);
    this.currentId.reactions++;

    const reaction: EpisodeReaction = {
      id,
      ...insertReaction,
      createdAt: new Date()
    };

    this.episodeReactions.set(id, reaction);
    return reaction;
  }

  // Episode polls methods
  async getEpisodePolls(animeId: number, episodeId: number): Promise<EpisodePoll[]> {
    return Array.from(this.episodePolls.values())
      .filter(poll => 
        poll.animeId === animeId && 
        poll.episodeId === episodeId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPollById(id: number): Promise<EpisodePoll | undefined> {
    return this.episodePolls.get(id);
  }

  async createPoll(insertPoll: InsertEpisodePoll): Promise<EpisodePoll> {
    const id = this.currentId.polls || (this.currentId.polls = 1);
    this.currentId.polls++;

    const poll: EpisodePoll = {
      id,
      animeId: insertPoll.animeId,
      episodeId: insertPoll.episodeId,
      question: insertPoll.question,
      createdBy: insertPoll.createdBy || null,
      createdAt: new Date(),
      endedAt: null,
      isActive: insertPoll.isActive ?? true
    };

    this.episodePolls.set(id, poll);
    return poll;
  }

  async updatePoll(id: number, pollData: Partial<EpisodePoll>): Promise<EpisodePoll | undefined> {
    const poll = this.episodePolls.get(id);
    if (!poll) return undefined;

    const updatedPoll: EpisodePoll = {
      ...poll,
      animeId: pollData.animeId ?? poll.animeId,
      episodeId: pollData.episodeId ?? poll.episodeId,
      question: pollData.question ?? poll.question,
      createdBy: pollData.createdBy ?? poll.createdBy,
      createdAt: poll.createdAt,
      endedAt: pollData.endedAt ?? poll.endedAt,
      isActive: pollData.isActive ?? poll.isActive
    };

    this.episodePolls.set(id, updatedPoll);
    return updatedPoll;
  }

  // Poll options methods
  async getPollOptions(pollId: number): Promise<PollOption[]> {
    return Array.from(this.pollOptions.values())
      .filter(option => option.pollId === pollId);
  }

  async addPollOption(insertOption: InsertPollOption): Promise<PollOption> {
    const id = this.currentId.pollOptions || (this.currentId.pollOptions = 1);
    this.currentId.pollOptions++;

    const option: PollOption = {
      id,
      ...insertOption,
      imageUrl: insertOption.imageUrl || null
    };

    this.pollOptions.set(id, option);
    return option;
  }

  // Poll votes methods
  async getPollVotes(pollId: number): Promise<PollVote[]> {
    return Array.from(this.pollVotes.values())
      .filter(vote => vote.pollId === pollId);
  }

  async getUserVote(pollId: number, userId: number): Promise<PollVote | undefined> {
    return Array.from(this.pollVotes.values())
      .find(vote => vote.pollId === pollId && vote.userId === userId);
  }

  async addPollVote(insertVote: InsertPollVote): Promise<PollVote> {
    // Kullanıcının mevcut oyunu kontrol et
    const existingVote = await this.getUserVote(insertVote.pollId, insertVote.userId);
    
    if (existingVote) {
      if (existingVote.optionId === insertVote.optionId) {
        return existingVote;
      }
      
      // Farklı seçenek için oy verilmişse eski oyu sil
      this.pollVotes.delete(existingVote.id);
    }
    
    const id = this.currentId.pollVotes || (this.currentId.pollVotes = 1);
    this.currentId.pollVotes++;
    
    const vote: PollVote = {
      id,
      ...insertVote,
      votedAt: new Date()
    };
    
    this.pollVotes.set(id, vote);
    return vote;
  }
  


  // Fansub methods
  async getAllFansubs(): Promise<Fansub[]> {
    return Array.from(this.fansubs.values());
  }

  async getFansub(id: number): Promise<Fansub | undefined> {
    return this.fansubs.get(id);
  }

  async createFansub(insertFansub: InsertFansub): Promise<Fansub> {
    const id = this.currentId.fansubs++;
    const fansub: Fansub = {
      ...insertFansub,
      id,
      createdAt: new Date()
    };
    this.fansubs.set(id, fansub);
    return fansub;
  }

  async updateFansub(id: number, fansubData: Partial<Fansub>): Promise<Fansub | undefined> {
    const fansub = this.fansubs.get(id);
    if (!fansub) return undefined;

    const updatedFansub = { ...fansub, ...fansubData };
    this.fansubs.set(id, updatedFansub);
    return updatedFansub;
  }

  async deleteFansub(id: number): Promise<boolean> {
    return this.fansubs.delete(id);
  }

  // Fansub source methods
  async getFansubSources(animeId: number, episodeId: number): Promise<FansubSource[]> {
    return Array.from(this.fansubSources.values())
      .filter(source => source.animeId === animeId && source.episodeId === episodeId);
  }

  async getFansubSourcesWithDetails(animeId: number, episodeId: number): Promise<(FansubSource & { fansub: Fansub | undefined })[]> {
    const sources = await this.getFansubSources(animeId, episodeId);
    
    // Her bir kaynak için fansub bilgilerini ekle
    const sourcesWithDetails = await Promise.all(sources.map(async (source) => {
      const fansub = await this.getFansub(source.fansubId);
      return { ...source, fansub };
    }));
    
    return sourcesWithDetails;
  }

  async getFansubSource(id: number): Promise<FansubSource | undefined> {
    return this.fansubSources.get(id);
  }

  async createFansubSource(insertSource: InsertFansubSource): Promise<FansubSource> {
    const id = this.currentId.fansubSources++;
    const source: FansubSource = {
      ...insertSource,
      id,
      addedAt: new Date()
    };
    this.fansubSources.set(id, source);
    return source;
  }

  async updateFansubSource(id: number, sourceData: Partial<FansubSource>): Promise<FansubSource | undefined> {
    const source = this.fansubSources.get(id);
    if (!source) return undefined;

    const updatedSource = { ...source, ...sourceData };
    this.fansubSources.set(id, updatedSource);
    return updatedSource;
  }

  async deleteFansubSource(id: number): Promise<boolean> {
    return this.fansubSources.delete(id);
  }
}

// Use DatabaseStorage if we have a database URL, otherwise fall back to MemStorage
// Sorunu çözmek için veritabanı yerine in-memory storage kullanıyoruz
export const storage = new MemStorage();
