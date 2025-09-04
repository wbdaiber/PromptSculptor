#!/usr/bin/env tsx
/**
 * Script to clean up duplicate default templates
 * Keeps only one template per type for default templates
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanupDuplicateTemplates() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🧹 Starting duplicate template cleanup...');
    
    // First, check current state
    const beforeResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM templates
      WHERE is_default = true
      GROUP BY type
      HAVING COUNT(*) > 1
      ORDER BY type
    `);
    
    if (beforeResult.rows.length === 0) {
      console.log('✅ No duplicate default templates found');
      return;
    }
    
    console.log('📊 Found duplicates:');
    beforeResult.rows.forEach(row => {
      console.log(`  - ${row.type}: ${row.count} copies`);
    });
    
    // Keep only the oldest (first created) template for each type
    const deleteResult = await pool.query(`
      WITH duplicates AS (
        SELECT id, type, created_at,
               ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at) as rn
        FROM templates
        WHERE is_default = true
      )
      DELETE FROM templates
      WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
      )
      RETURNING type
    `);
    
    console.log(`🗑️  Deleted ${deleteResult.rowCount} duplicate templates`);
    
    // Update slugs for remaining default templates
    console.log('🔧 Updating slugs for default templates...');
    await pool.query(`
      UPDATE templates
      SET slug = 'default-' || type
      WHERE is_default = true AND slug IS NULL
    `);
    
    // Verify the fix
    const afterResult = await pool.query(`
      SELECT type, name, slug, created_at
      FROM templates
      WHERE is_default = true
      ORDER BY type
    `);
    
    console.log('✅ Default templates after cleanup:');
    afterResult.rows.forEach(row => {
      console.log(`  - ${row.type}: ${row.name} (slug: ${row.slug})`);
    });
    
    // Check final count
    const countResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_default = true) as default_count,
        COUNT(*) FILTER (WHERE is_default = false) as user_count,
        COUNT(*) as total
      FROM templates
    `);
    
    const counts = countResult.rows[0];
    console.log(`\n📊 Final template counts:`);
    console.log(`  - Default templates: ${counts.default_count}`);
    console.log(`  - User templates: ${counts.user_count}`);
    console.log(`  - Total: ${counts.total}`);
    
    if (counts.default_count !== 4) {
      console.warn(`⚠️  Expected 4 default templates, found ${counts.default_count}`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up templates:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupDuplicateTemplates()
  .then(() => {
    console.log('✅ Template cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });