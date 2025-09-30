# Vercel Deployment Fix - September 2, 2025

## Issues Resolved

### 1. JavaScript Files Served as Plain Text
**Problem**: JavaScript files were being served with incorrect MIME type (`text/plain` instead of `application/javascript`), causing them to display as text rather than execute.

**Root Cause**: Vercel's rewrite rules were catching all routes, including static assets, preventing proper MIME type detection.

### 2. Landing Page Not Loading at Root URL
**Problem**: The static landing page (`landing.html`) was not being served at the root URL (`/`). Instead, users were redirected directly to the React app.

**Root Cause**: Incorrect routing configuration and build process issues.

### 3. Double Build Execution
**Problem**: Vercel was running the build command twice during deployment, causing unnecessary build time and potential issues.

**Root Cause**: Using `npm run vercel-build` which Vercel automatically runs, causing duplication.

## Solutions Implemented

### Final Working Configuration (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api"
    },
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/app/(.*)",
      "dest": "/index.html"
    },
    {
      "src": "/app",
      "dest": "/index.html"
    },
    {
      "src": "/",
      "dest": "/landing.html"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Key Changes Made

1. **Build Command**: Changed from `npm run vercel-build` to `npm run build`
   - Prevents double build execution
   - Uses the standard build process

2. **Output Directory**: Set to `dist/public`
   - Points to where Vite outputs the built files
   - Contains both `index.html` (React app) and `landing.html` (static page)

3. **Routing Strategy**: Switched from `rewrites` to `routes`
   - More explicit and predictable routing behavior
   - Better control over static asset serving

4. **Route Order** (processed sequentially):
   - `/api/*` → API serverless functions
   - `/assets/*` → Static assets (JS, CSS) served with correct MIME types
   - `/app` and `/app/*` → React application
   - `/` → Static landing page
   - `/*` → Catch-all for React client-side routing

## Build Output Structure

```
dist/
├── public/
│   ├── assets/
│   │   ├── index-[hash].js     # React app JavaScript
│   │   └── index-[hash].css    # React app styles
│   ├── index.html               # React app entry point
│   ├── landing.html             # Static landing page
│   └── favicon.ico              # Favicon
└── index.js                     # Server bundle (not used in Vercel)
```

## Deployment Flow

1. **Build Process**: Vite builds the React app and copies static files to `dist/public/`
2. **Vercel Deployment**: 
   - Serves static files from `dist/public/`
   - Routes API requests to serverless functions in `api/`
   - Handles routing based on the `routes` configuration

## URL Structure

- `/` - Static landing page (SEO-optimized HTML)
- `/app` - React application
- `/app/*` - React app routes (client-side routing)
- `/api/*` - Backend API endpoints
- `/assets/*` - Static assets (JS, CSS, images)

## Lessons Learned

1. **Avoid Catch-All Rewrites Early**: Place catch-all routes last to prevent them from intercepting static assets
2. **Use Explicit Asset Routes**: Explicitly define routes for `/assets/` to ensure proper MIME type serving
3. **Prefer `routes` over `rewrites`**: For complex routing scenarios, `routes` provides more predictable behavior
4. **Single Build Command**: Don't use `vercel-build` as the build command if you already have it defined elsewhere
5. **Test Locally**: Build output structure should be verified locally before deployment

## Verification Steps

1. Check that landing page loads at root URL
2. Verify React app loads at `/app`
3. Inspect Network tab to ensure JS files have `Content-Type: application/javascript`
4. Test API endpoints are accessible
5. Verify client-side routing works within the React app

## Related Files

- `vite.config.ts` - Defines build output directory
- `client/public/landing.html` - Static landing page source
- `api/index.ts` - Serverless function entry point