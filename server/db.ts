import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Set up Neon connection
export const sql = neon(process.env.DATABASE_URL!);
// Using type assertion to fix typing issues with Neon + Drizzle
export const db = drizzle(sql as any, { schema });