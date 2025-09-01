-- Rollback for 2025-08-30_add_favorites_system.sql
-- This script reverts the soft delete system partial unique indexes
-- Use this script if you need to restore global unique constraints on email/username

-- WARNING: This rollback will prevent users from re-registering with the same email after deletion
-- Only run this if you want to disable the soft delete re-registration capability

BEGIN;

-- Drop partial unique indexes for soft delete system
DROP INDEX IF EXISTS "email_unique_active_idx";
DROP INDEX IF EXISTS "username_unique_active_idx";

-- Restore global unique constraints (will fail if duplicate emails/usernames exist)
-- NOTE: This may fail if you have soft-deleted users with the same email/username as active users
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username");

COMMIT;

-- Post-rollback verification queries
-- Run these to verify the rollback was successful:
-- 
-- -- Check that global unique constraints were restored
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'users' AND constraint_type = 'UNIQUE';
-- 
-- -- Check that partial indexes were removed
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'users' AND indexname LIKE '%active%';

-- IMPORTANT NOTES FOR ROLLBACK:
-- 1. This rollback may FAIL if you have soft-deleted users with same email/username as active users
-- 2. If rollback fails, you need to permanently delete or anonymize conflicting soft-deleted users first
-- 3. After this rollback, users cannot re-register with same email after account deletion
-- 4. You may need to update application logic to handle the "User already exists" error appropriately
-- 5. This affects the user registration and account deletion functionality

-- If the rollback fails due to duplicate values, run this query first to identify conflicts:
-- SELECT email, username, COUNT(*) 
-- FROM users 
-- GROUP BY email, username 
-- HAVING COUNT(*) > 1;