import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { DatabaseStorage } from '../databaseStorage.js';
import type { Express, Request, Response, NextFunction } from 'express';
import type { User } from '../../shared/schema.js';

// Request queuing for authentication operations to prevent race conditions
const authRequestQueue = new Map<string, Promise<void>>();

// User cache to reduce database hits during concurrent requests
interface CachedUser {
  user: Express.User;
  timestamp: number;
}
const userCache = new Map<string, CachedUser>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: string;
      username?: string; // Optional for OAuth users
      email: string;
      name?: string; // For OAuth users
      picture?: string; // For OAuth users
      provider?: 'local' | 'google'; // Authentication provider
    }
    interface Request {
      userId?: string;
    }
    interface Session {
      adminReturnTo?: string;
    }
  }
}

// Session configuration
export function setupSession(app: Express) {
  // Initialize session store
  const PgSession = connectPgSimple(session);
  
  const sessionConfig: session.SessionOptions = {
    store: process.env.DATABASE_URL 
      ? new PgSession({
          conString: process.env.DATABASE_URL,
          tableName: 'user_sessions',
          createTableIfMissing: true,
          // Vercel-optimized settings
          pruneSessionInterval: false, // Disable auto-pruning in serverless
        })
      : undefined, // Use default MemoryStore in development
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.VERCEL ? 'lax' : 'strict', // 'lax' for Vercel to handle redirects
      domain: process.env.COOKIE_DOMAIN, // Set if using custom domain
      path: '/', // Ensure cookie works across all paths
    },
    // Vercel-specific: trust proxy for correct IP and protocol detection
    proxy: process.env.VERCEL === '1' || process.env.NODE_ENV === 'production',
  };
  
  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure Passport strategies
  setupPassport();
}

// Passport configuration
function setupPassport() {
  const dbStorage = new DatabaseStorage();
  
  // Local authentication strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await dbStorage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        const isValid = await dbStorage.verifyPassword(email, password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        return done(null, { id: user.id, username: user.username, email: user.email, provider: 'local' });
      } catch (error) {
        return done(error);
      }
    }
  ));
  
  // Serialize user for session
  passport.serializeUser((user: Express.User, done) => {
    // For admin OAuth users, serialize the full user object
    if (user.provider === 'google' && user.id.startsWith('google:')) {
      done(null, JSON.stringify(user));
    } else {
      // For regular users, just serialize the ID
      done(null, user.id);
    }
  });
  
  // Deserialize user from session with caching and queuing
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Check if this is a serialized admin OAuth user (JSON string)
      if (id.startsWith('{') && id.includes('"provider":"google"')) {
        try {
          const adminUser = JSON.parse(id);
          done(null, adminUser);
          return;
        } catch (parseError) {
          console.error('Failed to parse admin user from session:', parseError);
          done(null, false);
          return;
        }
      }

      // Check cache first
      const cached = userCache.get(id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        done(null, cached.user);
        return;
      }

      // Check if there's an ongoing operation for this user
      if (authRequestQueue.has(id)) {
        await authRequestQueue.get(id);
        // Check cache again after waiting
        const cachedAfterWait = userCache.get(id);
        if (cachedAfterWait && Date.now() - cachedAfterWait.timestamp < CACHE_TTL) {
          done(null, cachedAfterWait.user);
          return;
        }
      }

      // Create promise for this operation
      const operation = (async () => {
        try {
          const user = await dbStorage.getUserById(id);
          if (user) {
            const userObject = { 
              id: user.id, 
              username: user.username, 
              email: user.email, 
              provider: 'local' as const
            };
            
            // Cache the result
            userCache.set(id, {
              user: userObject,
              timestamp: Date.now()
            });
            
            done(null, userObject);
          } else {
            done(null, false);
          }
        } catch (error) {
          done(error);
        } finally {
          authRequestQueue.delete(id);
        }
      })();

      authRequestQueue.set(id, operation);
      await operation;
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to extract user ID from session with request queuing
export function extractUserId(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.sessionID;
  
  // CRITICAL: Always clear userId first to prevent stale data
  req.userId = undefined;
  
  // If there's no session or user, continue without user
  if (!sessionId || !req.user) {
    next();
    return;
  }

  // Check if there's an ongoing auth operation for this session
  if (authRequestQueue.has(sessionId)) {
    // Wait for the ongoing operation to complete
    authRequestQueue.get(sessionId)!.then(() => {
      if (req.user) {
        req.userId = req.user.id;
        
        // Validate user context consistency
        if (req.userId && req.user.id && req.userId !== req.user.id) {
          console.warn(`User context mismatch in session ${sessionId}: ${req.userId} vs ${req.user.id}`);
          req.userId = req.user.id; // Use session as source of truth
        }
      }
      
      // Debug log for troubleshooting user authentication state
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - User ID: ${req.userId || 'ANONYMOUS'} (queued)`);
      }
      
      next();
    }).catch(error => {
      console.error('Session auth operation failed:', error);
      next();
    });
    return;
  }

  // No queued operation, process normally
  if (req.user) {
    req.userId = req.user.id;
  }
  
  // Debug log for troubleshooting user authentication state
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - User ID: ${req.userId || 'ANONYMOUS'}`);
  }
  
  next();
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please log in to access this resource'
  });
}

// Optional authentication middleware
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Just extract user ID if authenticated, don't block
  if (req.user) {
    req.userId = req.user.id;
  }
  next();
}

// Cache cleanup function to prevent memory leaks
export function clearUserCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  userCache.forEach((cached, userId) => {
    if (now - cached.timestamp >= CACHE_TTL) {
      keysToDelete.push(userId);
    }
  });
  
  keysToDelete.forEach(userId => userCache.delete(userId));
}

// Periodic cleanup of expired cache entries
setInterval(clearUserCache, CACHE_TTL);