# Fix Vercel Database - Missing Slug Column

## Problem
The Vercel production database is missing the `slug` column in the `templates` table, causing a 500 error when trying to create templates.

Error message:
```
column "slug" of relation "templates" does not exist
```

## Solution

You have two options to fix this:

### Option 1: Run Migration Script Locally (Recommended)

1. Set your production DATABASE_URL in a temporary environment variable:
```bash
export DATABASE_URL="your-vercel-postgres-url-here"
```

2. Run the fix script:
```bash
cd PromptSculptor
npm run db:fix-templates
```

3. The script will:
   - Check if the slug column exists
   - Add the column if missing
   - Set up proper indexes
   - Clean up any orphaned templates
   - Verify the fix

### Option 2: Run SQL Directly in Vercel Dashboard

1. Go to your Vercel Dashboard
2. Navigate to Storage → Your Database → Query
3. Run this SQL:

```sql
-- Add slug column to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Update existing default templates with stable slugs
UPDATE templates 
SET slug = 'default-' || type 
WHERE is_default = true AND slug IS NULL;

-- Set slugs for user templates
UPDATE templates 
SET slug = 'user-' || id 
WHERE user_id IS NOT NULL AND slug IS NULL;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_default_template_slug 
ON templates (slug) 
WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_template_slug ON templates (slug);

-- Clean up orphaned templates
DELETE FROM templates 
WHERE user_id IS NULL 
  AND is_default = false;
```

### Option 3: Use Drizzle Kit (If configured for production)

```bash
# Set production DATABASE_URL
export DATABASE_URL="your-vercel-postgres-url-here"

# Push schema to production
cd PromptSculptor
npm run db:push
```

## Verification

After applying the fix, verify it worked:

1. Check the health endpoint: `https://your-app.vercel.app/api/health`
   - Should show `database.status: "connected"`

2. Try creating a template again
   - Should work without errors

## Prevention

To prevent this in the future:
1. Always run `npm run db:push` after schema changes
2. Consider setting up automatic migrations in your deployment pipeline
3. Keep your local and production databases in sync

## Related Files
- Migration: `/migrations/2025-09-03_add_template_slugs.sql`
- Fix script: `/scripts/fix-templates-slug.ts`
- Schema: `/shared/schema.ts` (lines 79-101)