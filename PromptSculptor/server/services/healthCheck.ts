import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { checkEmailHealth } from './emailService';

/**
 * Database health check - tests actual database connectivity
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'pass' | 'fail';
  details?: string;
}> {
  let pool: Pool | null = null;
  
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return {
        status: 'fail',
        details: 'Database not configured: DATABASE_URL is missing'
      };
    }

    // Create a temporary connection pool for health check
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Only need one connection for health check
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
    });

    const db = drizzle(pool);

    // Test database connectivity with a simple query
    await db.execute(sql`SELECT 1 as health_check`);

    return {
      status: 'pass',
      details: 'Database connection successful'
    };

  } catch (error) {
    return {
      status: 'fail',
      details: error instanceof Error ? 
        `Database connection failed: ${error.message}` : 
        'Database connection failed'
    };
  } finally {
    // Clean up the temporary connection pool
    if (pool) {
      try {
        await pool.end();
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Warning: Failed to clean up database health check pool:', error);
      }
    }
  }
}

/**
 * Comprehensive system health check
 */
export async function performSystemHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    details?: string;
  }>;
}> {
  const checks = [];

  // Check database connectivity
  const dbHealth = await checkDatabaseHealth();
  checks.push({
    name: 'Database Connection',
    status: dbHealth.status,
    details: dbHealth.details
  });

  // Check email service
  const emailHealth = await checkEmailHealth();
  checks.push({
    name: 'Email Service',
    status: emailHealth.status,
    details: emailHealth.details
  });

  // Determine overall system status
  const failedChecks = checks.filter(check => check.status === 'fail');
  let status: 'healthy' | 'degraded' | 'unhealthy';

  if (failedChecks.length === 0) {
    status = 'healthy';
  } else if (failedChecks.length === checks.length) {
    status = 'unhealthy';
  } else {
    status = 'degraded';
  }

  return {
    status,
    checks
  };
}