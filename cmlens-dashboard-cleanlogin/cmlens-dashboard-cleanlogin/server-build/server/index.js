import cors from "cors";
import express from "express";
import session from "express-session";
import { registerRoutes } from "./routes.js";
import { StaticAuthStore } from "./staticAuthStore.js";
const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";
const authStore = new StaticAuthStore();
const allowedOrigins = isProduction
    ? process.env.RAILWAY_STATIC_URL
        ? [`https://${process.env.RAILWAY_STATIC_URL}`]
        : []
    : ["http://localhost:5000"];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin) ||
            allowedOrigins.some((allowed) => origin.includes(allowed))) {
            callback(null, true);
        }
        else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (isProduction) {
    app.set("trust proxy", 1);
}
const sessionSecret = process.env.SESSION_SECRET || "cmlens-session-secret";
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
}));
async function startServer() {
    try {
        console.log("Setting up routes...");
        const server = await registerRoutes(app, authStore);
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log("Frontend: http://localhost:5000");
            console.log(`Backend API: http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
