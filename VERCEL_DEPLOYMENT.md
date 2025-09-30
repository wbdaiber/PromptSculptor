# Vercel Deployment Guide for PromptSculptor

## Important: Authentication & Session Management in Vercel

This guide addresses the authentication issues in Vercel deployment:
- Users being signed out on page refresh
- User templates appearing in demo mode after logout

## Issues Fixed

### Issue 1: Users signed out on page refresh ✅
**Root Cause**: 
- `/me` endpoint returning wrong response format
- Session cookies too restrictive for Vercel's infrastructure

**Solution Applied**:
- Fixed `/me` endpoint to return `{ user: {...} }` format
- Changed cookie `sameSite` from 'strict' to 'lax' for Vercel
- Added proxy trust setting for Vercel's proxy layer
- Added cookie domain and path configuration support

### Issue 2: User templates showing after logout ✅
**Root Cause**: 
- In Vercel's serverless environment, `req.userId` can persist across function invocations
- This causes logged-out users to occasionally see templates from previously authenticated users

**Solution Applied**:
- Always clear `req.userId` at the start of `extractUserId` middleware
- Templates endpoint now validates BOTH `req.userId` AND `req.user` exist
- Added consistency check: `req.user.id === req.userId` before returning user templates
- Added warning logs for inconsistent authentication states

## Code Changes Made

### 1. Session Middleware (`server/middleware/session.ts`)
```typescript
// Always clear userId first to prevent stale data
req.userId = undefined;

// Cookie configuration for Vercel
cookie: {
  sameSite: process.env.VERCEL ? 'lax' : 'strict',
  domain: process.env.COOKIE_DOMAIN,
  path: '/',
}
```

### 2. Authentication Endpoint (`server/routes/auth.ts`)
```typescript
// Fixed response format
res.json({
  user: {
    id: req.user.id,
    email: req.user.email,
    username: req.user.username,
  }
});
```

### 3. Templates Endpoint (`server/routes.ts`)
```typescript
// Double-check authentication consistency
if (req.userId && req.user && req.user.id === req.userId) {
  // Return user templates only if auth is consistent
  const userTemplates = await templateManagementService.getUserTemplates(req.userId);
  res.json([...defaultTemplates, ...userTemplates]);
} else {
  // Return only defaults if auth is inconsistent
  res.json(defaultTemplates);
}
```

## Required Environment Variables for Vercel

Add these in your Vercel project settings:

### Critical for Authentication
```bash
NODE_ENV=production
DATABASE_URL=your-postgres-connection-string  # REQUIRED for session storage
SESSION_SECRET=generate-with-openssl-rand-hex-32  # MUST be consistent
COOKIE_DOMAIN=.your-domain.com  # Optional but recommended for custom domains
```

### Security Keys
```bash
ENCRYPTION_KEY=generate-64-hex-characters  # For API key encryption
ADMIN_API_KEY=generate-with-openssl-rand-hex-32  # 32+ characters
```

### Email Configuration (if using password reset)
```bash
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com
APP_URL=https://your-domain.vercel.app  # Your Vercel deployment URL
```

### API Keys (Optional - for admin testing)
```bash
OPENAI_API_KEY=your-key-if-needed
ANTHROPIC_API_KEY=your-key-if-needed
GEMINI_API_KEY=your-key-if-needed
```

## Generating Secure Secrets

```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY (64 hex chars)
openssl rand -hex 32

# Generate ADMIN_API_KEY
openssl rand -hex 32
```

## Database Requirements

1. **PostgreSQL Database Required**
   - Vercel Postgres, Supabase, Neon, or any PostgreSQL provider
   - Must support session storage tables
   - The `user_sessions` table is created automatically

2. **Connection Pooling**
   - Already optimized for Vercel (single connection, short timeout)
   - No additional configuration needed

## Deployment Checklist

- [ ] Set `DATABASE_URL` to production PostgreSQL
- [ ] Generate and set `SESSION_SECRET` (keep it consistent)
- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_DOMAIN` if using custom domain
- [ ] Generate and set security keys
- [ ] Configure email settings if using password reset
- [ ] Test authentication after deployment

## Testing After Deployment

### 1. Session Persistence Test
- Sign in to your account
- Refresh the page (F5)
- ✅ You should remain signed in

### 2. Template Segmentation Test
- Create a template while signed in
- Sign out
- ✅ Your templates should NOT appear in demo mode
- Sign back in
- ✅ Your templates should reappear

### 3. Cross-Tab Session Test
- Sign in on one tab
- Open another tab
- ✅ You should be signed in on both tabs

### 4. Logout Consistency Test
- Sign in and create a template
- Sign out
- Refresh the page
- ✅ Templates should still not appear

## Monitoring & Debugging

### Check Vercel Function Logs
Look for these specific messages:
- `Inconsistent auth state: userId=X but no user session` - Indicates stale userId (now fixed)
- Session creation/destruction logs
- Database connection errors

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Still signing out on refresh | Verify `SESSION_SECRET` is set and consistent |
| Templates still appearing | Check function logs for "Inconsistent auth state" warnings |
| Cookie errors | Ensure `COOKIE_DOMAIN` matches your domain |
| Database errors | Verify `DATABASE_URL` is accessible from Vercel |

## Architecture Notes

### Serverless Considerations
- Each Vercel function invocation is stateless
- Sessions are stored in PostgreSQL, not memory
- Connection pooling limited to 1 connection
- Request objects can have stale data between invocations (fixed by clearing)

### Security Features
- HTTP-only cookies prevent XSS attacks
- Secure cookies in production (HTTPS only)
- Session validation on every request
- Double authentication checks for sensitive data

## Support

If issues persist after following this guide:
1. Check Vercel function logs for specific errors
2. Verify all environment variables are set correctly
3. Ensure database is accessible from Vercel
4. Check browser console for client-side errors
5. Review browser cookies to ensure they're being set

## Summary

The authentication issues have been fixed by:
1. Properly formatting the `/me` endpoint response
2. Configuring cookies for Vercel's infrastructure
3. Always clearing `req.userId` to prevent stale data
4. Double-checking authentication consistency before returning user data

These changes ensure proper session management in Vercel's serverless environment.