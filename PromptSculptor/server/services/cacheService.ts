import { EventEmitter } from 'events';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
}

export class CacheService extends EventEmitter {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    size: 0,
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of entries

  constructor() {
    super();
    this.startCleanupInterval();
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      this.emit('cache:miss', { key });
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry has expired
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      this.updateHitRate();
      this.emit('cache:expired', { key });
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    this.emit('cache:hit', { key });
    return entry.data as T;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.DEFAULT_TTL;
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.emit('cache:evict', { key: firstKey });
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    this.stats.sets++;
    this.stats.size = this.cache.size;
    this.emit('cache:set', { key, ttl });
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      this.emit('cache:delete', { key });
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.stats.size = 0;
    this.emit('cache:clear', { entriesCleared: size });
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let invalidated = 0;

    Array.from(this.cache.keys()).forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    });

    if (invalidated > 0) {
      this.stats.deletes += invalidated;
      this.stats.size = this.cache.size;
      this.emit('cache:invalidate', { pattern: pattern.toString(), count: invalidated });
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if a key exists in cache (regardless of expiration)
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Perform cache operation with automatic caching
   */
  async cached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    try {
      const data = await fetchFn();
      this.set(key, data, ttlMs);
      return data;
    } catch (error) {
      this.emit('cache:fetch-error', { key, error });
      throw error;
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.stats.size = this.cache.size;
      this.emit('cache:cleanup', { entriesCleaned: cleaned });
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance for global cache
export const cacheService = new CacheService();

// Export cache key generators for consistency
export const CacheKeys = {
  // Admin analytics cache keys
  adminAnalytics: () => 'admin:analytics:main',
  userActivityMetrics: (limit: number) => `admin:analytics:user-activity:${limit}`,
  securityMetrics: () => 'admin:analytics:security',
  performanceMetrics: () => 'admin:analytics:performance',
  
  // User-specific cache keys
  userPrompts: (userId: string) => `user:${userId}:prompts`,
  userFavorites: (userId: string) => `user:${userId}:favorites`,
  userRecent: (userId: string) => `user:${userId}:recent`,
  
  // Template cache keys
  templates: () => 'templates:all',
  userTemplates: (userId: string) => `templates:user:${userId}`,
};

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  // Admin analytics - longer TTL since data changes less frequently
  adminAnalytics: 10 * 60 * 1000,        // 10 minutes
  userActivityMetrics: 5 * 60 * 1000,    // 5 minutes
  securityMetrics: 2 * 60 * 1000,        // 2 minutes (more sensitive)
  performanceMetrics: 15 * 60 * 1000,    // 15 minutes
  
  // User data - shorter TTL for better UX
  userPrompts: 1 * 60 * 1000,            // 1 minute
  userFavorites: 2 * 60 * 1000,          // 2 minutes
  userRecent: 1 * 60 * 1000,             // 1 minute
  
  // Templates - medium TTL
  templates: 5 * 60 * 1000,              // 5 minutes
  userTemplates: 3 * 60 * 1000,          // 3 minutes
};