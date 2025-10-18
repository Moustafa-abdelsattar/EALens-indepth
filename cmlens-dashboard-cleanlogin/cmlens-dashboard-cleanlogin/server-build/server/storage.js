import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { users, } from "../shared/schema.js";
import { db } from "./db.js";
const memoryUsers = new Map();
export class DatabaseStorage {
    database = db;
    async getUser(id) {
        const [user] = await this.database.select().from(users).where(eq(users.id, id));
        return user;
    }
    async upsertUser(userData) {
        const [user] = await this.database
            .insert(users)
            .values(userData)
            .onConflictDoUpdate({
            target: users.id,
            set: {
                ...userData,
                updatedAt: new Date(),
            },
        })
            .returning();
        return user;
    }
}
class MemoryStorage {
    async getUser(id) {
        return memoryUsers.get(id);
    }
    async upsertUser(userData) {
        const id = userData.id ?? randomUUID();
        const existing = memoryUsers.get(id);
        const now = new Date();
        const record = {
            id,
            email: userData.email ?? existing?.email ?? null,
            firstName: userData.firstName ?? existing?.firstName ?? null,
            lastName: userData.lastName ?? existing?.lastName ?? null,
            profileImageUrl: userData.profileImageUrl ?? existing?.profileImageUrl ?? null,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        memoryUsers.set(id, record);
        return record;
    }
}
if (!db) {
    console.warn("[Storage] Falling back to in-memory user store; DATABASE_URL is not configured.");
}
export const storage = db ? new DatabaseStorage() : new MemoryStorage();
