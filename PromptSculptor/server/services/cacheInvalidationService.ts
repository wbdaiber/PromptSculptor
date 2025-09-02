import { cacheService } from './cacheService.js';
import { EventEmitter } from 'events';

/**
 * Service to handle cache invalidation strategies
 * Listens to data change events and invalidates relevant caches
 */
export class CacheInvalidationService extends EventEmitter {
  private static instance: CacheInvalidationService;

  private constructor() {
    super();
    this.setupEventHandlers();
  }

  static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  /**
   * Setup event handlers for cache invalidation
   */
  private setupEventHandlers(): void {
    // Listen to cache service events for monitoring
    cacheService.on('cache:hit', (data) => {
      this.emit('cache:performance', { type: 'hit', ...data });
    });

    cacheService.on('cache:miss', (data) => {
      this.emit('cache:performance', { type: 'miss', ...data });
    });

    cacheService.on('cache:expired', (data) => {
      this.emit('cache:performance', { type: 'expired', ...data });
    });
  }

  /**
   * Invalidate caches when a new user is created
   */
  onUserCreated(userId: string): void {
    // Invalidate admin analytics caches
    cacheService.invalidatePattern(/^admin:analytics:/);
    
    this.emit('invalidation', {
      trigger: 'user_created',
      userId,
      patterns: ['admin:analytics:*']
    });
  }

  /**
   * Invalidate caches when a user is updated
   */
  onUserUpdated(userId: string): void {
    // Invalidate user-specific caches
    cacheService.invalidatePattern(new RegExp(`^user:${userId}:`));
    
    // Invalidate admin user activity metrics
    cacheService.invalidatePattern(/^admin:analytics:user-activity:/);
    
    this.emit('invalidation', {
      trigger: 'user_updated',
      userId,
      patterns: [`user:${userId}:*`, 'admin:analytics:user-activity:*']
    });
  }

  /**
   * Invalidate caches when a user is deleted
   */
  onUserDeleted(userId: string): void {
    // Invalidate all user-specific caches
    cacheService.invalidatePattern(new RegExp(`^user:${userId}:`));
    
    // Invalidate admin analytics
    cacheService.invalidatePattern(/^admin:analytics:/);
    
    this.emit('invalidation', {
      trigger: 'user_deleted',
      userId,
      patterns: [`user:${userId}:*`, 'admin:analytics:*']
    });
  }

  /**
   * Invalidate caches when a prompt is created
   */
  onPromptCreated(userId: string, promptId: string): void {
    // Invalidate user's prompt caches
    cacheService.delete(`user:${userId}:prompts`);
    cacheService.delete(`user:${userId}:recent`);
    
    // Invalidate admin analytics that depend on prompt counts
    cacheService.delete('admin:analytics:main');
    cacheService.delete('admin:analytics:performance');
    cacheService.invalidatePattern(/^admin:analytics:user-activity:/);
    
    this.emit('invalidation', {
      trigger: 'prompt_created',
      userId,
      promptId,
      patterns: [`user:${userId}:prompts`, `user:${userId}:recent`, 'admin:analytics:*']
    });
  }

  /**
   * Invalidate caches when a prompt is updated
   */
  onPromptUpdated(userId: string, promptId: string, changes: { isFavorite?: boolean }): void {
    // Invalidate user's prompt caches
    cacheService.delete(`user:${userId}:prompts`);
    cacheService.delete(`user:${userId}:recent`);
    
    if (changes.isFavorite !== undefined) {
      cacheService.delete(`user:${userId}:favorites`);
      cacheService.delete('admin:analytics:main');
      cacheService.invalidatePattern(/^admin:analytics:user-activity:/);
    }
    
    this.emit('invalidation', {
      trigger: 'prompt_updated',
      userId,
      promptId,
      changes,
      patterns: [`user:${userId}:*`, 'admin:analytics:main']
    });
  }

  /**
   * Invalidate caches when a prompt is deleted
   */
  onPromptDeleted(userId: string, promptId: string): void {
    // Invalidate all user prompt caches
    cacheService.invalidatePattern(new RegExp(`^user:${userId}:(prompts|recent|favorites)`));
    
    // Invalidate admin analytics
    cacheService.delete('admin:analytics:main');
    cacheService.delete('admin:analytics:performance');
    
    this.emit('invalidation', {
      trigger: 'prompt_deleted',
      userId,
      promptId,
      patterns: [`user:${userId}:*`, 'admin:analytics:*']
    });
  }

  /**
   * Invalidate caches when a template is created or updated
   */
  onTemplateChanged(userId?: string): void {
    // Invalidate template caches
    cacheService.delete('templates:all');
    
    if (userId) {
      cacheService.delete(`templates:user:${userId}`);
    }
    
    // Invalidate admin analytics that track template usage
    cacheService.delete('admin:analytics:main');
    
    this.emit('invalidation', {
      trigger: 'template_changed',
      userId,
      patterns: ['templates:*', 'admin:analytics:main']
    });
  }

  /**
   * Invalidate caches when API keys are added or removed
   */
  onApiKeyChanged(userId: string): void {
    // Invalidate admin analytics that track API key adoption
    cacheService.delete('admin:analytics:main');
    cacheService.delete('admin:analytics:performance');
    
    this.emit('invalidation', {
      trigger: 'api_key_changed',
      userId,
      patterns: ['admin:analytics:*']
    });
  }

  /**
   * Invalidate caches when password reset tokens are created or used
   */
  onPasswordResetTokenChanged(): void {
    // Invalidate security metrics cache
    cacheService.delete('admin:analytics:security');
    
    this.emit('invalidation', {
      trigger: 'password_reset_token_changed',
      patterns: ['admin:analytics:security']
    });
  }

  /**
   * Force invalidate all caches
   */
  invalidateAll(): void {
    const keysCleared = cacheService.getSize();
    cacheService.clear();
    
    this.emit('invalidation', {
      trigger: 'manual_clear_all',
      keysCleared,
      patterns: ['*']
    });
  }

  /**
   * Get invalidation statistics
   */
  getStats() {
    return {
      cacheStats: cacheService.getStats(),
      currentCacheSize: cacheService.getSize(),
      cacheKeys: cacheService.getKeys()
    };
  }
}

// Export singleton instance
export const cacheInvalidationService = CacheInvalidationService.getInstance();