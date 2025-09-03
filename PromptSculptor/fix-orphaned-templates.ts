import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { and, isNull, eq, sql } from 'drizzle-orm';
import { templates } from './shared/schema';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function fixOrphanedTemplates() {
  console.log('🔍 Finding orphaned templates (user_id=NULL, is_default=FALSE)...\n');
  
  try {
    // Find orphaned templates
    const orphaned = await db
      .select()
      .from(templates)
      .where(and(
        isNull(templates.userId),
        eq(templates.isDefault, false)
      ))
      .orderBy(templates.name, templates.createdAt);
    
    console.log(`Found ${orphaned.length} orphaned templates\n`);
    
    if (orphaned.length === 0) {
      console.log('✅ No orphaned templates found!');
      await pool.end();
      return;
    }
    
    // Group by name to see what we have
    const byName: Record<string, typeof orphaned> = {};
    orphaned.forEach(t => {
      if (!byName[t.name]) byName[t.name] = [];
      byName[t.name].push(t);
    });
    
    console.log('Orphaned templates by name:');
    Object.entries(byName).forEach(([name, temps]) => {
      console.log(`  ${name}: ${temps.length} orphaned instance(s)`);
    });
    
    // Check if we already have proper default templates
    const properDefaults = await db
      .select()
      .from(templates)
      .where(and(
        isNull(templates.userId),
        eq(templates.isDefault, true)
      ));
    
    console.log(`\nExisting proper default templates: ${properDefaults.length}`);
    const defaultNames = new Set(properDefaults.map(t => t.name));
    console.log(`Names: ${Array.from(defaultNames).join(', ')}`);
    
    console.log('\n⚠️  These orphaned templates should be deleted.');
    console.log('They are duplicates that have user_id=NULL but is_default=FALSE,');
    console.log('which causes them to appear as duplicates in the template list.\n');
    
    if (process.env.DELETE === 'true') {
      console.log('🗑️  Deleting orphaned templates...\n');
      
      const deleteResult = await db
        .delete(templates)
        .where(and(
          isNull(templates.userId),
          eq(templates.isDefault, false)
        ));
      
      console.log(`✅ Deleted ${orphaned.length} orphaned templates!`);
      
      // Verify the fix
      const remaining = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_default = true AND user_id IS NULL THEN 1 END) as proper_defaults,
          COUNT(CASE WHEN is_default = false AND user_id IS NULL THEN 1 END) as orphaned
        FROM templates
      `);
      
      const stats = remaining.rows[0] as any;
      console.log('\nDatabase status after cleanup:');
      console.log(`  Total templates: ${stats.total}`);
      console.log(`  Proper default templates: ${stats.proper_defaults}`);
      console.log(`  Remaining orphaned: ${stats.orphaned}`);
      
      if (stats.orphaned === '0') {
        console.log('\n🎉 All orphaned templates have been removed!');
        console.log('The duplicate template issue should now be fixed.');
      }
    } else {
      console.log('To DELETE these orphaned templates, run:');
      console.log('  DELETE=true npx tsx fix-orphaned-templates.ts\n');
      console.log('This is safe because these are duplicates that shouldn\'t exist.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixOrphanedTemplates();