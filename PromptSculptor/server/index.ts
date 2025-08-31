import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import helmet from 'helmet';
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { validateEnv } from "./config/env";
import { generalLimiter } from "./middleware/rateLimiter";
import { scheduleTokenCleanup } from "./services/tokenCleanupService.js";
import { UserCleanupService } from "./services/userCleanupService";


const app = express();

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
    ? process.env.CORS_ORIGINS?.split(',') || ['https://yourdomain.com']
    : ['http://localhost:5001', 'http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parser configuration with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // SECURE: Log only essential request metadata, never response content
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // SECURE: Only include additional details in development mode
      if (process.env.NODE_ENV === 'development') {
        // In development, we can show more info but still avoid sensitive response data
        const safeLogLine = logLine + (res.statusCode >= 400 ? ' [ERROR]' : '');
        log(safeLogLine);
      } else {
        // In production, log minimal information
        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  // SECURE: Validate environment variables on startup
  validateEnv();
  
  // Schedule automatic token cleanup (every 4 hours in production, 1 hour in development)
  const cleanupInterval = process.env.NODE_ENV === 'production' ? 240 : 60; // minutes
  const stopCleanup = scheduleTokenCleanup(cleanupInterval);
  
  // Start user cleanup service for soft-deleted users
  UserCleanupService.start();
  
  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully...');
    stopCleanup();
    UserCleanupService.stop();
  });
  
  process.on('SIGINT', () => {
    log('SIGINT received, shutting down gracefully...');
    stopCleanup();
    UserCleanupService.stop();
    process.exit(0);
  });
  
  const server = await registerRoutes(app);

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
    
    // SECURE: Don't re-throw error (prevents stack trace exposure)
    // Removed: throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Default to 5001 to avoid conflict with macOS AirPlay Receiver (port 5000)
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5001', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
