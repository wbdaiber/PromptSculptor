import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
import { templates } from './shared/schema';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function fixDuplicateTemplates() {
  console.log('🔍 Analyzing template duplicates...\n');
  
  try {
    // Get all default templates
    const defaultTemplates = await db
      .select()
      .from(templates)
      .where(and(
        eq(templates.isDefault, true),
        isNull(templates.userId)
      ))
      .orderBy(templates.name, templates.createdAt);
    
    console.log(`Found ${defaultTemplates.length} default templates in total\n`);
    
    // Group by name to find duplicates
    const templatesByName: Record<string, typeof defaultTemplates> = {};
    defaultTemplates.forEach(t => {
      if (!templatesByName[t.name]) templatesByName[t.name] = [];
      templatesByName[t.name].push(t);
    });
    
    // Identify which ones to keep and which to delete
    const toDelete: string[] = [];
    const toKeep: Record<string, any> = {};
    
    console.log('Template analysis:');
    Object.entries(templatesByName).forEach(([name, temps]) => {
      console.log(`\n${name}: ${temps.length} instance(s)`);
      
      if (temps.length > 1) {
        // Sort by creation date, keep the oldest one
        const sorted = temps.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        // Keep the first one
        toKeep[name] = sorted[0];
        console.log(`  ✅ Keeping: ${sorted[0].id} (created: ${sorted[0].createdAt})`);
        
        // Delete the rest
        for (let i = 1; i < sorted.length; i++) {
          toDelete.push(sorted[i].id);
          console.log(`  ❌ Will delete: ${sorted[i].id} (created: ${sorted[i].createdAt})`);
        }
      } else {
        toKeep[name] = temps[0];
        console.log(`  ✅ No duplicates, keeping: ${temps[0].id}`);
      }
    });
    
    if (toDelete.length > 0) {
      console.log(`\n⚠️  Found ${toDelete.length} duplicate templates to remove\n`);
      
      // Ask for confirmation
      console.log('This will DELETE the duplicate templates from your database.');
      console.log('To proceed, run this command with the FIX flag:');
      console.log('  FIX=true npx tsx fix-duplicate-templates.ts\n');
      
      if (process.env.FIX === 'true') {
        console.log('🔧 Removing duplicates...\n');
        
        // Delete duplicates in batches
        const batchSize = 10;
        for (let i = 0; i < toDelete.length; i += batchSize) {
          const batch = toDelete.slice(i, i + batchSize);
          await db.delete(templates).where(inArray(templates.id, batch));
          console.log(`  Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(toDelete.length/batchSize)} (${batch.length} templates)`);
        }
        
        console.log('\n✅ Duplicate templates removed successfully!');
        
        // Verify the fix
        const remaining = await db
          .select()
          .from(templates)
          .where(and(
            eq(templates.isDefault, true),
            isNull(templates.userId)
          ));
        
        console.log(`\nVerification: ${remaining.length} default templates remaining`);
        const names = new Set(remaining.map(t => t.name));
        console.log(`Unique template names: ${Array.from(names).join(', ')}`);
        
        if (remaining.length === 4 && names.size === 4) {
          console.log('\n🎉 Database is now clean! Each default template appears exactly once.');
        }
      }
    } else {
      console.log('\n✅ No duplicate templates found! Database is clean.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixDuplicateTemplates();