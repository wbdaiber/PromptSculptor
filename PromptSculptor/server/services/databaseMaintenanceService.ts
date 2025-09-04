import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { performanceMonitor } from './performanceMonitoringService.js';
import { cacheInvalidationService } from './cacheInvalidationService.js';

interface MaintenanceTask {
  name: string;
  schedule: string;
  lastRun?: Date;
  nextRun?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

interface MaintenanceReport {
  task: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  rowsAffected?: number;
  success: boolean;
  error?: string;
}

export class DatabaseMaintenanceService extends EventEmitter {
  private static instance: DatabaseMaintenanceService;
  private db: ReturnType<typeof drizzle>;
  private pool: Pool;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private maintenanceReports: MaintenanceReport[] = [];
  private readonly MAX_REPORTS = 100;
  
  // Maintenance intervals (in milliseconds)
  private readonly INTERVALS = {
    sessionCleanup: 60 * 60 * 1000,        // 1 hour
    tokenCleanup: 4 * 60 * 60 * 1000,      // 4 hours  
    analyticsAggregation: 24 * 60 * 60 * 1000,  // 24 hours
    vacuumAnalyze: 7 * 24 * 60 * 60 * 1000,     // 7 days
    dataRetention: 30 * 24 * 60 * 60 * 1000,    // 30 days
  };

  private constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Limited pool for maintenance tasks
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    this.db = drizzle(this.pool);
    
    // Detect if running in Vercel serverless environment
    const isVercel = process.env.VERCEL === '1';
    const isDisabled = process.env.DISABLE_MAINTENANCE_SCHEDULER === 'true';
    
    // Only start scheduler in non-serverless environments
    // In Vercel, maintenance tasks should be triggered via API endpoints or Vercel Cron Jobs
    if (!isVercel && !isDisabled && (process.env.NODE_ENV === 'production' || process.env.ENABLE_MAINTENANCE === 'true')) {
      this.startMaintenanceScheduler();
      console.log('🔧 Database maintenance scheduler started (non-serverless environment)');
    } else if (isVercel) {
      console.log('ℹ️ Database maintenance scheduler disabled (Vercel serverless environment detected)');
      console.log('ℹ️ Use admin API endpoints or Vercel Cron Jobs to trigger maintenance tasks');
    } else if (isDisabled) {
      console.log('ℹ️ Database maintenance scheduler disabled (DISABLE_MAINTENANCE_SCHEDULER=true)');
    }
  }

  static getInstance(): DatabaseMaintenanceService {
    if (!DatabaseMaintenanceService.instance) {
      DatabaseMaintenanceService.instance = new DatabaseMaintenanceService();
    }
    return DatabaseMaintenanceService.instance;
  }

  /**
   * Clean up expired OAuth sessions
   */
  async cleanupExpiredSessions(): Promise<MaintenanceReport> {
    const startTime = new Date();
    const stopTimer = performanceMonitor.startTimer();
    
    try {
      const result = await this.db.execute(sql`
        DELETE FROM user_sessions 
        WHERE expires_at < NOW()
      `);
      
      const duration = stopTimer();
      const rowsAffected = (result as any).rowCount || 0;
      
      performanceMonitor.recordQuery(
        'Maintenance.cleanupExpiredSessions',
        duration,
        true,
        undefined,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: 'cleanupExpiredSessions',
        startTime,
        endTime: new Date(),
        duration,
        rowsAffected,
        success: true
      };
      
      this.addReport(report);
      this.emit('maintenance:completed', report);
      
      // Invalidate session-related caches
      if (rowsAffected > 0) {
        cacheInvalidationService.invalidateAll();
      }
      
      console.log(`✅ Cleaned up ${rowsAffected} expired sessions in ${duration}ms`);
      return report;
      
    } catch (error) {
      const duration = stopTimer();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      performanceMonitor.recordQuery(
        'Maintenance.cleanupExpiredSessions',
        duration,
        false,
        errorMessage,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: 'cleanupExpiredSessions',
        startTime,
        endTime: new Date(),
        duration,
        success: false,
        error: errorMessage
      };
      
      this.addReport(report);
      this.emit('maintenance:failed', report);
      
      console.error(`❌ Session cleanup failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Clean up expired password reset tokens
   */
  async cleanupExpiredTokens(): Promise<MaintenanceReport> {
    const startTime = new Date();
    const stopTimer = performanceMonitor.startTimer();
    
    try {
      const result = await this.db.execute(sql`
        DELETE FROM password_reset_tokens 
        WHERE expires_at < NOW() 
        OR (used_at IS NOT NULL AND created_at < NOW() - INTERVAL '7 days')
      `);
      
      const duration = stopTimer();
      const rowsAffected = (result as any).rowCount || 0;
      
      performanceMonitor.recordQuery(
        'Maintenance.cleanupExpiredTokens',
        duration,
        true,
        undefined,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: 'cleanupExpiredTokens',
        startTime,
        endTime: new Date(),
        duration,
        rowsAffected,
        success: true
      };
      
      this.addReport(report);
      this.emit('maintenance:completed', report);
      
      // Invalidate security metrics cache
      if (rowsAffected > 0) {
        cacheInvalidationService.onPasswordResetTokenChanged();
      }
      
      console.log(`✅ Cleaned up ${rowsAffected} expired tokens in ${duration}ms`);
      return report;
      
    } catch (error) {
      const duration = stopTimer();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      performanceMonitor.recordQuery(
        'Maintenance.cleanupExpiredTokens',
        duration,
        false,
        errorMessage,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: 'cleanupExpiredTokens',
        startTime,
        endTime: new Date(),
        duration,
        success: false,
        error: errorMessage
      };
      
      this.addReport(report);
      this.emit('maintenance:failed', report);
      
      console.error(`❌ Token cleanup failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Aggregate analytics data for performance
   */
  async aggregateAnalyticsData(): Promise<MaintenanceReport> {
    const startTime = new Date();
    const stopTimer = performanceMonitor.startTimer();
    
    try {
      // Create or update daily analytics summary
      const result = await this.db.execute(sql`
        INSERT INTO analytics_daily_summary (
          date,
          total_users,
          active_users,
          total_prompts,
          new_prompts,
          total_api_calls
        )
        SELECT 
          CURRENT_DATE - INTERVAL '1 day' as date,
          (SELECT COUNT(*) FROM users WHERE is_deleted = false) as total_users,
          (SELECT COUNT(DISTINCT user_id) FROM prompts WHERE created_at >= CURRENT_DATE - INTERVAL '1 day') as active_users,
          (SELECT COUNT(*) FROM prompts) as total_prompts,
          (SELECT COUNT(*) FROM prompts WHERE created_at >= CURRENT_DATE - INTERVAL '1 day') as new_prompts,
          (SELECT COUNT(*) FROM prompts WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND user_id IS NOT NULL) as total_api_calls
        ON CONFLICT (date) DO UPDATE SET
          total_users = EXCLUDED.total_users,
          active_users = EXCLUDED.active_users,
          total_prompts = EXCLUDED.total_prompts,
          new_prompts = EXCLUDED.new_prompts,
          total_api_calls = EXCLUDED.total_api_calls,
          updated_at = NOW()
      `);
      
      const duration = stopTimer();
      
      performanceMonitor.recordQuery(
        'Maintenance.aggregateAnalyticsData',
        duration,
        true,
        undefined,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: 'aggregateAnalyticsData',
        startTime,
        endTime: new Date(),
        duration,
        success: true
      };
      
      this.addReport(report);
      this.emit('maintenance:completed', report);
      
      // Invalidate analytics caches
      cacheInvalidationService.invalidateAll();
      
      console.log(`✅ Analytics aggregation completed in ${duration}ms`);
      return report;
      
    } catch (error) {
      const duration = stopTimer();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if table doesn't exist (expected on first run)
      if (errorMessage.includes('analytics_daily_summary')) {
        console.log('ℹ️ Analytics summary table not found - skipping aggregation');
        return {
          task: 'aggregateAnalyticsData',
          startTime,
          endTime: new Date(),
          duration,
          success: true
        };
      }
      
      performanceMonitor.recordQuery(
        'Maintenance.aggregateAnalyticsData',
        duration,
        false,
        errorMessage,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: 'aggregateAnalyticsData',
        startTime,
        endTime: new Date(),
        duration,
        success: false,
        error: errorMessage
      };
      
      this.addReport(report);
      this.emit('maintenance:failed', report);
      
      console.error(`❌ Analytics aggregation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Run VACUUM ANALYZE for database optimization
   */
  async vacuumAnalyze(tableName?: string): Promise<MaintenanceReport> {
    const startTime = new Date();
    const stopTimer = performanceMonitor.startTimer();
    const target = tableName || 'all tables';
    
    try {
      if (tableName) {
        // Vacuum specific table
        await this.db.execute(sql.raw(`VACUUM ANALYZE ${tableName}`));
      } else {
        // Vacuum all user tables
        const tables = ['users', 'prompts', 'templates', 'user_api_keys', 'user_sessions', 'password_reset_tokens'];
        for (const table of tables) {
          await this.db.execute(sql.raw(`VACUUM ANALYZE ${table}`));
        }
      }
      
      const duration = stopTimer();
      
      performanceMonitor.recordQuery(
        `Maintenance.vacuumAnalyze(${target})`,
        duration,
        true,
        undefined,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: `vacuumAnalyze:${target}`,
        startTime,
        endTime: new Date(),
        duration,
        success: true
      };
      
      this.addReport(report);
      this.emit('maintenance:completed', report);
      
      console.log(`✅ VACUUM ANALYZE completed for ${target} in ${duration}ms`);
      return report;
      
    } catch (error) {
      const duration = stopTimer();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      performanceMonitor.recordQuery(
        `Maintenance.vacuumAnalyze(${target})`,
        duration,
        false,
        errorMessage,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: `vacuumAnalyze:${target}`,
        startTime,
        endTime: new Date(),
        duration,
        success: false,
        error: errorMessage
      };
      
      this.addReport(report);
      this.emit('maintenance:failed', report);
      
      console.error(`❌ VACUUM ANALYZE failed for ${target}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Apply data retention policies
   */
  async applyDataRetentionPolicies(): Promise<MaintenanceReport> {
    const startTime = new Date();
    const stopTimer = performanceMonitor.startTimer();
    let totalDeleted = 0;
    
    try {
      // Delete old analytics data (keep last 90 days)
      const analyticsResult = await this.db.execute(sql`
        DELETE FROM prompts 
        WHERE created_at < NOW() - INTERVAL '90 days'
        AND user_id IS NULL
      `);
      totalDeleted += (analyticsResult as any).rowCount || 0;
      
      // Delete old session data (already handled by session cleanup)
      
      // Delete permanently soft-deleted users (handled by userCleanupService)
      
      const duration = stopTimer();
      
      performanceMonitor.recordQuery(
        'Maintenance.applyDataRetentionPolicies',
        duration,
        true,
        undefined,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: 'applyDataRetentionPolicies',
        startTime,
        endTime: new Date(),
        duration,
        rowsAffected: totalDeleted,
        success: true
      };
      
      this.addReport(report);
      this.emit('maintenance:completed', report);
      
      if (totalDeleted > 0) {
        cacheInvalidationService.invalidateAll();
      }
      
      console.log(`✅ Data retention policies applied: ${totalDeleted} rows deleted in ${duration}ms`);
      return report;
      
    } catch (error) {
      const duration = stopTimer();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      performanceMonitor.recordQuery(
        'Maintenance.applyDataRetentionPolicies',
        duration,
        false,
        errorMessage,
        'database'
      );
      
      const report: MaintenanceReport = {
        task: 'applyDataRetentionPolicies',
        startTime,
        endTime: new Date(),
        duration,
        success: false,
        error: errorMessage
      };
      
      this.addReport(report);
      this.emit('maintenance:failed', report);
      
      console.error(`❌ Data retention policy application failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_live_tup as row_count,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      return (result as any).rows;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Run all maintenance tasks
   */
  async runAllMaintenanceTasks(): Promise<MaintenanceReport[]> {
    const reports: MaintenanceReport[] = [];
    
    console.log('🔧 Starting comprehensive database maintenance...');
    
    // Run tasks in sequence to avoid overloading the database
    const tasks = [
      () => this.cleanupExpiredSessions(),
      () => this.cleanupExpiredTokens(),
      () => this.aggregateAnalyticsData(),
      () => this.applyDataRetentionPolicies(),
      () => this.vacuumAnalyze(),
    ];
    
    for (const task of tasks) {
      try {
        const report = await task();
        reports.push(report);
      } catch (error) {
        console.error('Maintenance task failed:', error);
        // Continue with other tasks even if one fails
      }
    }
    
    console.log('✅ Database maintenance completed');
    return reports;
  }

  /**
   * Get maintenance reports
   */
  getMaintenanceReports(limit: number = 20): MaintenanceReport[] {
    return this.maintenanceReports.slice(-limit);
  }

  /**
   * Add a maintenance report
   */
  private addReport(report: MaintenanceReport): void {
    this.maintenanceReports.push(report);
    
    // Trim reports if we exceed the limit
    if (this.maintenanceReports.length > this.MAX_REPORTS) {
      this.maintenanceReports = this.maintenanceReports.slice(-this.MAX_REPORTS);
    }
  }

  /**
   * Start maintenance scheduler
   * Note: This is disabled in Vercel serverless environments to prevent duplicate executions
   */
  private startMaintenanceScheduler(): void {
    console.log('🔧 Starting database maintenance scheduler');
    
    // Session cleanup - every hour
    setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, this.INTERVALS.sessionCleanup);
    
    // Token cleanup - every 4 hours
    setInterval(() => {
      this.cleanupExpiredTokens().catch(console.error);
    }, this.INTERVALS.tokenCleanup);
    
    // Analytics aggregation - daily
    setInterval(() => {
      this.aggregateAnalyticsData().catch(console.error);
    }, this.INTERVALS.analyticsAggregation);
    
    // Vacuum analyze - weekly
    setInterval(() => {
      this.vacuumAnalyze().catch(console.error);
    }, this.INTERVALS.vacuumAnalyze);
    
    // Data retention - monthly
    setInterval(() => {
      this.applyDataRetentionPolicies().catch(console.error);
    }, this.INTERVALS.dataRetention);
    
    // Run initial cleanup after 1 minute
    setTimeout(() => {
      this.cleanupExpiredSessions().catch(console.error);
      this.cleanupExpiredTokens().catch(console.error);
    }, 60000);
  }

  /**
   * Stop maintenance scheduler and cleanup
   */
  async destroy(): Promise<void> {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    
    await this.pool.end();
    this.removeAllListeners();
    
    console.log('🔧 Database maintenance service stopped');
  }
}

// Export singleton instance
export const databaseMaintenanceService = DatabaseMaintenanceService.getInstance();