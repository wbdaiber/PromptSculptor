import { EventEmitter } from 'events';
import { cacheService } from './cacheService.js';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  source: 'database' | 'cache';
  cacheKey?: string;
}

interface PerformanceStats {
  totalQueries: number;
  totalDuration: number;
  averageDuration: number;
  slowQueries: number;
  failedQueries: number;
  cacheHitRate: number;
  queriesBySource: {
    database: number;
    cache: number;
  };
  slowestQueries: QueryMetrics[];
  recentQueries: QueryMetrics[];
}

export class PerformanceMonitoringService extends EventEmitter {
  private static instance: PerformanceMonitoringService;
  private queryMetrics: QueryMetrics[] = [];
  private readonly MAX_METRICS_STORED = 1000;
  private readonly SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second
  private readonly METRICS_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.startCleanupInterval();
    this.setupCacheMonitoring();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Record a query execution
   */
  recordQuery(
    query: string,
    duration: number,
    success: boolean = true,
    error?: string,
    source: 'database' | 'cache' = 'database',
    cacheKey?: string
  ): void {
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      success,
      error,
      source,
      cacheKey
    };

    this.queryMetrics.push(metric);

    // Trim metrics if we exceed the limit
    if (this.queryMetrics.length > this.MAX_METRICS_STORED) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS_STORED);
    }

    // Log slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD_MS) {
      this.emit('slow-query', metric);
      console.warn(`⚠️ Slow query detected (${duration}ms):`, this.truncateQuery(query));
    }

    // Log failed queries
    if (!success) {
      this.emit('failed-query', metric);
      console.error(`❌ Query failed:`, error, this.truncateQuery(query));
    }

    // Emit general metric event
    this.emit('query-recorded', metric);
  }

  /**
   * Start timing a query
   */
  startTimer(): () => number {
    const startTime = Date.now();
    return () => Date.now() - startTime;
  }

  /**
   * Wrap a database query with performance monitoring
   */
  async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    const stopTimer = this.startTimer();
    
    try {
      const result = await queryFn();
      const duration = stopTimer();
      
      this.recordQuery(
        queryName,
        duration,
        true,
        undefined,
        cacheKey ? 'cache' : 'database',
        cacheKey
      );
      
      return result;
    } catch (error) {
      const duration = stopTimer();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.recordQuery(
        queryName,
        duration,
        false,
        errorMessage,
        'database'
      );
      
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(sinceMinutes: number = 60): PerformanceStats {
    const cutoffTime = new Date(Date.now() - sinceMinutes * 60 * 1000);
    const recentMetrics = this.queryMetrics.filter(m => m.timestamp > cutoffTime);

    const totalQueries = recentMetrics.length;
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalQueries > 0 ? totalDuration / totalQueries : 0;
    const slowQueries = recentMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD_MS).length;
    const failedQueries = recentMetrics.filter(m => !m.success).length;

    const queriesBySource = {
      database: recentMetrics.filter(m => m.source === 'database').length,
      cache: recentMetrics.filter(m => m.source === 'cache').length
    };

    const cacheStats = cacheService.getStats();
    const cacheHitRate = cacheStats.hitRate;

    // Get slowest queries
    const slowestQueries = [...recentMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Get most recent queries
    const recentQueries = [...recentMetrics]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return {
      totalQueries,
      totalDuration,
      averageDuration: Math.round(averageDuration),
      slowQueries,
      failedQueries,
      cacheHitRate,
      queriesBySource,
      slowestQueries,
      recentQueries
    };
  }

  /**
   * Get query patterns (for identifying optimization opportunities)
   */
  getQueryPatterns(): { pattern: string; count: number; avgDuration: number }[] {
    const patterns = new Map<string, { count: number; totalDuration: number }>();

    for (const metric of this.queryMetrics) {
      const pattern = this.extractQueryPattern(metric.query);
      const existing = patterns.get(pattern) || { count: 0, totalDuration: 0 };
      
      patterns.set(pattern, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + metric.duration
      });
    }

    return Array.from(patterns.entries())
      .map(([pattern, stats]) => ({
        pattern,
        count: stats.count,
        avgDuration: Math.round(stats.totalDuration / stats.count)
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    const cleared = this.queryMetrics.length;
    this.queryMetrics = [];
    this.emit('metrics-cleared', { count: cleared });
  }

  /**
   * Setup cache monitoring integration
   */
  private setupCacheMonitoring(): void {
    // Listen to cache events and record them as queries
    cacheService.on('cache:hit', (data) => {
      this.recordQuery(
        `Cache hit: ${data.key}`,
        0, // Cache hits are essentially instant
        true,
        undefined,
        'cache',
        data.key
      );
    });

    cacheService.on('cache:miss', (data) => {
      // Don't record cache misses as queries, but track them for stats
      this.emit('cache-miss', data);
    });
  }

  /**
   * Start cleanup interval to remove old metrics
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Keep 24 hours
      const oldLength = this.queryMetrics.length;
      
      this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoffTime);
      
      const removed = oldLength - this.queryMetrics.length;
      if (removed > 0) {
        this.emit('metrics-cleanup', { removed });
      }
    }, this.METRICS_CLEANUP_INTERVAL);
  }

  /**
   * Sanitize query string for storage
   */
  private sanitizeQuery(query: string): string {
    // Remove sensitive data patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/api_key\s*=\s*'[^']*'/gi, "api_key='***'");
  }

  /**
   * Truncate long queries for logging
   */
  private truncateQuery(query: string, maxLength: number = 200): string {
    if (query.length <= maxLength) return query;
    return query.substring(0, maxLength) + '...';
  }

  /**
   * Extract pattern from query for grouping
   */
  private extractQueryPattern(query: string): string {
    // Simple pattern extraction - can be made more sophisticated
    return query
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/'[^']*'/g, "'?'") // Replace string literals with '?'
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.queryMetrics,
      stats: this.getStats(),
      patterns: this.getQueryPatterns(),
      exportedAt: new Date()
    }, null, 2);
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.removeAllListeners();
    this.queryMetrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitoringService.getInstance();