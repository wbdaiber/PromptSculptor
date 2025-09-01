-- Rollback for 2025-08-30_add_username_field.sql  
-- This script removes the soft delete system columns and indexes
-- Use this script if you need to completely remove soft delete functionality

-- WARNING: This will permanently remove all soft delete capabilities and data
-- All soft-deleted users will become unrecoverable after this rollback

BEGIN;

-- Drop indexes related to soft delete system
DROP INDEX IF EXISTS "email_active_idx";
DROP INDEX IF EXISTS "idx_users_deleted_at";

-- WARNING: The next operations will permanently delete soft-deleted user data
-- Remove soft delete columns (this will permanently delete soft-deleted users)
ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_deleted";

COMMIT;

-- Post-rollback verification queries
-- Run these to verify the rollback was successful:
-- 
-- -- Check that soft delete columns were removed
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name IN ('deleted_at', 'is_deleted');
-- 
-- -- Check that soft delete indexes were removed
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'users' AND indexname IN ('email_active_idx', 'idx_users_deleted_at');
--
-- Expected result: No soft delete columns or indexes should exist

-- IMPORTANT NOTES FOR ROLLBACK:
-- 1. This rollback PERMANENTLY DELETES all soft-deleted user data
-- 2. Users who had soft-deleted accounts cannot recover their data after this rollback  
-- 3. The application will need to be updated to remove soft delete logic from:
--    - User authentication queries
--    - User registration logic
--    - Account deletion functionality
--    - User cleanup services
-- 4. You may need to restart the application server after this rollback
-- 5. This rollback makes the "User already exists" issue return for deleted accounts
-- 6. Consider backing up soft-deleted user data before running this rollback

-- To backup soft-deleted users before rollback (optional):
-- CREATE TABLE users_deleted_backup AS 
-- SELECT * FROM users WHERE is_deleted = true;