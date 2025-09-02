import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import helmet from 'helmet';
import cors from 'cors';
import { registerRoutes } from "../server/routes.js";
import { validateEnv } from "../server/config/env.js";
import { generalLimiter } from "../server/middleware/rateLimiter.js";

const app = express();

// Trust proxy for Vercel deployment (required for rate limiting and client IP detection)
app.set('trust proxy', true);

// Security middleware - MUST come before other middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for React inline styles
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for development
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGINS?.split(',') || ['https://markdownpromptcreator.com']
    : ['http://localhost:5001', 'http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parser configuration with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

// Initialize app asynchronously
let initialized = false;
async function initializeApp() {
  if (initialized) return;
  
  // Validate environment variables
  validateEnv();
  
  // Register routes
  await registerRoutes(app);
  
  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // SECURE: Generate unique error ID for tracking without exposing details
    const errorId = Date.now().toString(36);
    const status = err.status || err.statusCode || 500;
    
    // SECURE: Log error details server-side for debugging
    console.error(`Error ${errorId}:`, {
      message: err.message,
      status,
      timestamp: new Date().toISOString(),
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });

    // SECURE: Return sanitized error response to client
    res.status(status).json({ 
      error: status >= 500 ? 'Internal server error' : (err.message || 'An error occurred'),
      errorId: process.env.NODE_ENV === 'development' ? errorId : undefined
    });
  });
  
  initialized = true;
}

// Export for Vercel
export default async (req: Request, res: Response) => {
  await initializeApp();
  app(req, res);
};