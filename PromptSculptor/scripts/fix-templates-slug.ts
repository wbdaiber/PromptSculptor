#!/usr/bin/env tsx
/**
 * Emergency fix script to add slug column to templates table
 * Run this if you get "column slug does not exist" errors
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixTemplatesTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Starting templates table fix...');
    
    // Check if slug column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'templates' 
      AND column_name = 'slug'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Slug column already exists');
      return;
    }
    
    console.log('⚠️  Slug column missing, applying migration...');
    
    // Run the migration
    await pool.query(`
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
      CREATE UNIQUE INDEX IF NOT EXISTS uq_default_template_slug 
      ON templates (slug) 
      WHERE is_default = true;
      
      -- Step 6: Add index for faster queries on slug
      CREATE INDEX IF NOT EXISTS idx_template_slug ON templates (slug);
      
      -- Step 7: Clean up orphaned templates
      DELETE FROM templates 
      WHERE user_id IS NULL 
        AND is_default = false;
    `);
    
    console.log('✅ Migration applied successfully');
    
    // Verify the fix
    const verifyResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'templates' 
      AND column_name = 'slug'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verified: slug column now exists');
      
      // Check template counts
      const countResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_default = true) as default_count,
          COUNT(*) FILTER (WHERE is_default = false) as user_count
        FROM templates
      `);
      
      const counts = countResult.rows[0];
      console.log(`📊 Template counts: ${counts.total} total (${counts.default_count} default, ${counts.user_count} user)`);
    } else {
      console.error('❌ Migration failed - slug column still missing');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error fixing templates table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixTemplatesTable()
  .then(() => {
    console.log('✅ Templates table fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });