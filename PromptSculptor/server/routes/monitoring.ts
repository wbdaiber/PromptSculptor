import { Router } from 'express';
import { monitoringService, SecurityEventLogger } from '../services/monitoringService.js';
import { cleanupExpiredTokens, getTokenStatistics } from '../services/tokenCleanupService.js';
import { userAnalyticsService } from '../services/userAnalyticsService.js';
import { adminAnalyticsService } from '../services/adminAnalyticsService.js';
import { requireAdminAuth } from '../config/oauth.js';
import { performanceMonitor } from '../services/performanceMonitoringService.js';
import { cacheService } from '../services/cacheService.js';
import { databaseMaintenanceService } from '../services/databaseMaintenanceService.js';

const router = Router();

/**
 * Health check endpoint
 * GET /api/monitoring/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.healthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 207 : 503;
    
    res.status(statusCode).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      checks: health.checks
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * Security report endpoint (admin only)
 * GET /api/monitoring/security
 */
router.get('/security', requireAdminAuth, async (req, res) => {
  try {

    const hours = parseInt(req.query.hours as string) || 24;
    const report = monitoringService.generateSecurityReport(hours);
    
    res.json({
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate security report',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Metrics endpoint (admin only)
 * GET /api/monitoring/metrics
 */
router.get('/metrics', requireAdminAuth, async (req, res) => {
  try {

    const metrics = monitoringService.getCurrentMetrics();
    
    // Get token statistics
    let tokenStats;
    try {
      tokenStats = await getTokenStatistics();
    } catch (error) {
      tokenStats = { error: 'Could not retrieve token statistics' };
    }
    
    res.json({
      passwordResetMetrics: metrics,
      tokenStatistics: tokenStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Manual token cleanup endpoint (admin only)
 * POST /api/monitoring/cleanup-tokens
 */
router.post('/cleanup-tokens', requireAdminAuth, async (req, res) => {
  try {

    const result = await cleanupExpiredTokens();
    
    res.json({
      cleanup: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cleanup tokens',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * User growth analytics endpoint (admin only)
 * GET /api/monitoring/user-growth
 */
router.get('/user-growth', requireAdminAuth, async (req, res) => {
  try {

    const period = (req.query.period as '7d' | '30d' | '90d') || '30d';
    const data = await userAnalyticsService.getUserGrowthData(period);
    
    res.json({
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve user growth data',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * User engagement metrics endpoint (admin only)
 * GET /api/monitoring/user-engagement
 */
router.get('/user-engagement', requireAdminAuth, async (req, res) => {
  try {

    const data = await userAnalyticsService.getUserEngagementMetrics();
    
    res.json({
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve user engagement data',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * User retention stats endpoint (admin only)
 * GET /api/monitoring/user-retention
 */
router.get('/user-retention', requireAdminAuth, async (req, res) => {
  try {

    const data = await userAnalyticsService.getUserRetentionStats();
    
    res.json({
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve user retention data',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * User activity data endpoint (admin only)
 * GET /api/monitoring/user-activity
 */
router.get('/user-activity', requireAdminAuth, async (req, res) => {
  try {

    const data = await userAnalyticsService.getUserActivityData();
    
    res.json({
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve user activity data',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Admin analytics dashboard endpoint (admin only)
 * GET /api/monitoring/admin-analytics
 * Uses optimized CTE queries for improved performance
 */
router.get('/admin-analytics', requireAdminAuth, async (req, res) => {
  try {
    const analytics = await adminAnalyticsService.getAnalytics();
    
    res.json({
      analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve admin analytics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * User activity metrics endpoint (admin only)
 * GET /api/monitoring/user-activity-metrics
 * Returns detailed user activity data for admin dashboard
 */
router.get('/user-activity-metrics', requireAdminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const metrics = await adminAnalyticsService.getUserActivityMetrics(limit);
    
    res.json({
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve user activity metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Security metrics endpoint (admin only)
 * GET /api/monitoring/security-metrics
 * Returns security-related metrics from admin analytics service
 */
router.get('/security-metrics', requireAdminAuth, async (req, res) => {
  try {
    const metrics = await adminAnalyticsService.getSecurityMetrics();
    
    res.json({
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve security metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Performance metrics endpoint (admin only)
 * GET /api/monitoring/performance-metrics
 * Returns system performance metrics
 */
router.get('/performance-metrics', requireAdminAuth, async (req, res) => {
  try {
    const metrics = await adminAnalyticsService.getPerformanceMetrics();
    
    res.json({
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Query performance monitoring endpoint (admin only)
 * GET /api/monitoring/query-performance
 * Returns database query performance metrics
 */
router.get('/query-performance', requireAdminAuth, async (_req, res) => {
  try {
    const stats = performanceMonitor.getStats(60); // Last 60 minutes
    const patterns = performanceMonitor.getQueryPatterns();
    
    res.json({
      stats,
      patterns,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve query performance metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Cache statistics endpoint (admin only)
 * GET /api/monitoring/cache-stats
 * Returns cache performance and utilization metrics
 */
router.get('/cache-stats', requireAdminAuth, async (_req, res) => {
  try {
    const cacheStats = cacheService.getStats();
    const cacheKeys = cacheService.getKeys();
    const adminCacheStats = adminAnalyticsService.getCacheStats();
    
    res.json({
      general: cacheStats,
      keys: cacheKeys,
      adminSpecific: adminCacheStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve cache statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Clear cache endpoint (admin only)
 * POST /api/monitoring/cache/clear
 * Clears all or specific cache entries
 */
router.post('/cache/clear', requireAdminAuth, async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (pattern) {
      const cleared = cacheService.invalidatePattern(pattern);
      res.json({
        message: `Cleared ${cleared} cache entries matching pattern: ${pattern}`,
        cleared,
        timestamp: new Date().toISOString()
      });
    } else {
      cacheService.clear();
      res.json({
        message: 'All cache entries cleared',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Export performance metrics (admin only)
 * GET /api/monitoring/export-metrics
 * Returns downloadable JSON of all performance metrics
 */
router.get('/export-metrics', requireAdminAuth, async (_req, res) => {
  try {
    const metricsJson = performanceMonitor.exportMetrics();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="performance-metrics-${Date.now()}.json"`);
    res.send(metricsJson);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to export metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test security event logging (admin only, development only)
 * POST /api/monitoring/test-alert
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test-alert', requireAdminAuth, async (req, res) => {
    try {

      const { type, severity } = req.body;
      
      // Log a test security event
      if (type === 'suspicious') {
        SecurityEventLogger.suspiciousActivity(
          'Test suspicious activity alert', 
          { source: 'monitoring test' },
          req.ip
        );
      } else if (type === 'rate-limit') {
        SecurityEventLogger.rateLimitExceeded(req.ip || '127.0.0.1', '/api/monitoring/test-alert');
      } else {
        SecurityEventLogger.invalidTokenAttempt('test-token-123', req.ip || '127.0.0.1');
      }
      
      res.json({
        message: 'Test security event logged',
        type,
        severity: severity || 'medium',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to log test event',
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Database maintenance status endpoint (admin only)
 * GET /api/monitoring/maintenance/status
 * Returns recent maintenance reports and statistics
 */
router.get('/maintenance/status', requireAdminAuth, async (_req, res) => {
  try {
    const reports = databaseMaintenanceService.getMaintenanceReports(20);
    const dbStats = await databaseMaintenanceService.getDatabaseStats();
    
    res.json({
      reports,
      databaseStats: dbStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve maintenance status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Run specific maintenance task (admin only)
 * POST /api/monitoring/maintenance/run
 * Manually trigger a maintenance task
 */
router.post('/maintenance/run', requireAdminAuth, async (req, res) => {
  try {
    const { task } = req.body;
    
    let report;
    switch (task) {
      case 'cleanupSessions':
        report = await databaseMaintenanceService.cleanupExpiredSessions();
        break;
      case 'cleanupTokens':
        report = await databaseMaintenanceService.cleanupExpiredTokens();
        break;
      case 'aggregateAnalytics':
        report = await databaseMaintenanceService.aggregateAnalyticsData();
        break;
      case 'vacuumAnalyze':
        report = await databaseMaintenanceService.vacuumAnalyze(req.body.tableName);
        break;
      case 'dataRetention':
        report = await databaseMaintenanceService.applyDataRetentionPolicies();
        break;
      case 'all':
        const reports = await databaseMaintenanceService.runAllMaintenanceTasks();
        res.json({
          message: 'All maintenance tasks completed',
          reports,
          timestamp: new Date().toISOString()
        });
        return;
      default:
        return res.status(400).json({
          error: 'Invalid task',
          validTasks: ['cleanupSessions', 'cleanupTokens', 'aggregateAnalytics', 'vacuumAnalyze', 'dataRetention', 'all']
        });
    }
    
    res.json({
      message: `Maintenance task '${task}' completed`,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Maintenance task failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Database statistics endpoint (admin only)
 * GET /api/monitoring/database/stats
 * Returns detailed database statistics
 */
router.get('/database/stats', requireAdminAuth, async (_req, res) => {
  try {
    const stats = await databaseMaintenanceService.getDatabaseStats();
    
    res.json({
      tables: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve database statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Admin query execution statistics endpoint (admin only)
 * GET /api/monitoring/admin/query-stats
 * Returns execution time statistics for admin analytics queries
 */
router.get('/admin/query-stats', requireAdminAuth, async (_req, res) => {
  try {
    const queryStats = adminAnalyticsService.getQueryExecutionStats();
    
    res.json({
      queryExecutionStats: queryStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve admin query statistics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;