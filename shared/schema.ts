import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const watchHistory = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  animeId: integer("anime_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  progress: integer("progress").notNull().default(0),
  duration: integer("duration").notNull().default(0),
  lastWatched: timestamp("last_watched").defaultNow().notNull(),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  profilePicture: true,
});

export const insertWatchHistorySchema = createInsertSchema(watchHistory).pick({
  userId: true,
  animeId: true,
  episodeId: true,
  progress: true,
  duration: true,
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
export type LoginCredentials = z.infer<typeof loginSchema>;
