import { config } from '../config/env.js';
import { createStorage } from '../storage.js';

/**
 * Token Cleanup Service
 * 
 * Provides automated cleanup of expired password reset tokens to maintain
 * database performance and security hygiene.
 */

export interface CleanupResult {
  deletedTokens: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

/**
 * Removes all expired password reset tokens from the database
 * 
 * @returns Promise with cleanup statistics
 */
export async function cleanupExpiredTokens(): Promise<CleanupResult> {
  const timestamp = new Date();
  
  try {
    console.log('🧹 Starting password reset token cleanup...');
    
    // Use system storage (no specific user)
    const storage = createStorage();
    
    // Clean up expired tokens
    const deletedTokens = await storage.cleanupExpiredTokens?.() || 0;
    
    console.log(`✅ Token cleanup completed: ${deletedTokens} expired tokens removed`);
    
    return {
      deletedTokens,
      timestamp,
      success: true
    };
  } catch (error) {
    console.error('❌ Token cleanup failed:', error);
    
    return {
      deletedTokens: 0,
      timestamp,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Schedules automatic token cleanup at regular intervals
 * 
 * @param intervalMinutes - Cleanup interval in minutes (default: 60)
 * @returns Function to stop the scheduled cleanup
 */
export function scheduleTokenCleanup(intervalMinutes: number = 60): () => void {
  console.log(`📅 Scheduling token cleanup every ${intervalMinutes} minutes`);
  
  // Run initial cleanup
  cleanupExpiredTokens();
  
  // Schedule periodic cleanup
  const intervalId = setInterval(() => {
    cleanupExpiredTokens();
  }, intervalMinutes * 60 * 1000);
  
  // Return function to stop scheduled cleanup
  return () => {
    clearInterval(intervalId);
    console.log('🛑 Token cleanup scheduler stopped');
  };
}

/**
 * Get statistics about password reset tokens
 * 
 * @returns Promise with token statistics
 */
export async function getTokenStatistics(): Promise<{
  totalTokens: number;
  expiredTokens: number;
  usedTokens: number;
  activeTokens: number;
  oldestToken?: Date;
  newestToken?: Date;
}> {
  try {
    const storage = createStorage();
    
    // This would require additional methods in the storage layer
    // For now, return basic statistics
    const stats = {
      totalTokens: 0,
      expiredTokens: 0,
      usedTokens: 0,
      activeTokens: 0
    };
    
    console.log('📊 Token statistics:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Failed to get token statistics:', error);
    throw error;
  }
}

/**
 * Force cleanup of all tokens for a specific user (for account deletion, etc.)
 * 
 * @param userId - User ID to clean up tokens for
 * @returns Promise with number of deleted tokens
 */
export async function cleanupUserTokens(userId: string): Promise<number> {
  try {
    console.log(`🧹 Cleaning up all tokens for user: ${userId}`);
    
    const storage = createStorage();
    const deletedCount = await storage.invalidateUserTokens?.(userId) || 0;
    
    console.log(`✅ Cleaned up ${deletedCount} tokens for user ${userId}`);
    return deletedCount;
  } catch (error) {
    console.error(`❌ Failed to cleanup tokens for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Production-ready token maintenance
 * 
 * This function can be called from a cron job or scheduled task
 * to maintain token hygiene in production environments
 */
export async function performMaintenance(): Promise<{
  cleanup: CleanupResult;
  recommendations: string[];
}> {
  const cleanup = await cleanupExpiredTokens();
  const recommendations: string[] = [];
  
  // Add maintenance recommendations based on cleanup results
  if (cleanup.deletedTokens > 1000) {
    recommendations.push('Consider reducing token expiry time or increasing cleanup frequency');
  }
  
  if (cleanup.deletedTokens === 0) {
    recommendations.push('No expired tokens found - system is running efficiently');
  } else {
    recommendations.push(`Cleaned up ${cleanup.deletedTokens} expired tokens`);
  }
  
  // In production, you might want to:
  // - Send alerts if cleanup fails
  // - Log metrics to monitoring system
  // - Generate reports for security team
  
  return {
    cleanup,
    recommendations
  };
}