// No longer needed as we use direct database connection
import { users } from '@shared/schema';
import { and, lt, eq, isNotNull, sql } from 'drizzle-orm';

export class UserCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static RETENTION_DAYS = parseInt(process.env.USER_RETENTION_DAYS || '30');
  private static CLEANUP_INTERVAL_HOURS = parseInt(process.env.CLEANUP_INTERVAL_HOURS || '24');
  
  static start() {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Run cleanup immediately on start
    this.performCleanup();
    
    // Schedule regular cleanups
    const intervalMs = this.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, intervalMs);
    
    console.log(`User cleanup service started - runs every ${this.CLEANUP_INTERVAL_HOURS} hours`);
  }
  
  static stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('User cleanup service stopped');
    }
  }
  
  private static async performCleanup() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);
      
      // Use a separate database instance for cleanup operations
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const { Pool } = await import('pg');
      
      const cleanupPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1, // Single connection for cleanup
      });
      const cleanupDb = drizzle(cleanupPool);
      
      try {
        // Count users eligible for permanent deletion
        const eligibleUsers = await cleanupDb
          .select({ count: sql`count(*)` })
          .from(users)
          .where(and(
            eq(users.isDeleted, true),
            isNotNull(users.deletedAt),
            lt(users.deletedAt, cutoffDate)
          ));
        
        const count = Number(eligibleUsers[0]?.count) || 0;
        
        if (count > 0) {
          // Permanently delete old soft-deleted users
          const result = await cleanupDb
            .delete(users)
            .where(and(
              eq(users.isDeleted, true),
              isNotNull(users.deletedAt),
              lt(users.deletedAt, cutoffDate)
            ))
            .returning({ id: users.id });
          
          console.log(`Cleanup: Permanently deleted ${result.length} users older than ${this.RETENTION_DAYS} days`);
          
          // Optional: Send metrics to monitoring service
          if (process.env.MONITORING_ENABLED === 'true') {
            await this.reportCleanupMetrics(result.length);
          }
        } else {
          console.log('Cleanup: No users eligible for permanent deletion');
        }
      } finally {
        // Always close the cleanup pool
        await cleanupPool.end();
      }
    } catch (error) {
      console.error('Error during user cleanup:', error);
      // Don't throw - service should continue running despite errors
    }
  }
  
  private static async reportCleanupMetrics(deletedCount: number) {
    // Report to monitoring service (e.g., Datadog, CloudWatch)
    console.log(`Metrics: ${deletedCount} users permanently deleted`);
  }
}