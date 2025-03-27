import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Prepare WebSocket connection for serverless environments
neonConfig.fetchConnectionCache = true;

// Set up Neon connection
export const sql = neon(process.env.DATABASE_URL!);
// Using type assertion to fix typing issues with Neon + Drizzle
export const db = drizzle(sql as any, { schema });