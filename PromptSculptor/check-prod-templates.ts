import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { templates } from './shared/schema';
import 'dotenv/config';

// Use production database URL if available
const DATABASE_URL = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('No database URL found');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function checkAndFixTemplates() {
  console.log('Checking templates in database...\n');
  
  // Get all default templates
  const defaultTemplates = await db
    .select()
    .from(templates)
    .where(and(
      eq(templates.isDefault, true),
      isNull(templates.userId)
    ))
    .orderBy(templates.name, templates.createdAt);
  
  console.log(`Total default templates: ${defaultTemplates.length}`);
  
  // Group by name to find duplicates
  const templatesByName: Record<string, typeof defaultTemplates> = {};
  defaultTemplates.forEach(t => {
    if (!templatesByName[t.name]) templatesByName[t.name] = [];
    templatesByName[t.name].push(t);
  });
  
  console.log('\nTemplates by name:');
  const duplicates: string[] = [];
  
  Object.entries(templatesByName).forEach(([name, temps]) => {
    console.log(`  ${name}: ${temps.length} instance(s)`);
    if (temps.length > 1) {
      console.log('    Duplicates found:');
      // Keep the oldest one, mark others for deletion
      const sorted = temps.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      console.log(`    Keeping: ID ${sorted[0].id} (created: ${sorted[0].createdAt})`);
      
      for (let i = 1; i < sorted.length; i++) {
        console.log(`    Will delete: ID ${sorted[i].id} (created: ${sorted[i].createdAt})`);
        duplicates.push(sorted[i].id);
      }
    }
  });
  
  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} duplicate templates`);
    console.log('To fix this issue, run: npm run fix-templates\n');
    
    // Optionally delete duplicates if FIX_TEMPLATES env var is set
    if (process.env.FIX_TEMPLATES === 'true') {
      console.log('🔧 Fixing duplicates...');
      
      for (const id of duplicates) {
        await db.delete(templates).where(eq(templates.id, id));
        console.log(`  Deleted template with ID: ${id}`);
      }
      
      console.log('\n✅ Duplicates removed successfully!');
    }
  } else {
    console.log('\n✅ No duplicate templates found!');
  }
  
  // Check for missing default templates
  const expectedTemplates = ['Analysis', 'Writing', 'Coding', 'Custom'];
  const existingNames = Object.keys(templatesByName);
  const missingTemplates = expectedTemplates.filter(name => !existingNames.includes(name));
  
  if (missingTemplates.length > 0) {
    console.log(`\n⚠️  Missing default templates: ${missingTemplates.join(', ')}`);
    console.log('Run the server to initialize missing templates.');
  }
  
  await pool.end();
}

checkAndFixTemplates().catch(console.error);