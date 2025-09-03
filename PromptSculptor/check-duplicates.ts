import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { templates } from './shared/schema';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function checkTemplates() {
  const defaultTemplates = await db.select().from(templates).where(eq(templates.isDefault, true));
  
  console.log('Total default templates:', defaultTemplates.length);
  
  const templatesByName: Record<string, any[]> = {};
  defaultTemplates.forEach(t => {
    if (!templatesByName[t.name]) templatesByName[t.name] = [];
    templatesByName[t.name].push(t);
  });
  
  console.log('\nTemplates by name:');
  Object.entries(templatesByName).forEach(([name, temps]) => {
    console.log(`  ${name}: ${temps.length} instance(s)`);
    if (temps.length > 1) {
      temps.forEach(t => console.log(`    - ID: ${t.id}, created: ${t.createdAt}`));
    }
  });
  
  // Clean up duplicates if found
  const duplicates: string[] = [];
  Object.entries(templatesByName).forEach(([name, temps]) => {
    if (temps.length > 1) {
      // Keep the oldest one, delete the rest
      const sorted = temps.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (let i = 1; i < sorted.length; i++) {
        duplicates.push(sorted[i].id);
      }
    }
  });
  
  if (duplicates.length > 0) {
    console.log(`\nFound ${duplicates.length} duplicate templates to remove`);
    console.log('IDs to delete:', duplicates);
  } else {
    console.log('\nNo duplicates found!');
  }
  
  await pool.end();
}

checkTemplates();