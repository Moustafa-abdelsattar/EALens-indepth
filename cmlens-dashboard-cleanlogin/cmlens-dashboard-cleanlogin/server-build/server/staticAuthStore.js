import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { promisify } from "util";
const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
export class AuthStoreError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
const rawAllowedUsers = [
    { email: "sherifa@51talk.com", role: "user" },
    { email: "abdullahessam@51talk.com", role: "user" },
    { email: "islammohamed@51talk.com", role: "user" },
    { email: "Ahmed@mos.com", role: "admin", displayName: "Ahmed" },
];
function buildDisplayName(email) {
    const [localPart] = email.split("@");
    if (!localPart) {
        return email;
    }
    return localPart
        .split(/[._\-\s]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}
const allowedUsers = rawAllowedUsers.map((entry) => ({
    ...entry,
    email: entry.email.trim(),
    displayName: entry.displayName ?? buildDisplayName(entry.email),
}));
const allowedUserMap = new Map(allowedUsers.map((user) => [normalizeEmail(user.email), user]));
const defaultFeatureVisibility = {
    upload: true,
    agentsPerformance: true,
    teamAnalytics: true,
    targetAnalytics: true,
    meetings: true,
    calls: true,
};
const FEATURE_KEYS = Object.keys(defaultFeatureVisibility);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "auth-store.json");
function nowIso() {
    return new Date().toISOString();
}
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function toPublicUser(user) {
    return {
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        active: user.active,
        hasPassword: Boolean(user.passwordHash),
        lastLoginAt: user.lastLoginAt,
        isAdmin: user.role === "admin",
    };
}
export class StaticAuthStore {
    data = null;
    loading = null;
    async ensureLoaded() {
        if (this.data) {
            return;
        }
        if (!this.loading) {
            this.loading = this.load();
        }
        await this.loading;
    }
    async load() {
        await fs.mkdir(dataDir, { recursive: true });
        try {
            const raw = await fs.readFile(dataFile, "utf8");
            const parsed = JSON.parse(raw);
            this.data = this.normalizeData(parsed);
        }
        catch (error) {
            const err = error;
            if (err.code === "ENOENT") {
                this.data = this.createDefaultData();
                await this.persist();
            }
            else {
                throw error;
            }
        }
        finally {
            this.loading = null;
        }
    }
    createDefaultData() {
        const timestamp = nowIso();
        return {
            users: allowedUsers.map((entry) => ({
                email: entry.email,
                role: entry.role,
                displayName: entry.displayName,
                salt: null,
                passwordHash: null,
                active: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                lastLoginAt: null,
            })),
            featureVisibility: { ...defaultFeatureVisibility },
        };
    }
    normalizeData(data) {
        const timestamp = nowIso();
        const incomingUsers = Array.isArray(data?.users) ? data.users : [];
        const normalizedUsers = [];
        for (const allowed of allowedUsers) {
            const existing = incomingUsers.find((user) => normalizeEmail(user.email) === normalizeEmail(allowed.email));
            normalizedUsers.push({
                email: allowed.email,
                role: allowed.role,
                displayName: allowed.displayName,
                salt: existing?.salt ?? null,
                passwordHash: existing?.passwordHash ?? null,
                active: existing?.active ?? true,
                createdAt: existing?.createdAt ?? timestamp,
                updatedAt: existing?.updatedAt ?? timestamp,
                lastLoginAt: existing?.lastLoginAt ?? null,
            });
        }
        const incomingFeatures = data?.featureVisibility ?? {};
        const normalizedFeatures = { ...defaultFeatureVisibility };
        for (const key of FEATURE_KEYS) {
            if (typeof incomingFeatures[key] === "boolean") {
                normalizedFeatures[key] = incomingFeatures[key];
            }
        }
        return {
            users: normalizedUsers,
            featureVisibility: normalizedFeatures,
        };
    }
    async persist() {
        if (!this.data) {
            return;
        }
        await fs.writeFile(dataFile, JSON.stringify(this.data, null, 2));
    }
    assertAllowed(email) {
        const allowed = allowedUserMap.get(normalizeEmail(email));
        if (!allowed) {
            throw new AuthStoreError("NOT_ALLOWED", "Email is not authorized");
        }
        return allowed;
    }
    async getStoredUser(email) {
        await this.ensureLoaded();
        const allowed = this.assertAllowed(email);
        const normalized = normalizeEmail(allowed.email);
        const user = this.data.users.find((entry) => normalizeEmail(entry.email) === normalized);
        if (user) {
            // Keep role/display name in sync with allowed list.
            user.role = allowed.role;
            user.displayName = allowed.displayName;
            return user;
        }
        const timestamp = nowIso();
        const newUser = {
            email: allowed.email,
            role: allowed.role,
            displayName: allowed.displayName,
            salt: null,
            passwordHash: null,
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastLoginAt: null,
        };
        this.data.users.push(newUser);
        await this.persist();
        return newUser;
    }
    async listUsers() {
        await this.ensureLoaded();
        return this.data.users.map(toPublicUser);
    }
    async getPublicUser(email) {
        const stored = await this.getStoredUser(email).catch(() => undefined);
        if (!stored) {
            return undefined;
        }
        return toPublicUser(stored);
    }
    async signUp(email, password) {
        const user = await this.getStoredUser(email);
        if (!user.active) {
            throw new AuthStoreError("ACCESS_REVOKED", "Access has been revoked. Please contact the administrator.");
        }
        if (user.passwordHash) {
            throw new AuthStoreError("ALREADY_REGISTERED", "This email already has a password. Please sign in.");
        }
        await this.setPassword(user, password);
        return toPublicUser(user);
    }
    async authenticate(email, password) {
        try {
            const user = await this.getStoredUser(email);
            if (!user.active) {
                return { success: false, code: "ACCESS_REVOKED" };
            }
            if (!user.passwordHash || !user.salt) {
                return { success: false, code: "PASSWORD_NOT_SET" };
            }
            const derived = (await scrypt(password, user.salt, KEY_LENGTH));
            const storedHash = Buffer.from(user.passwordHash, "hex");
            if (storedHash.length !== derived.length) {
                return { success: false, code: "INVALID_CREDENTIALS" };
            }
            if (!crypto.timingSafeEqual(storedHash, derived)) {
                return { success: false, code: "INVALID_CREDENTIALS" };
            }
            const timestamp = nowIso();
            user.lastLoginAt = timestamp;
            user.updatedAt = timestamp;
            await this.persist();
            return { success: true, user: toPublicUser(user) };
        }
        catch (error) {
            if (error instanceof AuthStoreError) {
                return { success: false, code: error.code };
            }
            throw error;
        }
    }
    async resetPassword(email, newPassword) {
        const user = await this.getStoredUser(email);
        if (!user.active) {
            throw new AuthStoreError("ACCESS_REVOKED", "Cannot reset password for a revoked account.");
        }
        await this.setPassword(user, newPassword);
        return toPublicUser(user);
    }
    async setAccess(email, active) {
        const user = await this.getStoredUser(email);
        user.active = active;
        user.updatedAt = nowIso();
        if (!active) {
            user.lastLoginAt = null;
        }
        await this.persist();
        return toPublicUser(user);
    }
    async getFeatureVisibility() {
        await this.ensureLoaded();
        return { ...this.data.featureVisibility };
    }
    async updateFeatureVisibility(partial) {
        await this.ensureLoaded();
        for (const key of FEATURE_KEYS) {
            if (typeof partial[key] === "boolean") {
                this.data.featureVisibility[key] = partial[key];
            }
        }
        await this.persist();
        return { ...this.data.featureVisibility };
    }
    async setPassword(user, password) {
        if (!password || password.length < 6) {
            throw new AuthStoreError("INVALID_CREDENTIALS", "Password must be at least 6 characters long.");
        }
        const salt = crypto.randomBytes(16).toString("hex");
        const derived = (await scrypt(password, salt, KEY_LENGTH));
        user.salt = salt;
        user.passwordHash = derived.toString("hex");
        user.updatedAt = nowIso();
        await this.persist();
    }
}
