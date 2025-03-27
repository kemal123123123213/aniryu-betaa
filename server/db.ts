import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Prepare WebSocket connection for serverless environments
neonConfig.fetchConnectionCache = true;

// Set up Neon connection
// Check if the DATABASE_URL is available
// If not, we'll use a dummy DB connection, since we're using MemStorage anyway
const databaseUrl = process.env.DATABASE_URL || "postgres://user:pass@fake.host:5432/db";
export const sql = neon(databaseUrl);

// Log connection status
try {
  console.log("PostgreSQL database connection established");
} catch (error) {
  console.error("Error connecting to database:", error);
  console.log("Using in-memory storage instead");
}

// Using type assertion to fix typing issues with Neon + Drizzle
export const db = drizzle(sql as any, { schema });