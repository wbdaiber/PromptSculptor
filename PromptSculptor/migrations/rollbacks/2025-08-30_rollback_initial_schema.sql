-- Rollback for 2025-08-30_initial_schema.sql
-- This script removes all tables and structures created in the initial schema migration
-- Use this script to completely reset the database to pre-migration state

-- WARNING: This will destroy ALL application data including users, prompts, templates, and tokens
-- This is a destructive operation that cannot be undone without backups

BEGIN;

-- Drop all foreign key constraints first to avoid dependency issues
ALTER TABLE IF EXISTS "password_reset_tokens" DROP CONSTRAINT IF EXISTS "password_reset_tokens_user_id_users_id_fk";
ALTER TABLE IF EXISTS "prompts" DROP CONSTRAINT IF EXISTS "prompts_user_id_users_id_fk";
ALTER TABLE IF EXISTS "templates" DROP CONSTRAINT IF EXISTS "templates_user_id_users_id_fk";
ALTER TABLE IF EXISTS "user_api_keys" DROP CONSTRAINT IF EXISTS "user_api_keys_user_id_users_id_fk";

-- Drop all tables created in initial schema
DROP TABLE IF EXISTS "password_reset_tokens" CASCADE;
DROP TABLE IF EXISTS "prompts" CASCADE;
DROP TABLE IF EXISTS "templates" CASCADE;
DROP TABLE IF EXISTS "user_api_keys" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop any sequences or other objects that might have been created
DROP SEQUENCE IF EXISTS users_id_seq CASCADE;
DROP SEQUENCE IF EXISTS prompts_id_seq CASCADE;
DROP SEQUENCE IF EXISTS templates_id_seq CASCADE;
DROP SEQUENCE IF EXISTS user_api_keys_id_seq CASCADE;
DROP SEQUENCE IF EXISTS password_reset_tokens_id_seq CASCADE;

COMMIT;

-- Post-rollback verification queries
-- Run these to verify the rollback was successful:
-- 
-- -- Check that all application tables were removed
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('users', 'prompts', 'templates', 'user_api_keys', 'password_reset_tokens');
-- 
-- -- Check that all foreign key constraints were removed
-- SELECT constraint_name, table_name, constraint_type
-- FROM information_schema.table_constraints 
-- WHERE constraint_type = 'FOREIGN KEY' 
-- AND table_schema = 'public';
--
-- Expected result: No application tables or foreign key constraints should exist

-- IMPORTANT NOTES FOR ROLLBACK:
-- 1. This rollback DESTROYS ALL APPLICATION DATA permanently
-- 2. All users, prompts, templates, API keys, and password reset tokens will be lost
-- 3. This operation CANNOT BE UNDONE without database backups
-- 4. The application will not function after this rollback until re-migrated
-- 5. You will need to run all migrations again from scratch to restore functionality
-- 6. Consider creating a full database backup before running this rollback
-- 7. This rollback essentially returns the database to a completely empty state

-- To create a backup before rollback (recommended):
-- pg_dump -h localhost -U your_username your_database_name > backup_before_rollback.sql

-- To restore from backup after rollback (if needed):
-- psql -h localhost -U your_username your_database_name < backup_before_rollback.sql