#!/usr/bin/env tsx
/**
 * Update existing default templates with proper slugs
 * Run with: npx tsx scripts/update-template-slugs.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { templates } from '../shared/schema.js';

async function updateTemplateSlugs() {
  console.log('🔧 Updating template slugs...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  
  const db = drizzle(pool);
  
  try {
    // Update slugs for existing default templates
    const updates = [
      { type: 'analysis', slug: 'default-analysis' },
      { type: 'writing', slug: 'default-writing' },
      { type: 'coding', slug: 'default-coding' },
      { type: 'custom', slug: 'default-custom' },
    ];
    
    for (const { type, slug } of updates) {
      const result = await db
        .update(templates)
        .set({ slug })
        .where(and(
          eq(templates.type, type),
          eq(templates.isDefault, true)
        ));
      
      console.log(`✅ Updated ${type} template with slug: ${slug}`);
    }
    
    // Verify the update
    const defaultTemplates = await db
      .select({
        type: templates.type,
        name: templates.name,
        slug: templates.slug,
      })
      .from(templates)
      .where(eq(templates.isDefault, true))
      .orderBy(templates.type);
    
    console.log('\n📋 Updated default templates:');
    for (const template of defaultTemplates) {
      console.log(`   - ${template.type}: "${template.name}" (slug: ${template.slug})`);
    }
    
    console.log('\n✨ Slug update completed successfully!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
updateTemplateSlugs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });