-- OAuth Authentication System Rollback Procedures
-- This document provides rollback procedures for the Google OAuth admin authentication system
-- The OAuth system doesn't use database migrations but requires configuration and code changes

-- IMPORTANT: OAuth system rollback is primarily a configuration and code rollback
-- No database changes need to be reverted as OAuth uses existing session storage

-- ======================================================================
-- ROLLBACK PROCEDURE FOR OAUTH AUTHENTICATION SYSTEM
-- ======================================================================

-- STEP 1: Environment Configuration Rollback
-- -----------------------------------------
-- Remove or comment out OAuth-related environment variables in .env:
--
-- # GOOGLE_CLIENT_ID=your-google-client-id-here
-- # GOOGLE_CLIENT_SECRET=your-google-client-secret-here  
-- # ADMIN_ALLOWED_EMAILS=admin@yourdomain.com,backup-admin@yourdomain.com
--
-- Optionally restore API key authentication:
-- ADMIN_API_KEY=your-secure-api-key-here

-- STEP 2: Code Rollback Requirements
-- ----------------------------------
-- The following files need to be reverted to restore API key authentication:

-- FILES TO REVERT:
-- 1. server/config/oauth.ts - Remove or disable OAuth configuration
-- 2. server/routes/adminAuth.ts - Remove OAuth routes  
-- 3. server/routes/monitoring.ts - Change auth from OAuth to API key
-- 4. server/middleware/session.ts - Revert dual serialization to ID-only
-- 5. client/src/context/AdminAuthContext.tsx - Revert to API key auth
-- 6. client/src/components/admin/AdminLogin.tsx - Restore API key form
-- 7. client/src/pages/admin/AdminLogin.tsx - Remove OAuth UI components

-- STEP 3: Database Cleanup (Optional)
-- -----------------------------------
-- OAuth admin sessions are stored in existing user_sessions table
-- To clear OAuth admin sessions (force re-login):

-- Clear all admin OAuth sessions (optional)
-- DELETE FROM user_sessions 
-- WHERE sess->>'passport' IS NOT NULL 
-- AND sess->'passport'->>'user' LIKE '%@%';

-- STEP 4: Server Restart
-- ----------------------
-- Restart the application server to apply configuration changes:
-- npm run dev  # for development
-- npm start    # for production

-- ======================================================================
-- VERIFICATION STEPS AFTER ROLLBACK
-- ======================================================================

-- 1. Verify OAuth routes are disabled:
--    - GET /api/admin/auth/google should return 404
--    - GET /api/admin/auth/google/callback should return 404
--    - GET /api/admin/auth/logout should return 404

-- 2. Verify API key authentication is restored:
--    - GET /api/monitoring/health with API key header should work
--    - Admin dashboard should show API key login form

-- 3. Verify environment variables:
--    - GOOGLE_CLIENT_ID should be undefined or commented out
--    - ADMIN_ALLOWED_EMAILS should be undefined or commented out
--    - ADMIN_API_KEY should be defined (if using API key auth)

-- 4. Test admin access:
--    - OAuth login should be unavailable
--    - API key authentication should work (if restored)
--    - Admin dashboard should be accessible with proper credentials

-- ======================================================================
-- ROLLBACK IMPACT ASSESSMENT
-- ======================================================================

-- FUNCTIONALITY AFFECTED:
-- ✓ Admin authentication method changes from OAuth to API key
-- ✓ "Sign in with Google" functionality disabled
-- ✓ Email whitelist authentication removed
-- ✓ Admin session management reverts to API key validation
-- ✓ No database data loss (OAuth uses existing session storage)

-- FUNCTIONALITY PRESERVED:
-- ✓ All admin analytics and monitoring features remain functional
-- ✓ Database performance optimizations remain active
-- ✓ Admin dashboard UI remains unchanged (except login method)
-- ✓ All monitoring endpoints continue to work with proper authentication

-- USER IMPACT:
-- ✓ Admin users must switch from Google OAuth to API key authentication
-- ✓ Active OAuth sessions will be invalidated
-- ✓ Regular application users are not affected
-- ✓ No application downtime required (rolling deployment possible)

-- SECURITY CONSIDERATIONS:
-- ✓ API key authentication requires secure key management
-- ✓ OAuth provides better security - consider security implications
-- ✓ API keys should be rotated regularly if using API key auth
-- ✓ Ensure proper API key storage and transmission security

-- ======================================================================
-- RECOMMENDED TESTING AFTER ROLLBACK
-- ======================================================================

-- 1. Test admin authentication with API key (if restored)
-- 2. Verify all monitoring endpoints work with new auth method
-- 3. Test admin dashboard functionality end-to-end
-- 4. Verify regular user authentication is unaffected
-- 5. Check application logs for authentication errors
-- 6. Test admin session persistence and logout functionality