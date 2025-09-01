import { drizzle } from 'drizzle-orm/node-postgres';
import { sql, count, countDistinct, desc } from 'drizzle-orm';
import { Pool } from 'pg';
import { prompts, users, userApiKeys, passwordResetTokens } from '@shared/schema';
import { cacheService, CacheKeys, CacheTTL } from './cacheService';
import { performanceMonitor } from './performanceMonitoringService';

export interface AdminAnalytics {
  totalUsers: number;
  totalPrompts: number;
  activeUsers: number;
  favoritePrompts: number;
  templateUsage: { templateType: string; usageCount: number }[];
  apiKeyAdoption: number;
  recentActivity: {
    newUsersToday: number;
    promptsToday: number;
    activeTokens: number;
  };
}

export interface UserActivityMetrics {
  userId: string;
  username: string;
  email: string;
  promptCount: number;
  favoriteCount: number;
  lastActivityDate: Date | null;
  joinedDate: Date;
}

export class AdminAnalyticsService {
  private db: ReturnType<typeof drizzle>;
  private static pool: Pool | null = null;
  private queryExecutionTimes: Map<string, number[]> = new Map();

  constructor() {
    if (!AdminAnalyticsService.pool) {
      AdminAnalyticsService.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      
      // Enhanced logging for pool creation
      console.log('✅ [ADMIN ANALYTICS] Database pool created:', {
        maxConnections: 10,
        idleTimeout: '30s',
        connectionTimeout: '2s',
        timestamp: new Date().toISOString()
      });
    }
    this.db = drizzle(AdminAnalyticsService.pool);
  }

  /**
   * Get consolidated admin analytics using optimized CTE query with caching
   * This replaces 6+ separate database queries with a single efficient query
   * Results are cached for improved performance
   */
  async getAnalytics(): Promise<AdminAnalytics> {
    const cacheKey = CacheKeys.adminAnalytics();
    
    // Use the cached helper for automatic cache management
    return cacheService.cached(
      cacheKey,
      async () => this.fetchAnalytics(),
      CacheTTL.adminAnalytics
    );
  }

  /**
   * Internal method to fetch analytics from database with performance monitoring
   */
  private async fetchAnalytics(): Promise<AdminAnalytics> {
    const stopTimer = performanceMonitor.startTimer();
    
    try {
      // Optimized CTE query that gets all analytics data in a single database call
      const result = await this.db.execute(sql`
        WITH user_stats AS (
          SELECT COUNT(*) as total_users
          FROM users 
          WHERE is_deleted = false
        ),
        prompt_stats AS (
          SELECT 
            COUNT(*) as total_prompts,
            COUNT(DISTINCT user_id) as active_users,
            COUNT(CASE WHEN is_favorite THEN 1 END) as favorite_prompts
          FROM prompts 
          WHERE user_id IS NOT NULL
        ),
        template_stats AS (
          SELECT 
            template_type, 
            COUNT(*) as usage_count
          FROM prompts 
          WHERE template_type IS NOT NULL
          GROUP BY template_type
          ORDER BY usage_count DESC
          LIMIT 10
        ),
        api_key_stats AS (
          SELECT COUNT(DISTINCT user_id) as api_users
          FROM user_api_keys
        ),
        activity_today AS (
          SELECT 
            COUNT(CASE WHEN u.created_at >= CURRENT_DATE THEN 1 END) as new_users_today,
            COUNT(CASE WHEN p.created_at >= CURRENT_DATE THEN 1 END) as prompts_today
          FROM users u
          FULL OUTER JOIN prompts p ON u.id = p.user_id
          WHERE u.is_deleted = false OR u.is_deleted IS NULL
        ),
        token_stats AS (
          SELECT COUNT(*) as active_tokens
          FROM password_reset_tokens
          WHERE expires_at > NOW() AND used_at IS NULL
        )
        SELECT 
          us.total_users,
          COALESCE(ps.total_prompts, 0) as total_prompts,
          COALESCE(ps.active_users, 0) as active_users,
          COALESCE(ps.favorite_prompts, 0) as favorite_prompts,
          COALESCE(aks.api_users, 0) as api_key_adoption,
          COALESCE(at.new_users_today, 0) as new_users_today,
          COALESCE(at.prompts_today, 0) as prompts_today,
          COALESCE(ts.active_tokens, 0) as active_tokens
        FROM user_stats us
        CROSS JOIN prompt_stats ps
        CROSS JOIN api_key_stats aks
        CROSS JOIN activity_today at
        CROSS JOIN token_stats ts
      `);

      const mainStats = (result as any).rows[0] as any;
      
      // Record main analytics query performance
      const mainQueryDuration = stopTimer();
      this.recordQueryTime('fetchAnalytics.mainStats', mainQueryDuration);
      performanceMonitor.recordQuery(
        'AdminAnalytics.fetchAnalytics.mainStats',
        mainQueryDuration,
        true,
        undefined,
        'database'
      );

      // Get template usage stats separately for better performance
      const templateTimer = performanceMonitor.startTimer();
      const templateUsageResult = await this.db.execute(sql`
        SELECT 
          template_type as "templateType", 
          COUNT(*) as "usageCount"
        FROM prompts 
        WHERE template_type IS NOT NULL
        GROUP BY template_type
        ORDER BY "usageCount" DESC
        LIMIT 10
      `) as unknown as any[];
      
      // Record template usage query performance
      const templateDuration = templateTimer();
      this.recordQueryTime('fetchAnalytics.templateUsage', templateDuration);
      performanceMonitor.recordQuery(
        'AdminAnalytics.fetchAnalytics.templateUsage',
        templateDuration,
        true,
        undefined,
        'database'
      );

      return {
        totalUsers: Number(mainStats.total_users),
        totalPrompts: Number(mainStats.total_prompts),
        activeUsers: Number(mainStats.active_users),
        favoritePrompts: Number(mainStats.favorite_prompts),
        templateUsage: templateUsageResult.map((row: any) => ({
          templateType: row.templateType as string,
          usageCount: Number(row.usageCount)
        })),
        apiKeyAdoption: Number(mainStats.api_key_adoption),
        recentActivity: {
          newUsersToday: Number(mainStats.new_users_today),
          promptsToday: Number(mainStats.prompts_today),
          activeTokens: Number(mainStats.active_tokens),
        },
      };
    } catch (error) {
      const duration = stopTimer();
      performanceMonitor.recordQuery(
        'AdminAnalytics.fetchAnalytics',
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error',
        'database'
      );
      // Enhanced error logging with context
      console.error('❌ [ADMIN ANALYTICS ERROR] Failed to fetch admin analytics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
        queryType: 'admin-analytics-main'
      });
      throw new Error('Failed to fetch admin analytics');
    }
  }

  /**
   * Get detailed user activity metrics for admin dashboard with caching
   */
  async getUserActivityMetrics(limit: number = 50): Promise<UserActivityMetrics[]> {
    const cacheKey = CacheKeys.userActivityMetrics(limit);
    
    return cacheService.cached(
      cacheKey,
      async () => this.fetchUserActivityMetrics(limit),
      CacheTTL.userActivityMetrics
    );
  }

  /**
   * Internal method to fetch user activity metrics from database with performance monitoring
   */
  private async fetchUserActivityMetrics(limit: number): Promise<UserActivityMetrics[]> {
    const stopTimer = performanceMonitor.startTimer();
    
    try {
      const result = await this.db.execute(sql`
        SELECT 
          u.id as "userId",
          u.username,
          u.email,
          COALESCE(p.prompt_count, 0) as "promptCount",
          COALESCE(p.favorite_count, 0) as "favoriteCount",
          p.last_activity_date as "lastActivityDate",
          u.created_at as "joinedDate"
        FROM users u
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(*) as prompt_count,
            COUNT(CASE WHEN is_favorite THEN 1 END) as favorite_count,
            MAX(created_at) as last_activity_date
          FROM prompts
          WHERE user_id IS NOT NULL
          GROUP BY user_id
        ) p ON u.id = p.user_id
        WHERE u.is_deleted = false
        ORDER BY COALESCE(p.last_activity_date, u.created_at) DESC
        LIMIT ${limit}
      `);
      
      const duration = stopTimer();
      this.recordQueryTime(`fetchUserActivityMetrics(${limit})`, duration);
      performanceMonitor.recordQuery(
        `AdminAnalytics.fetchUserActivityMetrics(limit=${limit})`,
        duration,
        true,
        undefined,
        'database'
      );

      return (result as unknown as any[]).map((row: any) => ({
        userId: row.userId as string,
        username: row.username as string,
        email: row.email as string,
        promptCount: Number(row.promptCount),
        favoriteCount: Number(row.favoriteCount),
        lastActivityDate: row.lastActivityDate ? new Date(row.lastActivityDate as string) : null,
        joinedDate: new Date(row.joinedDate as string),
      }));
    } catch (error) {
      const duration = stopTimer();
      performanceMonitor.recordQuery(
        `AdminAnalytics.fetchUserActivityMetrics(limit=${limit})`,
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error',
        'database'
      );
      // Enhanced error logging with context
      console.error('❌ [ADMIN ANALYTICS ERROR] Failed to fetch user activity metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        limit,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
        queryType: 'user-activity-metrics'
      });
      throw new Error('Failed to fetch user activity metrics');
    }
  }

  /**
   * Get security monitoring metrics for admin dashboard with caching
   */
  async getSecurityMetrics(): Promise<{
    expiredTokens: number;
    recentPasswordResets: number;
    suspiciousActivity: number;
  }> {
    const cacheKey = CacheKeys.securityMetrics();
    
    return cacheService.cached(
      cacheKey,
      async () => this.fetchSecurityMetrics(),
      CacheTTL.securityMetrics
    );
  }

  /**
   * Internal method to fetch security metrics from database with performance monitoring
   */
  private async fetchSecurityMetrics(): Promise<{
    expiredTokens: number;
    recentPasswordResets: number;
    suspiciousActivity: number;
  }> {
    const stopTimer = performanceMonitor.startTimer();
    
    try {
      const result = await this.db.execute(sql`
        WITH security_stats AS (
          SELECT 
            COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_resets,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' AND used_at IS NULL THEN 1 END) as suspicious_activity
          FROM password_reset_tokens
        )
        SELECT * FROM security_stats
      `);
      
      const duration = stopTimer();
      this.recordQueryTime('fetchSecurityMetrics', duration);
      performanceMonitor.recordQuery(
        'AdminAnalytics.fetchSecurityMetrics',
        duration,
        true,
        undefined,
        'database'
      );

      const stats = (result as any).rows[0];
      return {
        expiredTokens: Number(stats.expired_tokens),
        recentPasswordResets: Number(stats.recent_resets),
        suspiciousActivity: Number(stats.suspicious_activity),
      };
    } catch (error) {
      const duration = stopTimer();
      performanceMonitor.recordQuery(
        'AdminAnalytics.fetchSecurityMetrics',
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error',
        'database'
      );
      // Enhanced error logging with context
      console.error('❌ [ADMIN ANALYTICS ERROR] Failed to fetch security metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
        queryType: 'security-metrics'
      });
      throw new Error('Failed to fetch security metrics');
    }
  }

  /**
   * Get system performance metrics with caching
   */
  async getPerformanceMetrics(): Promise<{
    avgPromptsPerUser: number;
    favoriteRatio: number;
    apiKeyAdoptionRate: number;
  }> {
    const cacheKey = CacheKeys.performanceMetrics();
    
    return cacheService.cached(
      cacheKey,
      async () => this.fetchPerformanceMetrics(),
      CacheTTL.performanceMetrics
    );
  }

  /**
   * Internal method to fetch performance metrics from database with monitoring
   */
  private async fetchPerformanceMetrics(): Promise<{
    avgPromptsPerUser: number;
    favoriteRatio: number;
    apiKeyAdoptionRate: number;
  }> {
    const stopTimer = performanceMonitor.startTimer();
    
    try {
      const result = await this.db.execute(sql`
        WITH performance_stats AS (
          SELECT 
            COALESCE(
              ROUND(
                (SELECT COUNT(*) FROM prompts WHERE user_id IS NOT NULL)::numeric / 
                NULLIF((SELECT COUNT(*) FROM users WHERE is_deleted = false), 0), 
                2
              ), 0
            ) as avg_prompts_per_user,
            COALESCE(
              ROUND(
                (SELECT COUNT(*) FROM prompts WHERE is_favorite = true)::numeric /
                NULLIF((SELECT COUNT(*) FROM prompts WHERE user_id IS NOT NULL), 0) * 100,
                2
              ), 0
            ) as favorite_ratio,
            COALESCE(
              ROUND(
                (SELECT COUNT(DISTINCT user_id) FROM user_api_keys)::numeric /
                NULLIF((SELECT COUNT(*) FROM users WHERE is_deleted = false), 0) * 100,
                2
              ), 0
            ) as api_adoption_rate
        )
        SELECT * FROM performance_stats
      `);
      
      const duration = stopTimer();
      this.recordQueryTime('fetchPerformanceMetrics', duration);
      performanceMonitor.recordQuery(
        'AdminAnalytics.fetchPerformanceMetrics',
        duration,
        true,
        undefined,
        'database'
      );

      const stats = (result as any).rows[0];
      return {
        avgPromptsPerUser: Number(stats.avg_prompts_per_user),
        favoriteRatio: Number(stats.favorite_ratio),
        apiKeyAdoptionRate: Number(stats.api_adoption_rate),
      };
    } catch (error) {
      const duration = stopTimer();
      performanceMonitor.recordQuery(
        'AdminAnalytics.fetchPerformanceMetrics',
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error',
        'database'
      );
      // Enhanced error logging with context
      console.error('❌ [ADMIN ANALYTICS ERROR] Failed to fetch performance metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
        queryType: 'performance-metrics'
      });
      throw new Error('Failed to fetch performance metrics');
    }
  }

  /**
   * Invalidate all admin analytics caches
   * Call this when data changes that would affect analytics
   */
  invalidateCache(pattern?: string): void {
    if (pattern) {
      cacheService.invalidatePattern(pattern);
    } else {
      // Invalidate all admin analytics caches
      cacheService.invalidatePattern(/^admin:analytics:/);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Get query execution time statistics for performance monitoring
   */
  getQueryExecutionStats() {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    Array.from(this.queryExecutionTimes.entries()).forEach(([query, times]) => {
      if (times.length === 0) return;
      
      stats[query] = {
        avg: Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length),
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length
      };
    });
    
    return stats;
  }

  /**
   * Record query execution time for monitoring
   */
  private recordQueryTime(queryName: string, duration: number): void {
    if (!this.queryExecutionTimes.has(queryName)) {
      this.queryExecutionTimes.set(queryName, []);
    }
    
    const times = this.queryExecutionTimes.get(queryName)!;
    times.push(duration);
    
    // Keep only last 100 execution times per query
    if (times.length > 100) {
      times.shift();
    }
    
    // Log slow queries
    if (duration > 2000) { // Log queries taking more than 2 seconds
      console.warn('⚠️ [SLOW QUERY] Admin analytics query exceeded 2s:', {
        queryName,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Close database connection pool
   */
  static async closePool(): Promise<void> {
    if (AdminAnalyticsService.pool) {
      await AdminAnalyticsService.pool.end();
      AdminAnalyticsService.pool = null;
    }
  }
}

// Export singleton instance
export const adminAnalyticsService = new AdminAnalyticsService();