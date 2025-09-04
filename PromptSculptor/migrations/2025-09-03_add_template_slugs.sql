-- Phase 1: Add slug column and proper unique constraints for default templates
-- This migration fixes the duplicate template issue by adding stable identifiers

-- Step 1: Add slug column to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Step 2: Update existing default templates with stable slugs
UPDATE templates 
SET slug = 'default-' || type 
WHERE is_default = true AND slug IS NULL;

-- Step 3: Set slugs for any orphaned templates (to be cleaned up)
UPDATE templates 
SET slug = 'orphaned-' || id 
WHERE user_id IS NULL AND is_default = false AND slug IS NULL;

-- Step 4: Drop existing problematic unique indexes if they exist
DROP INDEX IF EXISTS uq_default_template_name;
DROP INDEX IF EXISTS uq_default_template_type;

-- Step 5: Create proper partial unique index on slug for default templates only
-- This ensures only one default template per slug can exist
CREATE UNIQUE INDEX IF NOT EXISTS uq_default_template_slug 
ON templates (slug) 
WHERE is_default = true;

-- Step 6: Add index for faster queries on slug
CREATE INDEX IF NOT EXISTS idx_template_slug ON templates (slug);

-- Step 7: Clean up orphaned templates (user_id is NULL and is_default is false)
-- These are the duplicates created by the concurrent initialization bug
DELETE FROM templates 
WHERE user_id IS NULL 
  AND is_default = false;

-- Step 8: Ensure only one default template exists per type
-- Keep the oldest one if duplicates exist
DELETE FROM templates t1
WHERE is_default = true
  AND EXISTS (
    SELECT 1 
    FROM templates t2 
    WHERE t2.is_default = true 
      AND t2.type = t1.type 
      AND t2.created_at < t1.created_at
  );

-- Step 9: Verify we have exactly 4 default templates
DO $$
DECLARE
  default_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO default_count 
  FROM templates 
  WHERE is_default = true;
  
  IF default_count != 4 THEN
    RAISE WARNING 'Expected 4 default templates, found %', default_count;
  END IF;
END $$;