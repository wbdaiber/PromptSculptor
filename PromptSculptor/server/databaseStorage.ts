import { 
  type Prompt, 
  type InsertPrompt, 
  type Template, 
  type InsertTemplate,
  type User,
  type UserApiKey,
  type InsertUserApiKey,
  type PasswordResetToken,
  type InsertPasswordResetToken,
} from "../shared/schema.js";
import { IStorage } from './storage.js';

// Import the new services
import { userManagementService, UserManagementService } from './services/userManagementService.js';
import { promptStorageService, PromptStorageService } from './services/promptStorageService.js';
import { templateManagementService, TemplateManagementService } from './services/templateManagementService.js';
import { tokenServiceLite, TokenServiceLite } from './services/tokenServiceLite.js';

// Extended storage interface for user operations
export interface IDatabaseStorage extends IStorage {
  // User management
  createUser(username: string, email: string, password: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  verifyPassword(email: string, password: string): Promise<boolean>;
  updateUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  deleteUser(userId: string, password: string): Promise<boolean>;
  
  // API key management
  createUserApiKey(userId: string, service: string, apiKey: string, keyName?: string): Promise<UserApiKey>;
  getUserApiKeys(userId: string): Promise<UserApiKey[]>;
  getUserApiKey(userId: string, service: string): Promise<UserApiKey | undefined>;
  deleteUserApiKey(userId: string, keyId: string): Promise<boolean>;
  getDecryptedApiKey(userId: string, service: string): Promise<string | undefined>;
}

/**
 * Refactored DatabaseStorage class using service architecture
 * Reduced from 702 lines to <200 lines by delegating to specialized services
 */
export class DatabaseStorage implements IDatabaseStorage {
  private userId?: string;
  
  // Service instances (using singletons for efficiency)
  private userService = userManagementService;
  private promptService = promptStorageService;
  private templateService = templateManagementService;
  private tokenService = tokenServiceLite;

  constructor(userId?: string) {
    this.userId = userId;
    
    // REMOVED: Automatic template initialization
    // Templates should only be initialized via explicit command (npm run db:seed-templates)
    // This prevents duplicate templates from being created on every worker spawn in Vercel
  }

  // ============================================================================
  // TEMPLATE OPERATIONS - Delegated to TemplateManagementService
  // ============================================================================

  async getTemplate(id: string): Promise<Template | undefined> {
    return await this.templateService.getTemplate(id);
  }

  async getTemplates(): Promise<Template[]> {
    return await this.templateService.getAccessibleTemplates(this.userId);
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return await this.templateService.getTemplatesByType(type);
  }

  async getUserTemplates(userId: string): Promise<Template[]> {
    return await this.templateService.getUserTemplates(userId);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    return await this.templateService.createTemplate(insertTemplate);
  }

  async updateTemplate(id: string, updateTemplate: Partial<InsertTemplate>): Promise<Template | undefined> {
    if (!this.userId) throw new Error('User ID required for template update');
    return await this.templateService.updateTemplate(id, this.userId, updateTemplate);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (!this.userId) throw new Error('User ID required for template deletion');
    return await this.templateService.deleteTemplate(id, this.userId);
  }

  // ============================================================================
  // PROMPT OPERATIONS - Delegated to PromptStorageService
  // ============================================================================

  async getPrompt(id: string): Promise<Prompt | undefined> {
    return await this.promptService.getPrompt(id);
  }

  async getPrompts(): Promise<Prompt[]> {
    if (!this.userId) return [];
    return await this.promptService.getRecentPrompts(this.userId, 50);
  }

  async getRecentPrompts(limit: number = 10): Promise<Prompt[]> {
    if (!this.userId) return [];
    return await this.promptService.getRecentPrompts(this.userId, limit);
  }

  async getFavoritePrompts(limit: number = 10): Promise<Prompt[]> {
    if (!this.userId) return [];
    return await this.promptService.getFavoritePrompts(this.userId, limit);
  }

  async togglePromptFavorite(id: string, isFavorite: boolean): Promise<Prompt | undefined> {
    if (!this.userId) throw new Error('User ID required for favorite toggle');
    return await this.promptService.togglePromptFavorite(id, this.userId, isFavorite);
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    return await this.promptService.createPrompt(insertPrompt);
  }

  async updatePrompt(id: string, updatePrompt: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    if (!this.userId) throw new Error('User ID required for prompt update');
    return await this.promptService.updatePrompt(id, this.userId, updatePrompt);
  }

  async deletePrompt(id: string): Promise<boolean> {
    if (!this.userId) throw new Error('User ID required for prompt deletion');
    return await this.promptService.deletePrompt(id, this.userId);
  }

  // ============================================================================
  // USER OPERATIONS - Delegated to UserManagementService
  // ============================================================================

  async createUser(username: string, email: string, password: string): Promise<User> {
    return await this.userService.createUser(username, email, password);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await this.userService.getUserByEmail(email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await this.userService.getUserByUsername(username);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return await this.userService.getUserById(id);
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    return await this.userService.verifyPassword(email, password);
  }

  async updateUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    return await this.userService.updateUserPassword(userId, currentPassword, newPassword);
  }

  async deleteUser(userId: string, password: string): Promise<boolean> {
    return await this.userService.deleteUser(userId, password);
  }

  // ============================================================================
  // API KEY OPERATIONS - Delegated to UserManagementService
  // ============================================================================

  async createUserApiKey(
    userId: string,
    service: string,
    apiKey: string,
    displayName?: string
  ): Promise<UserApiKey> {
    return await this.userService.createUserApiKey(
      userId, 
      service as 'openai' | 'anthropic' | 'google', 
      apiKey, 
      displayName
    );
  }

  async getUserApiKeys(userId: string): Promise<UserApiKey[]> {
    return await this.userService.getUserApiKeys(userId);
  }

  async getUserApiKey(userId: string, service: string): Promise<UserApiKey | undefined> {
    return await this.userService.getUserApiKey(userId, service);
  }

  async deleteUserApiKey(userId: string, keyId: string): Promise<boolean> {
    return await this.userService.deleteUserApiKey(userId, keyId);
  }

  async getDecryptedApiKey(userId: string, service: string): Promise<string | undefined> {
    return await this.userService.getDecryptedApiKey(userId, service);
  }

  // ============================================================================
  // PASSWORD RESET TOKEN OPERATIONS - Delegated to TokenServiceLite
  // ============================================================================

  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    return await this.tokenService.createPasswordResetToken(token);
  }

  async getPasswordResetToken(hashedToken: string): Promise<PasswordResetToken | undefined> {
    return await this.tokenService.getPasswordResetToken(hashedToken);
  }

  async markTokenAsUsed(id: string): Promise<boolean> {
    return await this.tokenService.markTokenAsUsed(id);
  }

  async invalidateUserTokens(userId: string): Promise<number> {
    return await this.tokenService.invalidateUserTokens(userId);
  }

  async cleanupExpiredTokens(): Promise<number> {
    return await this.tokenService.cleanupExpiredTokens();
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    return await this.userService.resetUserPassword(userId, newPassword);
  }

  // ============================================================================
  // CLEANUP AND SINGLETON MANAGEMENT
  // ============================================================================

  async close(): Promise<void> {
    // Services handle their own connection cleanup
    // This method maintained for compatibility
  }

  static async closePool(): Promise<void> {
    // Close all service connection pools
    await Promise.all([
      UserManagementService.closePool(),
      PromptStorageService.closePool(), 
      TemplateManagementService.closePool(),
      TokenServiceLite.closePool()
    ]);
  }
}

// Export singleton instance for backward compatibility
export const databaseStorage = new DatabaseStorage();