import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { DatabaseStorage } from "../databaseStorage.js";

/**
 * User-Aware API Key Manager
 * 
 * This service manages AI clients on a per-user basis by retrieving
 * encrypted API keys from the database and creating clients dynamically.
 * 
 * Key Features:
 * - User-specific API key retrieval
 * - Secure key decryption
 * - Dynamic client initialization
 * - Memory caching with TTL for performance
 * - Graceful error handling
 */

interface CachedClient {
  client: OpenAI | Anthropic | GoogleGenAI;
  timestamp: number;
  service: string;
}

interface UserClientCache {
  [userId: string]: {
    [service: string]: CachedClient;
  };
}

interface PendingClientCreation {
  [key: string]: Promise<OpenAI | Anthropic | GoogleGenAI | null>;
}

export class UserApiKeyManager {
  private static clientCache: UserClientCache = {};
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_USERS = 100; // Maximum number of users in cache
  private static readonly MAX_CLIENTS_PER_USER = 10; // Maximum clients per user
  private static cacheAccessOrder: string[] = []; // Track LRU order
  private static pendingClients: PendingClientCreation = {}; // Track in-flight client creation
  
  /**
   * Get a user's OpenAI client instance
   */
  static async getUserOpenAIClient(userId: string, dbStorage: DatabaseStorage): Promise<OpenAI | null> {
    const cachedClient = this.getCachedClient(userId, 'openai');
    if (cachedClient) {
      return cachedClient as OpenAI;
    }

    // Check if client creation is already in progress
    const pendingKey = `${userId}:openai`;
    if (pendingKey in this.pendingClients) {
      return await this.pendingClients[pendingKey] as OpenAI | null;
    }

    // Create promise for client creation to prevent duplicates
    this.pendingClients[pendingKey] = this.createOpenAIClient(userId, dbStorage);
    
    try {
      const client = await this.pendingClients[pendingKey];
      return client as OpenAI | null;
    } finally {
      // Clean up pending promise
      delete this.pendingClients[pendingKey];
    }
  }

  /**
   * Internal method to create OpenAI client
   */
  private static async createOpenAIClient(userId: string, dbStorage: DatabaseStorage): Promise<OpenAI | null> {
    try {
      const apiKey = await dbStorage.getDecryptedApiKey(userId, 'openai');
      if (!apiKey) {
        return null;
      }

      // Sanitize the API key
      const sanitizedKey = this.sanitizeApiKey(apiKey);

      // Validate key format
      if (!this.validateOpenAIKey(sanitizedKey)) {
        console.warn(`Invalid OpenAI API key format for user ${userId}`);
        return null;
      }

      const client = new OpenAI({ apiKey: sanitizedKey });
      this.setCachedClient(userId, 'openai', client);
      return client;
    } catch (error) {
      console.error(`Failed to initialize OpenAI client for user ${userId}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Get a user's Anthropic client instance
   */
  static async getUserAnthropicClient(userId: string, dbStorage: DatabaseStorage): Promise<Anthropic | null> {
    const cachedClient = this.getCachedClient(userId, 'anthropic');
    if (cachedClient) {
      return cachedClient as Anthropic;
    }

    // Check if client creation is already in progress
    const pendingKey = `${userId}:anthropic`;
    if (pendingKey in this.pendingClients) {
      return await this.pendingClients[pendingKey] as Anthropic | null;
    }

    // Create promise for client creation to prevent duplicates
    this.pendingClients[pendingKey] = this.createAnthropicClient(userId, dbStorage);
    
    try {
      const client = await this.pendingClients[pendingKey];
      return client as Anthropic | null;
    } finally {
      // Clean up pending promise
      delete this.pendingClients[pendingKey];
    }
  }

  /**
   * Internal method to create Anthropic client
   */
  private static async createAnthropicClient(userId: string, dbStorage: DatabaseStorage): Promise<Anthropic | null> {
    try {
      const apiKey = await dbStorage.getDecryptedApiKey(userId, 'anthropic');
      if (!apiKey) {
        return null;
      }

      // Sanitize the API key
      const sanitizedKey = this.sanitizeApiKey(apiKey);

      // Validate key format
      if (!this.validateAnthropicKey(sanitizedKey)) {
        console.warn(`Invalid Anthropic API key format for user ${userId}`);
        return null;
      }

      const client = new Anthropic({ apiKey: sanitizedKey });
      this.setCachedClient(userId, 'anthropic', client);
      return client;
    } catch (error) {
      console.error(`Failed to initialize Anthropic client for user ${userId}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Get a user's Gemini client instance
   */
  static async getUserGeminiClient(userId: string, dbStorage: DatabaseStorage): Promise<GoogleGenAI | null> {
    const cachedClient = this.getCachedClient(userId, 'gemini');
    if (cachedClient) {
      return cachedClient as GoogleGenAI;
    }

    // Check if client creation is already in progress
    const pendingKey = `${userId}:gemini`;
    if (pendingKey in this.pendingClients) {
      return await this.pendingClients[pendingKey] as GoogleGenAI | null;
    }

    // Create promise for client creation to prevent duplicates
    this.pendingClients[pendingKey] = this.createGeminiClient(userId, dbStorage);
    
    try {
      const client = await this.pendingClients[pendingKey];
      return client as GoogleGenAI | null;
    } finally {
      // Clean up pending promise
      delete this.pendingClients[pendingKey];
    }
  }

  /**
   * Internal method to create Gemini client
   */
  private static async createGeminiClient(userId: string, dbStorage: DatabaseStorage): Promise<GoogleGenAI | null> {
    try {
      const apiKey = await dbStorage.getDecryptedApiKey(userId, 'gemini');
      if (!apiKey) {
        return null;
      }

      // Sanitize the API key
      const sanitizedKey = this.sanitizeApiKey(apiKey);

      // Validate key format
      if (!this.validateGeminiKey(sanitizedKey)) {
        console.warn(`Invalid Gemini API key format for user ${userId}`);
        return null;
      }

      const client = new GoogleGenAI({ apiKey: sanitizedKey });
      this.setCachedClient(userId, 'gemini', client);
      return client;
    } catch (error) {
      console.error(`Failed to initialize Gemini client for user ${userId}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Get appropriate AI client based on target model
   */
  static async getUserAIClient(userId: string, targetModel: string, dbStorage: DatabaseStorage): Promise<OpenAI | Anthropic | GoogleGenAI | null> {
    switch (targetModel.toLowerCase()) {
      case 'gpt':
      case 'openai':
        return await this.getUserOpenAIClient(userId, dbStorage);
      
      case 'claude':
      case 'anthropic':
        return await this.getUserAnthropicClient(userId, dbStorage);
      
      case 'gemini':
      case 'google':
        return await this.getUserGeminiClient(userId, dbStorage);
      
      default:
        console.warn(`Unknown target model: ${targetModel}`);
        return null;
    }
  }

  /**
   * Check if user has API key for a specific service
   */
  static async hasUserApiKey(userId: string, service: string, dbStorage: DatabaseStorage): Promise<boolean> {
    try {
      const apiKey = await dbStorage.getDecryptedApiKey(userId, service);
      return apiKey !== undefined && apiKey.trim().length > 0;
    } catch (error) {
      console.error(`Failed to check API key for user ${userId}, service ${service}:`, error);
      return false;
    }
  }

  /**
   * Get user's available services (services for which they have valid API keys)
   * Now parallelized for better performance
   */
  static async getUserAvailableServices(userId: string, dbStorage: DatabaseStorage): Promise<string[]> {
    const services = ['openai', 'anthropic', 'gemini'];
    
    // Parallel check for all services
    const serviceChecks = await Promise.allSettled(
      services.map(service => this.hasUserApiKey(userId, service, dbStorage))
    );
    
    // Filter for successful checks that returned true
    return services.filter((service, index) => 
      serviceChecks[index].status === 'fulfilled' && 
      (serviceChecks[index] as PromiseFulfilledResult<boolean>).value === true
    );
  }

  /**
   * Clear cached clients for a user (useful when API keys are updated)
   */
  static clearUserCache(userId: string): void {
    delete this.clientCache[userId];
  }

  /**
   * Clear all cached clients (useful for memory cleanup)
   */
  static clearAllCache(): void {
    this.clientCache = {};
  }

  /**
   * Get cached client if still valid (with atomic expiry check)
   */
  private static getCachedClient(userId: string, service: string): OpenAI | Anthropic | GoogleGenAI | null {
    const userCache = this.clientCache[userId];
    if (!userCache || !userCache[service]) {
      return null;
    }

    const cached = userCache[service];
    const now = Date.now();
    const isExpired = now - cached.timestamp > this.CACHE_TTL_MS;
    
    if (isExpired) {
      // Atomic check - only delete if it's the same cached object
      if (userCache[service] === cached) {
        delete userCache[service];
      }
      return null;
    }

    // Update LRU tracking on successful cache hit
    this.updateLRUTracking(userId);
    return cached.client;
  }

  /**
   * Set cached client with timestamp and enforce cache limits
   */
  private static setCachedClient(userId: string, service: string, client: OpenAI | Anthropic | GoogleGenAI): void {
    // Enforce maximum users limit with LRU eviction
    if (!this.clientCache[userId]) {
      // Check if we need to evict a user
      if (Object.keys(this.clientCache).length >= this.MAX_CACHE_USERS) {
        // Remove least recently used user
        const userToEvict = this.cacheAccessOrder.shift();
        if (userToEvict) {
          delete this.clientCache[userToEvict];
        }
      }
      this.clientCache[userId] = {};
    }

    // Enforce maximum clients per user
    const userCache = this.clientCache[userId];
    if (Object.keys(userCache).length >= this.MAX_CLIENTS_PER_USER) {
      // Remove oldest client for this user
      let oldestService: string | null = null;
      let oldestTime = Date.now();
      
      for (const [s, cached] of Object.entries(userCache)) {
        if (cached.timestamp < oldestTime) {
          oldestTime = cached.timestamp;
          oldestService = s;
        }
      }
      
      if (oldestService) {
        delete userCache[oldestService];
      }
    }

    // Set the new cached client
    this.clientCache[userId][service] = {
      client,
      timestamp: Date.now(),
      service
    };
    
    // Update LRU tracking
    this.updateLRUTracking(userId);
  }

  /**
   * Update LRU tracking for cache eviction
   */
  private static updateLRUTracking(userId: string): void {
    const index = this.cacheAccessOrder.indexOf(userId);
    if (index > -1) {
      this.cacheAccessOrder.splice(index, 1);
    }
    this.cacheAccessOrder.push(userId);
  }

  /**
   * Sanitize API key by trimming and removing control characters
   */
  private static sanitizeApiKey(apiKey: string): string {
    // Trim whitespace and remove control characters
    return apiKey.trim().replace(/[\x00-\x1F\x7F]/g, '');
  }

  /**
   * Validate OpenAI API key format
   */
  private static validateOpenAIKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 40;
  }

  /**
   * Validate Anthropic API key format
   */
  private static validateAnthropicKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-ant-') && apiKey.length > 40;
  }

  /**
   * Validate Gemini API key format
   */
  private static validateGeminiKey(apiKey: string): boolean {
    return apiKey.startsWith('AIza') && apiKey.length > 30;
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  static getCacheStats(): { totalUsers: number; totalClients: number; services: Record<string, number> } {
    const stats = {
      totalUsers: Object.keys(this.clientCache).length,
      totalClients: 0,
      services: { openai: 0, anthropic: 0, gemini: 0 }
    };

    for (const userCache of Object.values(this.clientCache)) {
      for (const [service, cached] of Object.entries(userCache)) {
        stats.totalClients++;
        if (service in stats.services) {
          stats.services[service as keyof typeof stats.services]++;
        }
      }
    }

    return stats;
  }
}