#!/usr/bin/env tsx
/**
 * Initialize or update default templates in the database
 * This script is idempotent and safe to run multiple times
 * Run with: npx tsx scripts/initialize-templates.ts
 */

import 'dotenv/config';
import { templateManagementService } from '../server/services/templateManagementService.js';

async function initializeTemplates() {
  const startTime = Date.now();
  console.log('🚀 Initializing default templates...\n');
  
  try {
    // Call the idempotent initialization method
    await templateManagementService.initializeDefaultTemplates();
    
    // Verify the templates were created
    const templates = await templateManagementService.getDefaultTemplates();
    
    if (templates.length === 4) {
      console.log('\n📋 Default templates verified:');
      for (const template of templates) {
        console.log(`   ✓ ${template.type}: "${template.name}" (slug: ${template.slug})`);
      }
      console.log('\n✨ Template initialization completed successfully!');
    } else {
      console.warn(`⚠️  Expected 4 templates but found ${templates.length}`);
      console.log('Templates found:', templates.map(t => t.name).join(', '));
    }
    
    const duration = Date.now() - startTime;
    console.log(`\nCompleted in ${duration}ms`);
    
  } catch (error) {
    console.error('❌ Template initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeTemplates()
  .then(() => {
    // Give time for logs to flush before exit
    setTimeout(() => process.exit(0), 100);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });