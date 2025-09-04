#!/usr/bin/env tsx
/**
 * Cleanup script to remove orphaned templates and ensure database integrity
 * Run with: npx tsx scripts/cleanup-orphaned-templates.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { templates } from '../shared/schema.js';

async function cleanupOrphanedTemplates() {
  const startTime = Date.now();
  console.log('🧹 Starting template cleanup...');
  
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  
  const db = drizzle(pool);
  
  try {
    // Step 1: Count orphaned templates before cleanup
    const orphanedCountResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM templates 
      WHERE user_id IS NULL 
        AND is_default = false
    `);
    
    const orphanedCount = Number((orphanedCountResult as any).rows[0].count);
    console.log(`📊 Found ${orphanedCount} orphaned templates to clean up`);
    
    if (orphanedCount > 0) {
      // Step 2: Delete orphaned templates
      const deleteResult = await db
        .delete(templates)
        .where(and(
          isNull(templates.userId),
          eq(templates.isDefault, false)
        ));
      
      console.log(`✅ Deleted ${deleteResult.rowCount || 0} orphaned templates`);
    }
    
    // Step 3: Check for duplicate default templates
    const duplicatesResult = await db.execute(sql`
      WITH duplicates AS (
        SELECT type, COUNT(*) as count 
        FROM templates 
        WHERE is_default = true 
        GROUP BY type 
        HAVING COUNT(*) > 1
      )
      SELECT * FROM duplicates
    `);
    
    const duplicates = (duplicatesResult as any).rows;
    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate default templates:');
      for (const dup of duplicates) {
        console.log(`   - Type: ${dup.type}, Count: ${dup.count}`);
      }
      
      // Remove duplicates, keeping only the oldest one
      const dedupeResult = await db.execute(sql`
        DELETE FROM templates t1
        WHERE is_default = true
          AND EXISTS (
            SELECT 1 
            FROM templates t2 
            WHERE t2.is_default = true 
              AND t2.type = t1.type 
              AND t2.created_at < t1.created_at
          )
      `);
      
      console.log(`✅ Removed ${(dedupeResult as any).rowCount} duplicate default templates`);
    }
    
    // Step 4: Verify we have exactly 4 default templates
    const defaultCountResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM templates 
      WHERE is_default = true
    `);
    
    const defaultCount = Number((defaultCountResult as any).rows[0].count);
    
    if (defaultCount === 4) {
      console.log('✅ Database has exactly 4 default templates as expected');
    } else if (defaultCount < 4) {
      console.log(`⚠️  Only ${defaultCount} default templates found. Run template initialization to add missing defaults.`);
    } else {
      console.log(`⚠️  Found ${defaultCount} default templates (expected 4). Please investigate.`);
    }
    
    // Step 5: List current default templates
    const defaultTemplates = await db
      .select({
        type: templates.type,
        name: templates.name,
        slug: templates.slug,
        createdAt: templates.createdAt,
      })
      .from(templates)
      .where(eq(templates.isDefault, true))
      .orderBy(templates.type);
    
    console.log('\n📋 Current default templates:');
    for (const template of defaultTemplates) {
      console.log(`   - ${template.type}: "${template.name}" (slug: ${template.slug || 'MISSING'})`);
    }
    
    // Step 6: Summary
    const duration = Date.now() - startTime;
    console.log(`\n✨ Cleanup completed in ${duration}ms`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupOrphanedTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });