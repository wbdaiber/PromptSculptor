// Debug script to test the /api/templates endpoint
import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:5001';

async function debugTemplates() {
  console.log(`Testing ${API_URL}/api/templates\n`);
  
  try {
    const response = await fetch(`${API_URL}/api/templates`);
    const templates = await response.json();
    
    console.log(`Total templates received: ${templates.length}`);
    
    // Group by name to check for duplicates
    const templatesByName: Record<string, any[]> = {};
    templates.forEach((t: any) => {
      if (!templatesByName[t.name]) templatesByName[t.name] = [];
      templatesByName[t.name].push(t);
    });
    
    console.log('\nTemplates by name:');
    Object.entries(templatesByName).forEach(([name, temps]) => {
      console.log(`  ${name}: ${temps.length} instance(s)`);
      if (temps.length > 1) {
        console.log('    Duplicate IDs:');
        temps.forEach(t => console.log(`      - ${t.id}`));
      }
    });
    
    // Check for duplicate IDs
    const ids = templates.map((t: any) => t.id);
    const uniqueIds = new Set(ids);
    
    if (ids.length !== uniqueIds.size) {
      console.log('\n⚠️  Warning: Duplicate template IDs found!');
      const idCounts: Record<string, number> = {};
      ids.forEach((id: string) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      Object.entries(idCounts).forEach(([id, count]) => {
        if (count > 1) {
          console.log(`  ID ${id} appears ${count} times`);
        }
      });
    } else {
      console.log('\n✅ All template IDs are unique');
    }
    
    // Display full template data for inspection
    console.log('\nFull template data:');
    templates.forEach((t: any, index: number) => {
      console.log(`\n[${index}] ${t.name} (ID: ${t.id})`);
      console.log(`  Type: ${t.type}`);
      console.log(`  Default: ${t.isDefault}`);
      console.log(`  User ID: ${t.userId || 'null'}`);
    });
    
  } catch (error) {
    console.error('Error fetching templates:', error);
  }
}

debugTemplates();