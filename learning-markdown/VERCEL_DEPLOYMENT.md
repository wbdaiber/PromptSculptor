# Vercel Deployment Guide for PromptSculptor

## Important: Authentication & Session Management in Vercel

This guide addresses the authentication issues you're experiencing in Vercel deployment, including:
- Users being signed out on page refresh
- User templates appearing in demo mode after logout

## Required Environment Variables for Vercel

Add these environment variables in your Vercel project settings:

### Core Configuration
```bash
NODE_ENV=production
DATABASE_URL=your-postgres-connection-string  # Must be a production PostgreSQL database

# CRITICAL: Session Management
SESSION_SECRET=generate-with-openssl-rand-hex-32  # MUST be a secure random string
COOKIE_DOMAIN=.your-domain.com  # Set to your domain (with leading dot for subdomains)

# Security Keys
ENCRYPTION_KEY=generate-64-hex-characters  # For API key encryption
ADMIN_API_KEY=generate-with-openssl-rand-hex-32  # 32+ characters

# Vercel Detection (automatically set by Vercel)
VERCEL=1  # This is automatically set by Vercel
```

### API Keys (Optional - for admin testing)
```bash
OPENAI_API_KEY=your-key-if-needed
ANTHROPIC_API_KEY=your-key-if-needed
GEMINI_API_KEY=your-key-if-needed
```

### Email Configuration (if using password reset)
```bash
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com
APP_URL=https://your-domain.vercel.app  # Your Vercel deployment URL
```

### Admin OAuth (if using Google OAuth)
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_ALLOWED_EMAILS=admin@yourdomain.com
```

## Critical Configuration Changes Made

### 1. Session Cookie Configuration (server/middleware/session.ts)
- Changed `sameSite` from 'strict' to 'lax' for Vercel to handle redirects properly
- Added `proxy: true` setting for Vercel's proxy layer
- Added `domain` cookie setting support for custom domains
- Disabled session pruning for serverless environment

### 2. Authentication Endpoint Fix (server/routes/auth.ts)
- Fixed `/me` endpoint to return user data in correct format: `{ user: {...} }`
- Removed duplicate `/me` route definitions that were causing conflicts

### 3. Database Connection Pooling
- Already optimized for Vercel with single connection (`max: 1`)
- Shorter idle timeout (10 seconds) for serverless functions
- Proper connection timeout for cold starts

## Deployment Checklist

### Before Deploying to Vercel:

1. **Generate Secure Secrets**:
   ```bash
   # Generate SESSION_SECRET
   openssl rand -hex 32
   
   # Generate ENCRYPTION_KEY
   openssl rand -hex 32
   
   # Generate ADMIN_API_KEY
   openssl rand -hex 32
   ```

2. **Database Setup**:
   - Use a production PostgreSQL database (e.g., Vercel Postgres, Supabase, Neon)
   - Ensure the database supports session storage tables
   - Run migrations if needed

3. **Domain Configuration**:
   - If using a custom domain, set `COOKIE_DOMAIN` to your domain
   - Include the leading dot for subdomain support (e.g., `.example.com`)

4. **Session Store**:
   - The app uses PostgreSQL for session storage (not in-memory)
   - This ensures sessions persist across serverless function invocations
   - The `user_sessions` table is created automatically

## Common Issues and Solutions

### Issue 1: Users signed out on page refresh
**Cause**: Session not persisting across serverless invocations
**Solution**: 
- Ensure `DATABASE_URL` is set correctly
- Verify `SESSION_SECRET` is consistent and secure
- Check that cookies are being set with correct domain

### Issue 2: User templates showing in demo mode after logout
**Cause**: Cache invalidation timing and session cleanup
**Solution**: Already fixed by:
- Proper cache clearing in AuthContext logout
- Correct user ID in template query keys
- Fixed `/me` endpoint response format

### Issue 3: Authentication race conditions
**Cause**: Multiple concurrent auth operations
**Solution**: Already implemented operation locking in AuthContext

## Testing After Deployment

1. **Test Session Persistence**:
   - Sign in to your account
   - Refresh the page
   - You should remain signed in

2. **Test Template Segmentation**:
   - Create a template while signed in
   - Sign out
   - Verify your templates don't appear in demo mode
   - Sign back in
   - Verify your templates reappear

3. **Test Cross-Tab Session**:
   - Sign in on one tab
   - Open another tab
   - You should be signed in on both tabs

## Monitoring

Check the Vercel function logs for any errors:
- Session creation/destruction issues
- Database connection errors
- Cookie setting problems

## Additional Notes

- The `VERCEL` environment variable is automatically set by Vercel
- The app detects Vercel environment and adjusts configurations accordingly
- Session cookies are set with 24-hour expiration
- Database connections are optimized for serverless (single connection, short timeout)

## Support

If issues persist after following this guide:
1. Check Vercel function logs for specific errors
2. Verify all environment variables are set correctly
3. Ensure database is accessible from Vercel
4. Check browser console for client-side errors