import { Router } from 'express';
import { monitoringService, SecurityEventLogger } from '../services/monitoringService.js';
import { cleanupExpiredTokens, getTokenStatistics } from '../services/tokenCleanupService.js';

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
router.get('/security', async (req, res) => {
  try {
    // In production, add proper admin authentication here
    const adminApiKey = req.headers['x-admin-api-key'];
    if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
router.get('/metrics', async (req, res) => {
  try {
    // In production, add proper admin authentication here
    const adminApiKey = req.headers['x-admin-api-key'];
    if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
router.post('/cleanup-tokens', async (req, res) => {
  try {
    // In production, add proper admin authentication here
    const adminApiKey = req.headers['x-admin-api-key'];
    if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
 * Test security event logging (admin only, development only)
 * POST /api/monitoring/test-alert
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test-alert', async (req, res) => {
    try {
      const adminApiKey = req.headers['x-admin-api-key'];
      if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { type, severity } = req.body;
      
      // Log a test security event
      if (type === 'suspicious') {
        SecurityEventLogger.suspiciousActivity(
          'Test suspicious activity alert', 
          { source: 'monitoring test' },
          req.ip
        );
      } else if (type === 'rate-limit') {
        SecurityEventLogger.rateLimitExceeded(req.ip, '/api/monitoring/test-alert');
      } else {
        SecurityEventLogger.invalidTokenAttempt('test-token-123', req.ip);
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

export default router;