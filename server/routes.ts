import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { insertWatchHistorySchema, insertFavoriteSchema } from "@shared/schema";

function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Giriş yapmalısınız" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  const httpServer = createServer(app);

  // Watch history routes
  app.get("/api/watch-history", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const history = await storage.getWatchHistory(userId);
    res.json(history);
  });

  app.post("/api/watch-history", isAuthenticated, async (req, res) => {
    try {
      const validation = insertWatchHistorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Geçersiz izleme verisi" });
      }

      const userId = req.user!.id;
      const watchHistory = await storage.addWatchHistory({
        ...req.body,
        userId
      });
      
      res.status(201).json(watchHistory);
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu" });
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
  app.post("/api/watch-party", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const watchParty = await storage.createWatchParty({
        ...req.body,
        creatorId: userId
      });
      
      res.status(201).json(watchParty);
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu" });
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

  // Recommendations endpoint
  app.get("/api/recommendations", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const recommendations = await storage.getUserRecommendations(userId);
    res.json({ animeIds: recommendations });
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
          const message = JSON.parse(data.toString());
          console.log("WebSocket message received:", message.type);
          
          if (message.type === 'join') {
            // Handle join party
            const { partyId, userId } = message;
            await storage.addParticipantToParty(partyId, userId);
            
            // Broadcast to all clients in this party
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'participant_joined',
                  partyId,
                  userId
                }));
              }
            });
          } 
          else if (message.type === 'sync') {
            // Handle video sync
            const { partyId, currentTime, isPlaying } = message;
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
          }
          else if (message.type === 'chat') {
            // Handle chat message
            const { partyId, userId, content } = message;
            
            // Broadcast to all clients in this party
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'chat_message',
                  partyId,
                  userId,
                  content,
                  timestamp: new Date().toISOString()
                }));
              }
            });
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

  return httpServer;
}
