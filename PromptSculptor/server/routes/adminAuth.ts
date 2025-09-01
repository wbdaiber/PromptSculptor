import express from 'express';
import passport from 'passport';
import { setupAdminOAuth, getAdminOAuthConfig, requireAdminAuth } from '../config/oauth';

const router = express.Router();

// Initialize OAuth configuration
try {
  const oauthConfig = getAdminOAuthConfig();
  setupAdminOAuth(oauthConfig);
} catch (error) {
  console.error('Failed to initialize admin OAuth:', error);
}

// Start Google OAuth flow
router.get('/google', (req, res, next) => {
  // Store the intended redirect URL in session
  const returnTo = req.query.returnTo as string;
  if (returnTo) {
    (req.session as any).adminReturnTo = returnTo;
  }
  
  passport.authenticate('google-admin', {
    scope: ['profile', 'email'],
    prompt: 'select_account' // Force account selection
  })(req, res, next);
});

// Handle Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google-admin', { 
    failureRedirect: '/app/admin/login?error=oauth_failed'
  }),
  (req, res) => {
    // Successful authentication
    const returnTo = (req.session as any).adminReturnTo || '/app/admin';
    delete (req.session as any).adminReturnTo;
    
    res.redirect(returnTo);
  }
);

// Get current admin user info
router.get('/me', requireAdminAuth, (req, res) => {
  const adminUser = req.user!;
  res.json({
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    picture: adminUser.picture,
    provider: adminUser.provider
  });
});

// Admin logout
router.post('/logout', requireAdminAuth, (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    // Destroy the session
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('Session destroy error:', destroyErr);
        return res.status(500).json({ error: 'Session cleanup failed' });
      }
      
      res.json({ message: 'Logout successful' });
    });
  });
});

// Check admin authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.provider === 'google') {
    const adminUser = req.user;
    res.json({
      authenticated: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        picture: adminUser.picture,
        provider: adminUser.provider
      }
    });
  } else {
    res.json({
      authenticated: false,
      authUrl: '/api/admin/auth/google'
    });
  }
});

// Test endpoint to check admin access
router.get('/test', requireAdminAuth, (req, res) => {
  const adminUser = req.user!;
  res.json({
    message: 'Admin access confirmed',
    user: adminUser,
    timestamp: new Date().toISOString()
  });
});

export default router;