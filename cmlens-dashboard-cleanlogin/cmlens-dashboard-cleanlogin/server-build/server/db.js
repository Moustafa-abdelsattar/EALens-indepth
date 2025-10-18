import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.warn("[Database] DATABASE_URL not set; database-backed features will be disabled.");
}
const client = connectionString ? postgres(connectionString) : undefined;
export const db = client ? drizzle(client) : undefined;
