import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  profilePicture: text("profile_picture"),
  role: text("role").default("user").notNull(), // 'user' veya 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const watchHistory = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  animeId: integer("anime_id").notNull(),
  episodeId: integer("episode_id"),  // Opsiyonel olarak değiştirildi
  progress: integer("progress").notNull().default(0),
  duration: integer("duration").notNull().default(0),
  lastWatched: timestamp("last_watched").defaultNow().notNull(),
  completed: boolean("completed").default(false),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  animeId: integer("anime_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  genres: text("genres").array(),
  watchedAnimeIds: integer("watched_anime_ids").array(),
  subtitleLanguage: text("subtitle_language").default("tr"),
  darkMode: boolean("dark_mode").default(true),
});

export const userRecommendations = pgTable("user_recommendations", {
  id: serial("id").primaryKey(), 
  userId: integer("user_id").notNull().references(() => users.id),
  animeIds: integer("anime_ids").array(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const watchParties = pgTable("watch_parties", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  animeId: integer("anime_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  isPublic: boolean("is_public").default(true),
  roomCode: text("room_code").notNull().unique(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  currentTime: integer("current_time").default(0),
  isPlaying: boolean("is_playing").default(false),
});

export const watchPartyParticipants = pgTable("watch_party_participants", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull().references(() => watchParties.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull().references(() => watchParties.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

// Etkileşimli anime izleme özellikleri için tablolar
export const episodeComments = pgTable("episode_comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  animeId: integer("anime_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  content: text("content").notNull(),
  timestamp: integer("timestamp"), // İsteğe bağlı, belirli bir video anındaki yorum için
  parentId: integer("parent_id"), // Yoruma yanıt için, daha sonra ilişki kurulacak
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isDeleted: boolean("is_deleted").default(false),
  likes: integer("likes").default(0),
});

// Video esnasında hızlı reaksiyonlar
export const episodeReactions = pgTable("episode_reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  animeId: integer("anime_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  reaction: varchar("reaction", { length: 50 }).notNull(), // Emoji veya reaksiyon tipi
  timestamp: integer("timestamp").notNull(), // Videonun kaçıncı saniyesinde reaksiyon verildi
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bölüm sonlarında gösterilen anketler
export const episodePolls = pgTable("episode_polls", {
  id: serial("id").primaryKey(),
  animeId: integer("anime_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"), // Anket sona erdi mi?
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id), // Admin veya moderatör
});

// Anket seçenekleri
export const pollOptions = pgTable("poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => episodePolls.id),
  text: text("text").notNull(),
  imageUrl: text("image_url"), // İsteğe bağlı görsel
});

// Anket oyları
export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(), 
  pollId: integer("poll_id").notNull().references(() => episodePolls.id),
  optionId: integer("option_id").notNull().references(() => pollOptions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  votedAt: timestamp("voted_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  profilePicture: true,
  role: true,
});

export const insertWatchHistorySchema = createInsertSchema(watchHistory).pick({
  animeId: true,
  episodeId: true,
  progress: true,
  duration: true,
  completed: true,
}).extend({
  userId: z.number().optional(),
  episodeId: z.number().optional(),
  completed: z.boolean().optional().default(false)
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  userId: true,
  animeId: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  genres: true,
  watchedAnimeIds: true,
  subtitleLanguage: true,
  darkMode: true,
});

export const insertWatchPartySchema = createInsertSchema(watchParties).pick({
  creatorId: true,
  animeId: true,
  episodeId: true,
  isPublic: true,
  roomCode: true,
});

// Etkileşimli özellikler için şemalar
export const insertEpisodeCommentSchema = createInsertSchema(episodeComments).pick({
  animeId: true,
  episodeId: true,
  content: true,
  timestamp: true,
  parentId: true,
}).extend({
  userId: z.number().optional(),
  username: z.string().optional(),
  timestamp: z.number().optional(),
  parentId: z.number().optional()
});

export const insertEpisodeReactionSchema = createInsertSchema(episodeReactions).pick({
  animeId: true,
  episodeId: true,
  reaction: true,
  timestamp: true,
}).extend({
  userId: z.number().optional(),
  timestamp: z.number().optional()
});

export const insertEpisodePollSchema = createInsertSchema(episodePolls).pick({
  animeId: true,
  episodeId: true,
  question: true,
  isActive: true,
  createdBy: true,
});

export const insertPollOptionSchema = createInsertSchema(pollOptions).pick({
  pollId: true,
  text: true,
  imageUrl: true,
});

export const insertPollVoteSchema = createInsertSchema(pollVotes).pick({
  pollId: true,
  optionId: true,
  userId: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, { message: "Kullanıcı adı en az 3 karakter olmalıdır." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type WatchHistory = typeof watchHistory.$inferSelect;
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type WatchParty = typeof watchParties.$inferSelect;
export type InsertWatchParty = z.infer<typeof insertWatchPartySchema>;

// Etkileşimli özellikler için tipler
export type EpisodeComment = typeof episodeComments.$inferSelect;
export type InsertEpisodeComment = z.infer<typeof insertEpisodeCommentSchema>;
export type EpisodeReaction = typeof episodeReactions.$inferSelect;
export type InsertEpisodeReaction = z.infer<typeof insertEpisodeReactionSchema>;
export type EpisodePoll = typeof episodePolls.$inferSelect;
export type InsertEpisodePoll = z.infer<typeof insertEpisodePollSchema>;
export type PollOption = typeof pollOptions.$inferSelect;
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
export type PollVote = typeof pollVotes.$inferSelect;
export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;

export type LoginCredentials = z.infer<typeof loginSchema>;

// Fansub modelleri
export const fansubs = pgTable("fansubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  description: text("description"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fansub Video Kaynakları
export const fansubSources = pgTable("fansub_sources", {
  id: serial("id").primaryKey(),
  fansubId: integer("fansub_id").notNull().references(() => fansubs.id),
  animeId: integer("anime_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  videoUrl: text("video_url").notNull(),
  quality: text("quality").default("720p"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Fansub şemaları
export const insertFansubSchema = createInsertSchema(fansubs).pick({
  name: true,
  logo: true,
  description: true,
  website: true,
});

export const insertFansubSourceSchema = createInsertSchema(fansubSources).pick({
  fansubId: true,
  animeId: true, 
  episodeId: true,
  videoUrl: true,
  quality: true,
});

// Fansub tipleri
export type Fansub = typeof fansubs.$inferSelect;
export type InsertFansub = z.infer<typeof insertFansubSchema>;
export type FansubSource = typeof fansubSources.$inferSelect;
export type InsertFansubSource = z.infer<typeof insertFansubSourceSchema>;
