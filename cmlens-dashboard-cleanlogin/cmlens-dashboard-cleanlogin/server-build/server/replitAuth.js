import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage.js";
if (!process.env.REPLIT_DOMAINS) {
    throw new Error("Environment variable REPLIT_DOMAINS not provided");
}
const getOidcConfig = memoize(async () => {
    return await client.discovery(new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"), process.env.REPL_ID);
}, { maxAge: 3600 * 1000 });
export function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: "sessions",
    });
    return session({
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: true,
            maxAge: sessionTtl,
        },
    });
}
function updateUserSession(user, tokens) {
    user.claims = tokens.claims();
    user.access_token = tokens.access_token;
    user.refresh_token = tokens.refresh_token;
    user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
    await storage.upsertUser({
        id: claims["sub"],
        email: claims["email"],
        firstName: claims["first_name"],
        lastName: claims["last_name"],
        profileImageUrl: claims["profile_image_url"],
    });
}
export async function setupAuth(app) {
    app.set("trust proxy", 1);
    app.use(getSession());
    app.use(passport.initialize());
    app.use(passport.session());
    const config = await getOidcConfig();
    const verify = async (tokens, verified) => {
        const user = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
    };
    const domains = process.env.REPLIT_DOMAINS.split(",");
    for (const domain of domains) {
        const strategy = new Strategy({
            name: `replitauth:${domain}`,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
        }, verify);
        passport.use(strategy);
    }
    passport.serializeUser((user, cb) => cb(null, user));
    passport.deserializeUser((user, cb) => cb(null, user));
    // Helper function to get the correct domain for authentication
    const getAuthDomain = (hostname) => {
        // If accessing via localhost, use the first Replit domain
        if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
            return domains[0];
        }
        // Otherwise use the actual hostname
        return hostname;
    };
    app.get("/api/login", (req, res, next) => {
        const authDomain = getAuthDomain(req.hostname);
        passport.authenticate(`replitauth:${authDomain}`, {
            prompt: "login consent",
            scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
    });
    app.get("/api/callback", (req, res, next) => {
        const authDomain = getAuthDomain(req.hostname);
        passport.authenticate(`replitauth:${authDomain}`, {
            successReturnToOrRedirect: "/",
            failureRedirect: "/api/login",
        })(req, res, next);
    });
    app.get("/api/logout", (req, res) => {
        req.logout(() => {
            res.redirect(client.buildEndSessionUrl(config, {
                client_id: process.env.REPL_ID,
                post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href);
        });
    });
}
export const isAuthenticated = async (req, res, next) => {
    const user = req.user;
    if (!req.isAuthenticated() || !user.expires_at) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
        return next();
    }
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
    }
    catch (error) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
};
