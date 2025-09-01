import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Request } from 'express';

// Admin OAuth configuration
export interface AdminOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  allowedEmails: string[];
}

// Admin user interface for OAuth
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google';
}

// Setup Google OAuth strategy for admin authentication
export function setupAdminOAuth(config: AdminOAuthConfig) {
  passport.use('google-admin', new GoogleStrategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: config.callbackURL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from Google profile
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      const picture = profile.photos?.[0]?.value;
      
      if (!email) {
        return done(new Error('No email found in Google profile'), false);
      }
      
      // Check if email is in allowed admin list
      if (!config.allowedEmails.includes(email)) {
        return done(new Error(`Access denied: ${email} is not authorized for admin access`), false);
      }
      
      // Create admin user object with google: prefix to distinguish from regular users
      const adminUser: AdminUser = {
        id: `google:${profile.id}`,
        email,
        name,
        picture,
        provider: 'google'
      };
      
      return done(null, adminUser);
    } catch (error) {
      return done(error, false);
    }
  }));
  
  // Note: We'll use the existing session serialization from middleware/session.ts
  // The OAuth strategy will integrate with the existing Passport setup
}

// Middleware to check if user is authenticated admin
export function requireAdminAuth(req: Request, res: any, next: any) {
  // Check if user is authenticated and is an admin user
  if (req.isAuthenticated() && req.user && req.user.provider === 'google') {
    return next();
  }
  
  return res.status(401).json({
    error: 'Admin authentication required',
    message: 'Please authenticate with an authorized admin Google account',
    authUrl: '/api/admin/auth/google'
  });
}

// Get admin OAuth configuration from environment
export function getAdminOAuthConfig(): AdminOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.APP_URL || 'http://localhost:5001';
  const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS?.split(',').map(email => email.trim()) || [];
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.');
  }
  
  if (allowedEmails.length === 0) {
    throw new Error('No admin emails configured. Please set ADMIN_ALLOWED_EMAILS in environment variables.');
  }
  
  return {
    clientId,
    clientSecret,
    callbackURL: `${baseUrl}/api/admin/auth/google/callback`,
    allowedEmails
  };
}