#!/usr/bin/env tsx

/**
 * Password Reset Token Cleanup Script
 * 
 * This script can be run manually or scheduled as a cron job to clean up
 * expired password reset tokens from the database.
 * 
 * Usage:
 *   npx tsx server/scripts/cleanupTokens.ts
 * 
 * Cron job example (run every hour):
 *   0 * * * * cd /path/to/promptsculptor && npx tsx server/scripts/cleanupTokens.ts
 */

// Load environment variables first
import 'dotenv/config';

import { cleanupExpiredTokens, getTokenStatistics, performMaintenance } from '../services/tokenCleanupService.js';

async function runCleanup() {
  console.log('🚀 Password Reset Token Cleanup Script');
  console.log('=====================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get initial statistics (if available)
    try {
      console.log('📊 Getting token statistics...');
      const stats = await getTokenStatistics();
      console.log('Current token statistics:', stats);
      console.log('');
    } catch (error) {
      console.log('⚠️  Could not retrieve statistics (this is normal for basic cleanup)');
      console.log('');
    }

    // Perform maintenance
    console.log('🧹 Performing token maintenance...');
    const maintenance = await performMaintenance();
    
    console.log('');
    console.log('📋 Maintenance Results:');
    console.log(`   Deleted tokens: ${maintenance.cleanup.deletedTokens}`);
    console.log(`   Success: ${maintenance.cleanup.success}`);
    console.log(`   Timestamp: ${maintenance.cleanup.timestamp.toISOString()}`);
    
    if (maintenance.cleanup.error) {
      console.log(`   Error: ${maintenance.cleanup.error}`);
    }
    
    console.log('');
    console.log('💡 Recommendations:');
    maintenance.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
    
    console.log('');
    console.log('✅ Token cleanup completed successfully!');
    
    // Exit with success
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('❌ Token cleanup failed:');
    console.error(error);
    
    // Exit with error
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
Password Reset Token Cleanup Script

This script removes expired password reset tokens from the database
to maintain performance and security.

Usage:
  npx tsx server/scripts/cleanupTokens.ts [options]

Options:
  --help, -h    Show this help message

Examples:
  npx tsx server/scripts/cleanupTokens.ts
  
Cron job (runs every hour at minute 0):
  0 * * * * cd /path/to/promptsculptor && npx tsx server/scripts/cleanupTokens.ts >> /var/log/token-cleanup.log 2>&1

Environment Variables Required:
  - DATABASE_URL: PostgreSQL connection string
  - Other app configuration as per .env file

Exit Codes:
  0 - Success
  1 - Error occurred
`);
  process.exit(0);
}

// Run the cleanup
runCleanup();