# Vercel Deployment Guide

## Prerequisites ✅
- [x] Production database setup (Neon)
- [x] Environment variables configured
- [x] Build process working
- [x] Vercel configuration created

## Step-by-Step Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 2. Deploy to Vercel

**Option A: Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod

# Follow prompts:
# - Link to existing project? N
# - Project name: promptsculptor
# - Directory: ./
```

**Option B: Vercel Dashboard**
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import your PromptSculptor repository
5. Configure settings (auto-detected)

### 3. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

**Required Variables:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_OTjdgwq0x1BV@ep-gentle-flower-adjvsoq8-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
SESSION_SECRET=efcce6324c07c9a103f62d80a125e6f02ba4072bd111e2a825842a7cf7e49ef9
ENCRYPTION_KEY=bf9a39c9d4973e071579c902624a96ed935737df3770dc81292b4e0a929ae2c7
```

**Google OAuth (for Admin):**
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_ALLOWED_EMAILS=your-admin-email@domain.com
```

**Email Service:**
```bash
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
APP_URL=https://your-vercel-app.vercel.app
```

**Security & Rate Limiting:**
```bash
CORS_ORIGINS=https://your-vercel-app.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_PER_MINUTE=10
```

**User Management:**
```bash
USER_RETENTION_DAYS=30
CLEANUP_INTERVAL_HOURS=24
MONITORING_ENABLED=true
```

### 4. Update OAuth Callback URL

**Google OAuth Console:**
1. Go to https://console.developers.google.com/
2. Select your OAuth project
3. Credentials → OAuth 2.0 Client IDs
4. Add authorized redirect URI:
   ```
   https://your-vercel-app.vercel.app/api/admin/auth/google/callback
   ```

### 5. Custom Domain (Optional)

**In Vercel Dashboard:**
1. Project → Settings → Domains
2. Add your custom domain
3. Update environment variables:
   - `APP_URL=https://yourdomain.com`
   - `CORS_ORIGINS=https://yourdomain.com`
4. Update OAuth callback URL to use custom domain

## Deployment Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel CDN    │────│  Vercel Function │────│  Neon Database  │
│ (Static Assets) │    │   (Node.js App)  │    │  (PostgreSQL)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Benefits:**
- ✅ Automatic HTTPS/SSL
- ✅ Global CDN for static assets
- ✅ Automatic deployments on git push
- ✅ Built-in monitoring and analytics
- ✅ Serverless scaling

## Post-Deployment Checklist

### Test Core Functionality:
- [ ] Landing page loads
- [ ] User registration works
- [ ] Login/logout works
- [ ] Password recovery emails send
- [ ] Prompt generation with user API keys
- [ ] Demo mode templates work
- [ ] Admin OAuth login works
- [ ] Favorites and recent prompts work

### Security Verification:
- [ ] HTTPS enforced
- [ ] CORS headers correct
- [ ] Rate limiting active
- [ ] Sessions secure
- [ ] No sensitive data in logs

### Performance Check:
- [ ] Page load times < 3s
- [ ] API responses < 500ms
- [ ] Database queries optimized
- [ ] Static assets cached

## Troubleshooting

**Build Errors:**
```bash
# Check build locally
npm run vercel-build
```

**Database Connection Issues:**
```bash
# Test database connection
DATABASE_URL="your-neon-url" npm run db:push
```

**Environment Variable Issues:**
- Check Vercel dashboard for typos
- Ensure no trailing spaces in values
- Redeploy after env var changes

## Monitoring & Maintenance

**Vercel Dashboard:**
- Functions → Monitor serverless function performance
- Analytics → Track page views and performance
- Logs → Debug runtime issues

**Database Monitoring:**
- Neon dashboard for query performance
- Connection pooling metrics
- Storage usage tracking

Your app is now production-ready on Vercel! 🚀