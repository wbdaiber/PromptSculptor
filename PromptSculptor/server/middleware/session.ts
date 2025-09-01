import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { DatabaseStorage } from '../databaseStorage';
import type { Express, Request, Response, NextFunction } from 'express';
import type { User } from '@shared/schema';

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
        })
      : undefined, // Use default MemoryStore in development
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict', // CSRF protection
    },
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
  
  // Deserialize user from session
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
      
      // Regular database user lookup
      const user = await dbStorage.getUserById(id);
      if (user) {
        done(null, { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          provider: 'local' 
        });
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to extract user ID from session
export function extractUserId(req: Request, res: Response, next: NextFunction) {
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