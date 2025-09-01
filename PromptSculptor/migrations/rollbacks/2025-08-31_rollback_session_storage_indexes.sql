-- Rollback for 2025-08-31_add_session_storage_indexes.sql
-- This script removes all indexes and tables added in the session storage migration
-- Use this script if you need to revert the session storage and performance index changes

-- WARNING: This will remove session storage capability and admin analytics performance optimizations
-- Make sure no active sessions exist before running this rollback

BEGIN;

-- Drop performance indexes for admin analytics (added in this migration)
DROP INDEX IF EXISTS "prompts_user_id_created_idx";
DROP INDEX IF EXISTS "prompts_user_favorite_idx";
DROP INDEX IF EXISTS "prompts_template_type_idx";
DROP INDEX IF EXISTS "templates_type_default_idx";
DROP INDEX IF EXISTS "templates_user_id_created_idx";
DROP INDEX IF EXISTS "user_api_keys_user_id_idx";

-- Drop password reset token indexes (added in this migration)
DROP INDEX IF EXISTS "password_reset_tokens_token_idx";
DROP INDEX IF EXISTS "password_reset_tokens_user_id_idx";
DROP INDEX IF EXISTS "password_reset_tokens_expires_at_idx";

-- Drop user sessions table and its indexes (added in this migration)
DROP INDEX IF EXISTS "user_sessions_expire_idx";
DROP TABLE IF EXISTS "user_sessions";

COMMIT;

-- Post-rollback verification queries
-- Run these to verify the rollback was successful:
-- 
-- -- Check that user_sessions table was removed
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'user_sessions';
-- 
-- -- Check that performance indexes were removed
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('prompts', 'templates', 'user_api_keys', 'password_reset_tokens');
--
-- Expected result: No user_sessions table, and significantly fewer indexes on the listed tables

-- IMPORTANT NOTES FOR ROLLBACK:
-- 1. All active user sessions will be lost - users will need to log in again
-- 2. Admin dashboard performance will be significantly degraded without indexes
-- 3. Password reset functionality will be slower without token indexes
-- 4. You may need to restart the application server after this rollback
-- 5. Consider running VACUUM ANALYZE after this rollback to update query planner statistics