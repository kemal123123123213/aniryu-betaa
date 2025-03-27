import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { 
  insertWatchHistorySchema, insertFavoriteSchema, 
  insertEpisodeCommentSchema, insertEpisodeReactionSchema,
  insertEpisodePollSchema, insertPollOptionSchema, insertPollVoteSchema,
  insertFansubSchema, insertFansubSourceSchema
} from "@shared/schema";
import { aiService } from "./services/ai-service";

function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Giriş yapmalısınız" });
}

function isAdmin(req: any, res: any, next: any) {
  // Kullanıcının oturum açmış olması ve rolünün 'admin' olması gerekir
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  
  // Özel admin erişim kodu (query param) ile de erişim sağlansın
  const adminToken = req.headers['x-admin-token'] || req.query.adminToken;
  if (adminToken === 'admin123') {
    return next();
  }
  
  // Kullanıcı admin değilse, erişime izin verme
  return res.status(403).json({ message: "Bu işlem için admin yetkisi gerekiyor" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Admin rol ataması için yeni endpoint
  app.post("/api/admin/set-role", isAdmin, async (req, res) => {
    try {
      const { userId, role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ message: "Kullanıcı ID ve rol belirtilmelidir" });
      }
      
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Geçersiz rol. 'user' veya 'admin' olmalıdır" });
      }
      
      const updatedUser = await storage.updateUser(userId, { role });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      res.json({ 
        success: true, 
        message: `${updatedUser.username} kullanıcısına ${role} rolü atandı`,
        user: updatedUser
      });
    } catch (error) {
      console.error("Rol atama hatası:", error);
      res.status(500).json({ message: "Rol atanırken bir hata oluştu" });
    }
  });

  // Admin API routes
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcılar getirilirken bir hata oluştu" });
    }
  });
  
  app.get("/api/admin/user/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Geçersiz kullanıcı ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı detayları getirilirken bir hata oluştu" });
    }
  });
  
  app.put("/api/admin/user/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Geçersiz kullanıcı ID" });
      }
      
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı güncellenirken bir hata oluştu" });
    }
  });
  
  app.delete("/api/admin/user/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Geçersiz kullanıcı ID" });
      }
      
      // Admin kendisini silemez
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Kendi hesabınızı silemezsiniz" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı veya silinemedi" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı silinirken bir hata oluştu" });
    }
  });
  
  // Admin statistics API
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const userCount = await storage.getUserCount();
      const watchHistoryCount = await storage.getWatchHistoryCount();
      const commentsCount = await storage.getCommentsCount();
      const pollsCount = await storage.getPollsCount();
      
      res.json({
        userCount,
        watchHistoryCount,
        commentsCount,
        pollsCount,
        lastUpdated: new Date()
      });
    } catch (error) {
      res.status(500).json({ message: "İstatistikler getirilirken bir hata oluştu" });
    }
  });

  const httpServer = createServer(app);

  // Watch history routes
  app.get("/api/watch-history", async (req, res) => {
    try {
      // Kullanıcı oturumunu kontrol et ve bir varsayılan kullanıcı ID'si ata
      const userId = req.isAuthenticated() ? req.user!.id : parseInt(req.query.userId as string) || 1;
      
      // Specific anime and episode query
      const animeId = req.query.animeId ? parseInt(req.query.animeId as string) : undefined;
      const episodeId = req.query.episodeId ? parseInt(req.query.episodeId as string) : undefined;
      
      // If both animeId and episodeId are provided, return specific watch history
      if (animeId && episodeId) {
        const specificHistory = await storage.getWatchHistoryByAnimeAndUser(userId, animeId, episodeId);
        return res.json(specificHistory || null);
      }
      
      // Otherwise return all watch history
      const history = await storage.getWatchHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "İzleme geçmişi getirilirken bir hata oluştu" });
    }
  });

  app.post("/api/watch-history", async (req, res) => {
    try {
      const validation = insertWatchHistorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz izleme verisi", 
          errors: validation.error.errors 
        });
      }

      // Kullanıcı oturumunu kontrol et ve bir varsayılan kullanıcı ID'si ata
      const userId = req.isAuthenticated() ? req.user!.id : req.body.userId || 1;
      
      // Daha önceki izleme kaydını kontrol et
      let existingHistory = await storage.getWatchHistoryByAnimeAndUser(
        userId, 
        req.body.animeId,
        req.body.episodeId
      );
      
      let watchHistory;
      
      if (existingHistory) {
        // Var olan kaydı güncelle
        watchHistory = await storage.updateWatchHistory(existingHistory.id, {
          ...req.body,
          userId
        });
      } else {
        // Yeni kayıt oluştur
        watchHistory = await storage.addWatchHistory({
          ...req.body,
          userId
        });
      }
      
      res.status(201).json(watchHistory);
    } catch (error) {
      console.error("İzleme kaydı hatası:", error);
      res.status(500).json({ message: "İzleme kaydı eklenirken bir hata oluştu" });
    }
  });

  app.put("/api/watch-history/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      const userId = req.user!.id;
      const watchHistory = await storage.updateWatchHistory(id, {
        ...req.body,
        userId
      });
      
      if (!watchHistory) {
        return res.status(404).json({ message: "İzleme kaydı bulunamadı" });
      }
      
      res.json(watchHistory);
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu" });
    }
  });

  // Favorites routes
  app.get("/api/favorites", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const favorites = await storage.getFavorites(userId);
    res.json(favorites);
  });

  app.post("/api/favorites", isAuthenticated, async (req, res) => {
    try {
      const validation = insertFavoriteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Geçersiz favori verisi" });
      }

      const userId = req.user!.id;
      const favorite = await storage.addFavorite({
        ...req.body,
        userId
      });
      
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu" });
    }
  });

  app.delete("/api/favorites/:animeId", isAuthenticated, async (req, res) => {
    try {
      const animeId = parseInt(req.params.animeId);
      if (isNaN(animeId)) {
        return res.status(400).json({ message: "Geçersiz anime ID" });
      }

      const userId = req.user!.id;
      const success = await storage.removeFavorite(userId, animeId);
      
      if (!success) {
        return res.status(404).json({ message: "Favori bulunamadı" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu" });
    }
  });

  app.get("/api/favorites/check/:animeId", isAuthenticated, async (req, res) => {
    try {
      const animeId = parseInt(req.params.animeId);
      if (isNaN(animeId)) {
        return res.status(400).json({ message: "Geçersiz anime ID" });
      }

      const userId = req.user!.id;
      const isFavorite = await storage.isFavorite(userId, animeId);
      
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu" });
    }
  });

  // User preferences routes
  app.get("/api/preferences", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const preferences = await storage.getUserPreferences(userId);
    
    if (!preferences) {
      // Create default preferences if not exists
      const newPreferences = await storage.createUserPreferences({
        userId,
        genres: [],
        watchedAnimeIds: [],
        subtitleLanguage: "tr",
        darkMode: true
      });
      return res.json(newPreferences);
    }
    
    res.json(preferences);
  });

  app.put("/api/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      let preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        preferences = await storage.createUserPreferences({
          userId,
          ...req.body
        });
      } else {
        preferences = await storage.updateUserPreferences(userId, req.body);
      }
      
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu" });
    }
  });

  // Watch party routes
  app.post("/api/watch-party", async (req, res) => {
    try {
      // Kullanıcı oturumunu kontrol et ve bir varsayılan kullanıcı ID'si ata
      const userId = req.isAuthenticated() ? req.user!.id : req.body.userId || 1;
      
      // Rastgele bir oda kodu oluştur (eğer gönderilmemişse)
      if (!req.body.roomCode) {
        req.body.roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
      
      const watchParty = await storage.createWatchParty({
        ...req.body,
        creatorId: userId,
        isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true
      });
      
      // Oluşturan kullanıcıyı otomatik olarak izleme partisine ekle
      await storage.addParticipantToParty(watchParty.id, userId);
      
      res.status(201).json(watchParty);
    } catch (error) {
      console.error("İzleme partisi oluşturma hatası:", error);
      res.status(500).json({ message: "İzleme partisi oluşturulurken bir hata oluştu" });
    }
  });

  app.get("/api/watch-party/:code", async (req, res) => {
    try {
      const code = req.params.code;
      const watchParty = await storage.getWatchPartyByCode(code);
      
      if (!watchParty) {
        return res.status(404).json({ message: "İzleme partisi bulunamadı" });
      }
      
      res.json(watchParty);
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu" });
    }
  });

  // Cross-platform progress sync endpoint
  app.get("/api/sync-progress", async (req, res) => {
    try {
      // Kullanıcı oturumunu kontrol et ve bir varsayılan kullanıcı ID'si ata
      const userId = req.isAuthenticated() ? req.user!.id : parseInt(req.query.userId as string) || 1;
      
      // Get all watch history for this user
      const allProgress = await storage.getWatchHistory(userId);
      
      // Format response to include only necessary info for sync
      const progressData = allProgress.map(history => ({
        animeId: history.animeId,
        episodeId: history.episodeId,
        progress: history.progress,
        duration: history.duration,
        lastWatched: history.lastWatched
      }));
      
      res.json(progressData);
    } catch (error) {
      res.status(500).json({ message: "İzleme geçmişi senkronizasyonu sırasında bir hata oluştu" });
    }
  });

  // Recommendations endpoint - enhanced to use watch history and AI
  app.get("/api/recommendations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get existing recommendations if available
      const recommendations = await storage.getUserRecommendations(userId);
      
      // If no recommendations exist, get watch history to generate some
      if (recommendations.length === 0) {
        const watchHistory = await storage.getWatchHistory(userId);
        
        // In a real implementation, this would use the watch history data to 
        // calculate recommendations based on genre, completion rate, etc.
        // For now, we'll just use the anime IDs from watch history
        const watchedAnimeIds = Array.from(new Set(watchHistory.map(item => item.animeId)));
        
        // Save the watchedAnimeIds as recommendations
        if (watchedAnimeIds.length > 0) {
          await storage.updateUserRecommendations(userId, watchedAnimeIds);
          return res.json({ animeIds: watchedAnimeIds });
        }
      }
      
      res.json({ animeIds: recommendations });
    } catch (error) {
      res.status(500).json({ message: "Önerileri getirirken bir hata oluştu" });
    }
  });
  
  // AI powered recommendation endpoints - no authentication required
  app.get("/api/ai/recommendations", async (req, res) => {
    try {
      // Kullanıcı oturumunu kontrol et ve bir varsayılan kullanıcı ID'si ata
      const userId = req.isAuthenticated() ? req.user!.id : 1;
      const recommendations = await aiService.getPersonalizedRecommendations(userId);
      res.json({ recommendations });
    } catch (error) {
      console.error("AI recommendation error:", error);
      res.status(500).json({ message: "Öneriler alınırken bir hata oluştu" });
    }
  });
  
  app.get("/api/ai/what-to-watch", async (req, res) => {
    try {
      // Kullanıcı oturumunu kontrol et ve bir varsayılan kullanıcı ID'si ata
      const userId = req.isAuthenticated() ? req.user!.id : 1;
      const recommendation = await aiService.getWhatToWatchToday(userId);
      res.json({ recommendation });
    } catch (error) {
      console.error("AI watch recommendation error:", error);
      res.status(500).json({ message: "Öneri alınırken bir hata oluştu" });
    }
  });
  
  app.get("/api/ai/anime-analysis", async (req, res) => {
    try {
      const animeId = parseInt(req.query.animeId as string);
      const title = req.query.title as string;
      const genres = (req.query.genres as string || '').split(',');
      
      if (isNaN(animeId) || !title) {
        return res.status(400).json({ message: "Geçersiz anime bilgileri" });
      }
      
      const analysis = await aiService.getAnimeAnalysis(animeId, title, genres);
      res.json(analysis);
    } catch (error) {
      console.error("AI anime analysis error:", error);
      res.status(500).json({ message: "Anime analizi alınırken bir hata oluştu" });
    }
  });
  
  // Episode Comments API
  app.get("/api/anime/:animeId/episode/:episodeId/comments", async (req, res) => {
    try {
      const animeId = parseInt(req.params.animeId);
      const episodeId = parseInt(req.params.episodeId);
      
      if (isNaN(animeId) || isNaN(episodeId)) {
        return res.status(400).json({ message: "Geçersiz anime veya bölüm ID" });
      }
      
      const comments = await storage.getEpisodeComments(animeId, episodeId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Yorumlar alınırken bir hata oluştu" });
    }
  });
  
  app.post("/api/comments", async (req, res) => {
    try {
      const validation = insertEpisodeCommentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Geçersiz yorum verisi", errors: validation.error.errors });
      }
      
      // Kullanıcı oturumunu kontrol et ve varsayılan bilgiler ata
      const userId = req.isAuthenticated() ? req.user!.id : req.body.userId || 1;
      const username = req.isAuthenticated() ? req.user!.username : req.body.username || 'Misafir';
      
      const comment = await storage.addComment({
        ...req.body,
        userId,
        username
      });
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Yorum ekleme hatası:", error);
      res.status(500).json({ message: "Yorum eklenirken bir hata oluştu" });
    }
  });
  
  app.get("/api/comments/:id/replies", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "Geçersiz yorum ID" });
      }
      
      const replies = await storage.getReplies(commentId);
      res.json(replies);
    } catch (error) {
      res.status(500).json({ message: "Yanıtlar alınırken bir hata oluştu" });
    }
  });
  
  app.put("/api/comments/:id", isAuthenticated, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "Geçersiz yorum ID" });
      }
      
      // Yorum sahibinin doğrulanması
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Yorum bulunamadı" });
      }
      
      if (comment.userId !== req.user!.id) {
        return res.status(403).json({ message: "Bu yorumu düzenleme yetkiniz yok" });
      }
      
      const updatedComment = await storage.updateComment(commentId, req.body);
      res.json(updatedComment);
    } catch (error) {
      res.status(500).json({ message: "Yorum güncellenirken bir hata oluştu" });
    }
  });
  
  app.delete("/api/comments/:id", isAuthenticated, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "Geçersiz yorum ID" });
      }
      
      // Yorum sahibinin doğrulanması
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Yorum bulunamadı" });
      }
      
      if (comment.userId !== req.user!.id) {
        return res.status(403).json({ message: "Bu yorumu silme yetkiniz yok" });
      }
      
      const success = await storage.deleteComment(commentId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Yorum silinemedi" });
      }
    } catch (error) {
      res.status(500).json({ message: "Yorum silinirken bir hata oluştu" });
    }
  });
  
  // Episode Reactions API
  app.get("/api/anime/:animeId/episode/:episodeId/reactions", async (req, res) => {
    try {
      const animeId = parseInt(req.params.animeId);
      const episodeId = parseInt(req.params.episodeId);
      
      if (isNaN(animeId) || isNaN(episodeId)) {
        return res.status(400).json({ message: "Geçersiz anime veya bölüm ID" });
      }
      
      const reactions = await storage.getEpisodeReactions(animeId, episodeId);
      res.json(reactions);
    } catch (error) {
      res.status(500).json({ message: "Reaksiyonlar alınırken bir hata oluştu" });
    }
  });
  
  app.post("/api/reactions", isAuthenticated, async (req, res) => {
    try {
      const validation = insertEpisodeReactionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Geçersiz reaksiyon verisi", errors: validation.error.errors });
      }
      
      const userId = req.user!.id;
      const reaction = await storage.addReaction({
        ...req.body,
        userId
      });
      
      res.status(201).json(reaction);
    } catch (error) {
      res.status(500).json({ message: "Reaksiyon eklenirken bir hata oluştu" });
    }
  });
  
  // Episode Polls API
  app.get("/api/anime/:animeId/episode/:episodeId/polls", async (req, res) => {
    try {
      const animeId = parseInt(req.params.animeId);
      const episodeId = parseInt(req.params.episodeId);
      
      if (isNaN(animeId) || isNaN(episodeId)) {
        return res.status(400).json({ message: "Geçersiz anime veya bölüm ID" });
      }
      
      const polls = await storage.getEpisodePolls(animeId, episodeId);
      res.json(polls);
    } catch (error) {
      res.status(500).json({ message: "Anketler alınırken bir hata oluştu" });
    }
  });
  
  app.post("/api/polls", isAuthenticated, async (req, res) => {
    try {
      const validation = insertEpisodePollSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Geçersiz anket verisi", errors: validation.error.errors });
      }
      
      const userId = req.user!.id;
      const poll = await storage.createPoll({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json(poll);
    } catch (error) {
      res.status(500).json({ message: "Anket oluşturulurken bir hata oluştu" });
    }
  });
  
  app.get("/api/polls/:id", async (req, res) => {
    try {
      const pollId = parseInt(req.params.id);
      if (isNaN(pollId)) {
        return res.status(400).json({ message: "Geçersiz anket ID" });
      }
      
      const poll = await storage.getPollById(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Anket bulunamadı" });
      }
      
      res.json(poll);
    } catch (error) {
      res.status(500).json({ message: "Anket alınırken bir hata oluştu" });
    }
  });
  
  app.put("/api/polls/:id", isAuthenticated, async (req, res) => {
    try {
      const pollId = parseInt(req.params.id);
      if (isNaN(pollId)) {
        return res.status(400).json({ message: "Geçersiz anket ID" });
      }
      
      // Anket sahibinin doğrulanması
      const poll = await storage.getPollById(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Anket bulunamadı" });
      }
      
      if (poll.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Bu anketi düzenleme yetkiniz yok" });
      }
      
      const updatedPoll = await storage.updatePoll(pollId, req.body);
      res.json(updatedPoll);
    } catch (error) {
      res.status(500).json({ message: "Anket güncellenirken bir hata oluştu" });
    }
  });
  
  // Poll Options API
  app.get("/api/polls/:id/options", async (req, res) => {
    try {
      const pollId = parseInt(req.params.id);
      if (isNaN(pollId)) {
        return res.status(400).json({ message: "Geçersiz anket ID" });
      }
      
      const options = await storage.getPollOptions(pollId);
      res.json(options);
    } catch (error) {
      res.status(500).json({ message: "Anket seçenekleri alınırken bir hata oluştu" });
    }
  });
  
  app.post("/api/poll-options", isAuthenticated, async (req, res) => {
    try {
      const validation = insertPollOptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Geçersiz seçenek verisi", errors: validation.error.errors });
      }
      
      // Anket sahibinin doğrulanması
      const poll = await storage.getPollById(req.body.pollId);
      if (!poll) {
        return res.status(404).json({ message: "Anket bulunamadı" });
      }
      
      if (poll.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Bu ankete seçenek ekleme yetkiniz yok" });
      }
      
      const option = await storage.addPollOption(req.body);
      res.status(201).json(option);
    } catch (error) {
      res.status(500).json({ message: "Seçenek eklenirken bir hata oluştu" });
    }
  });
  
  // Poll Votes API
  app.get("/api/polls/:id/votes", async (req, res) => {
    try {
      const pollId = parseInt(req.params.id);
      if (isNaN(pollId)) {
        return res.status(400).json({ message: "Geçersiz anket ID" });
      }
      
      const votes = await storage.getPollVotes(pollId);
      res.json(votes);
    } catch (error) {
      res.status(500).json({ message: "Anket oyları alınırken bir hata oluştu" });
    }
  });
  
  app.post("/api/poll-votes", isAuthenticated, async (req, res) => {
    try {
      const validation = insertPollVoteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Geçersiz oy verisi", errors: validation.error.errors });
      }
      
      const userId = req.user!.id;
      const vote = await storage.addPollVote({
        ...req.body,
        userId
      });
      
      res.status(201).json(vote);
    } catch (error) {
      res.status(500).json({ message: "Oy verilirken bir hata oluştu" });
    }
  });

  // WebSockets for watch party - with improved error handling
  try {
    const wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws',
      perMessageDeflate: false // Disable compression for better compatibility
    });
    
    console.log("WebSocket server initialized");
    
    wss.on('connection', (ws) => {
      console.log("WebSocket client connected");
      
      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
      });
      
      ws.on('message', async (data) => {
        try {
          let message;
          try {
            message = JSON.parse(data.toString());
          } catch (e) {
            console.log("WebSocket message received:", data.toString());
            // Eski stil mesaj formatı için
            if (data.toString() === 'join' || data.toString() === 'sync' || data.toString() === 'chat') {
              message = { type: data.toString() };
            } else {
              return; // Geçersiz mesaj, işleme devam etmeyin
            }
          }
          
          console.log("WebSocket message received:", message.type || "unknown");
          
          if (message.type === 'join') {
            // Handle join party - güvenlik kontrolü ekleyin
            const partyId = message.partyId || 1; // Fallback party ID
            const userId = message.userId || 1;   // Fallback user ID
            
            try {
              await storage.addParticipantToParty(partyId, userId);
              
              // Broadcast to all clients in this party
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'participant_joined',
                    partyId,
                    userId,
                    username: message.username || `Kullanıcı ${userId}`
                  }));
                }
              });
            } catch (err) {
              console.error("Error adding participant to party:", err);
            }
          } 
          else if (message.type === 'sync') {
            // Handle video sync with error handling
            try {
              const partyId = message.partyId || 1;
              const currentTime = typeof message.currentTime === 'number' ? message.currentTime : 0;
              const isPlaying = typeof message.isPlaying === 'boolean' ? message.isPlaying : true;
              
              await storage.updateWatchParty(partyId, { currentTime, isPlaying });
              
              // Broadcast to all clients in this party
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'sync_update',
                    partyId,
                    currentTime,
                    isPlaying
                  }));
                }
              });
            } catch (err) {
              console.error("Error updating watch party sync:", err);
            }
          }
          else if (message.type === 'chat') {
            // Handle chat message with validation
            try {
              const partyId = message.partyId || 1;
              const userId = message.userId || 1;
              const content = message.content || '';
              
              if (!content.trim()) {
                return; // Boş mesajları atla
              }
              
              // Broadcast to all clients in this party
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'chat_message',
                    partyId,
                    userId,
                    username: message.username || `Kullanıcı ${userId}`,
                    content,
                    timestamp: new Date().toISOString()
                  }));
                }
              });
            } catch (err) {
              console.error("Error broadcasting chat message:", err);
            }
          }
          // Etkileşimli özellikler için WebSocket mesajları
          else if (message.type === 'reaction') {
            try {
              // Yeni reaksiyon ekle ve tüm görüntüleyenlere yayınla
              const animeId = message.animeId || 1;
              const episodeId = message.episodeId || 1;
              const userId = message.userId || 1;
              const reaction = message.reaction || '👍';
              const timestamp = message.timestamp || Date.now();
              
              const storedReaction = await storage.addReaction({
                userId,
                animeId,
                episodeId,
                reaction,
                timestamp
              });
              
              // Aynı bölümü izleyen herkese yayınla
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'new_reaction',
                    reaction: storedReaction
                  }));
                }
              });
            } catch (err) {
              console.error("Error processing reaction:", err);
            }
          }
          else if (message.type === 'comment') {
            try {
              // Yeni yorum ekle ve tüm görüntüleyenlere yayınla
              const animeId = message.animeId || 1;
              const episodeId = message.episodeId || 1;
              const userId = message.userId || 1;
              const content = message.content || '';
              const timestamp = message.timestamp || Date.now();
              const parentId = message.parentId || null;
              
              if (!content.trim()) {
                return; // Boş yorumları atla
              }
              
              const comment = await storage.addComment({
                userId,
                animeId,
                episodeId,
                content,
                timestamp,
                parentId
              });
              
              // Aynı bölümü izleyen herkese yayınla
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'new_comment',
                    comment
                  }));
                }
              });
            } catch (err) {
              console.error("Error processing comment:", err);
            }
          }
          else if (message.type === 'poll_vote') {
            try {
              // Kullanıcının ankete oyunu kaydet ve güncel oy durumunu tüm kullanıcılara yayınla
              const pollId = message.pollId || 1;
              const optionId = message.optionId || 1;
              const userId = message.userId || 1;
              
              await storage.addPollVote({
                pollId,
                optionId,
                userId
              });
              
              // Güncel oy sonuçlarını getir
              const votes = await storage.getPollVotes(pollId);
              const options = await storage.getPollOptions(pollId);
              
              if (!options || options.length === 0) {
                console.error("No poll options found for poll ID:", pollId);
                return;
              }
              
              // Oy sonuçlarını hesapla
              const results = options.map(option => {
                const optionVotes = votes.filter(vote => vote.optionId === option.id).length;
                return {
                  optionId: option.id,
                  text: option.text,
                  count: optionVotes
                };
              });
              
              // Aynı bölümü izleyen herkese yayınla
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'poll_results',
                    pollId,
                    results
                  }));
                }
              });
            } catch (err) {
              console.error("Error processing poll vote:", err);
            }
          }
        } catch (error) {
          console.error('WebSocket message processing error:', error);
        }
      });
    });
    
    wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  } catch (error) {
    console.error('WebSocket initialization error:', error);
  }

  // Fansub API routes
  // Tüm fansub gruplarını getir
  app.get("/api/fansubs", async (req, res) => {
    try {
      const fansubs = await storage.getAllFansubs();
      res.json(fansubs);
    } catch (error) {
      console.error("Fansub listesi getirme hatası:", error);
      res.status(500).json({ message: "Fansub grupları getirilirken bir hata oluştu" });
    }
  });

  // Belirli bir fansub grubunu getir
  app.get("/api/fansubs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz fansub ID" });
      }
      
      const fansub = await storage.getFansub(id);
      if (!fansub) {
        return res.status(404).json({ message: "Fansub grubu bulunamadı" });
      }
      
      res.json(fansub);
    } catch (error) {
      console.error("Fansub detay hatası:", error);
      res.status(500).json({ message: "Fansub detayları getirilirken bir hata oluştu" });
    }
  });

  // Yeni fansub grubu ekle (sadece adminler)
  app.post("/api/fansubs", isAdmin, async (req, res) => {
    try {
      const validation = insertFansubSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz fansub verisi", 
          errors: validation.error.errors 
        });
      }
      
      const fansub = await storage.createFansub({
        ...req.body,
      });
      
      res.status(201).json(fansub);
    } catch (error) {
      console.error("Fansub oluşturma hatası:", error);
      res.status(500).json({ message: "Fansub oluşturulurken bir hata oluştu" });
    }
  });

  // Fansub grubunu güncelle (sadece adminler)
  app.put("/api/fansubs/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz fansub ID" });
      }
      
      const updatedFansub = await storage.updateFansub(id, req.body);
      if (!updatedFansub) {
        return res.status(404).json({ message: "Fansub grubu bulunamadı" });
      }
      
      res.json(updatedFansub);
    } catch (error) {
      console.error("Fansub güncelleme hatası:", error);
      res.status(500).json({ message: "Fansub güncellenirken bir hata oluştu" });
    }
  });

  // Fansub grubunu sil (sadece adminler)
  app.delete("/api/fansubs/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz fansub ID" });
      }
      
      const success = await storage.deleteFansub(id);
      if (!success) {
        return res.status(404).json({ message: "Fansub grubu bulunamadı veya silinemedi" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Fansub silme hatası:", error);
      res.status(500).json({ message: "Fansub silinirken bir hata oluştu" });
    }
  });

  // Fansub video kaynakları API rotaları
  // Bir anime bölümü için tüm fansub kaynaklarını getir
  app.get("/api/fansub-sources", async (req, res) => {
    try {
      const animeId = parseInt(req.query.animeId as string);
      const episodeId = parseInt(req.query.episodeId as string);
      
      if (isNaN(animeId) || isNaN(episodeId)) {
        return res.status(400).json({ 
          message: "Geçersiz anime ID veya bölüm ID" 
        });
      }
      
      const sources = await storage.getFansubSources(animeId, episodeId);
      res.json(sources);
    } catch (error) {
      console.error("Fansub kaynakları getirme hatası:", error);
      res.status(500).json({ 
        message: "Fansub kaynakları getirilirken bir hata oluştu" 
      });
    }
  });
  
  // Anime bölümü için fansub kaynaklarını detayları ile birlikte getir
  app.get("/api/fansub-sources-with-details", async (req, res) => {
    try {
      const animeId = parseInt(req.query.animeId as string);
      const episodeId = parseInt(req.query.episodeId as string);
      
      if (isNaN(animeId) || isNaN(episodeId)) {
        return res.status(400).json({ 
          message: "Geçersiz anime ID veya bölüm ID" 
        });
      }
      
      const sourcesWithDetails = await storage.getFansubSourcesWithDetails(animeId, episodeId);
      res.json(sourcesWithDetails);
    } catch (error) {
      console.error("Fansub kaynaklarını detaylarıyla getirme hatası:", error);
      res.status(500).json({ 
        message: "Fansub kaynakları detaylarıyla getirilirken bir hata oluştu" 
      });
    }
  });

  // Belirli bir fansub kaynağını getir
  app.get("/api/fansub-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz kaynak ID" });
      }
      
      const source = await storage.getFansubSource(id);
      if (!source) {
        return res.status(404).json({ message: "Fansub kaynağı bulunamadı" });
      }
      
      res.json(source);
    } catch (error) {
      console.error("Fansub kaynak detay hatası:", error);
      res.status(500).json({ 
        message: "Fansub kaynak detayları getirilirken bir hata oluştu" 
      });
    }
  });

  // Yeni fansub kaynağı ekle (sadece adminler)
  app.post("/api/fansub-sources", isAdmin, async (req, res) => {
    try {
      const validation = insertFansubSourceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz fansub kaynak verisi", 
          errors: validation.error.errors 
        });
      }
      
      const source = await storage.createFansubSource({
        ...req.body,
      });
      
      res.status(201).json(source);
    } catch (error) {
      console.error("Fansub kaynak oluşturma hatası:", error);
      res.status(500).json({ 
        message: "Fansub kaynağı oluşturulurken bir hata oluştu" 
      });
    }
  });

  // Fansub kaynağını güncelle (sadece adminler)
  app.put("/api/fansub-sources/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz kaynak ID" });
      }
      
      const updatedSource = await storage.updateFansubSource(id, req.body);
      if (!updatedSource) {
        return res.status(404).json({ message: "Fansub kaynağı bulunamadı" });
      }
      
      res.json(updatedSource);
    } catch (error) {
      console.error("Fansub kaynak güncelleme hatası:", error);
      res.status(500).json({ 
        message: "Fansub kaynağı güncellenirken bir hata oluştu" 
      });
    }
  });

  // Fansub kaynağını sil (sadece adminler)
  app.delete("/api/fansub-sources/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz kaynak ID" });
      }
      
      const success = await storage.deleteFansubSource(id);
      if (!success) {
        return res.status(404).json({ 
          message: "Fansub kaynağı bulunamadı veya silinemedi" 
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Fansub kaynak silme hatası:", error);
      res.status(500).json({ message: "Fansub kaynağı silinirken bir hata oluştu" });
    }
  });

  return httpServer;
}
