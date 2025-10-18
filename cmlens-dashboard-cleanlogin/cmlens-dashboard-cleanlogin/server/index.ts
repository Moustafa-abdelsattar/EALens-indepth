import 'dotenv/config';
import cors from "cors";
import express from "express";
import { registerRoutes } from "./routes";

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Enable CORS with credentials for session sharing
// In production, allow Railway domain; in development, allow localhost:5000
const allowedOrigins = isProduction
  ? [
      'https://cmlens-dashboard-production.up.railway.app',
      process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : null
    ].filter(Boolean)
  : ['http://localhost:5000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (origin.includes('railway.app')) {
      // Allow any Railway domain
      callback(null, true);
    } else if (!isProduction) {
      // Allow all in development
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function startServer() {
  try {
    console.log("Setting up routes...");
    const server = await registerRoutes(app);
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend: http://localhost:5000`);
      console.log(`🔧 Backend API: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();