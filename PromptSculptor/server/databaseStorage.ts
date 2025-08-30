import { 
  type Prompt, 
  type InsertPrompt, 
  type Template, 
  type InsertTemplate,
  type User,
  type InsertUser,
  type UserApiKey,
  type InsertUserApiKey,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  prompts,
  templates,
  users,
  userApiKeys,
  passwordResetTokens
} from "@shared/schema";
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, and, sql, or } from 'drizzle-orm';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { IStorage } from './storage';
import { TemplateService } from './services/templateService';

// Encryption service for API keys
class EncryptionService {
  private static ALGORITHM = 'aes-256-gcm';
  private static KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    
    // Combine iv:tag:encrypted for storage
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }
  
  static decrypt(encryptedData: string): string {
    const [ivHex, tagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

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

export class DatabaseStorage implements IDatabaseStorage {
  private db: ReturnType<typeof drizzle>;
  private userId?: string;
  private static SALT_ROUNDS = 12;
  private static pool: Pool;
  private static dbInstance: ReturnType<typeof drizzle>;
  private static templatesInitialized = false;

  constructor(userId?: string) {
    this.userId = userId;
    
    // Initialize singleton pool and db instance
    if (!DatabaseStorage.pool) {
      DatabaseStorage.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      DatabaseStorage.dbInstance = drizzle(DatabaseStorage.pool);
    }
    
    this.db = DatabaseStorage.dbInstance;
    
    // Initialize templates only once
    if (!DatabaseStorage.templatesInitialized) {
      this.initializeDefaultTemplates();
      DatabaseStorage.templatesInitialized = true;
    }
  }

  private async initializeDefaultTemplates() {
    // Check if templates already exist
    const existingTemplates = await this.db.select().from(templates).limit(1);
    if (existingTemplates.length > 0) return;

    // Get templates from centralized service
    const templateService = TemplateService.getInstance();
    const defaultTemplates = templateService.getDefaultTemplates();

    // Insert templates in a transaction
    await this.db.transaction(async (tx) => {
      for (const template of defaultTemplates) {
        await tx.insert(templates).values(template);
      }
    });
  }

  // IStorage interface implementation
  async getPrompt(id: string): Promise<Prompt | undefined> {
    const conditions = [eq(prompts.id, id)];
    if (this.userId) {
      conditions.push(eq(prompts.userId, this.userId));
    }
    
    const result = await this.db
      .select()
      .from(prompts)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async getPrompts(): Promise<Prompt[]> {
    // Only return prompts for authenticated users
    if (!this.userId) {
      return []; // No prompts for anonymous users
    }
    
    return await this.db
      .select()
      .from(prompts)
      .where(eq(prompts.userId, this.userId))
      .orderBy(desc(prompts.createdAt));
  }

  async getRecentPrompts(limit: number = 10): Promise<Prompt[]> {
    // Only return prompts for authenticated users
    if (!this.userId) {
      return []; // No prompts for anonymous users
    }
    
    return await this.db
      .select()
      .from(prompts)
      .where(eq(prompts.userId, this.userId))
      .orderBy(desc(prompts.createdAt))
      .limit(limit);
  }

  async getFavoritePrompts(limit: number = 10): Promise<Prompt[]> {
    // Only return favorite prompts for authenticated users
    if (!this.userId) {
      return []; // No favorites for anonymous users
    }
    
    const query = this.db
      .select()
      .from(prompts)
      .where(and(
        eq(prompts.userId, this.userId),
        eq(prompts.isFavorite, true)
      ))
      .orderBy(desc(prompts.createdAt));
    
    return limit ? await query.limit(limit) : await query;
  }

  async togglePromptFavorite(id: string, isFavorite: boolean): Promise<Prompt | undefined> {
    if (!this.userId) {
      return undefined;
    }

    const result = await this.db
      .update(prompts)
      .set({ isFavorite })
      .where(and(
        eq(prompts.id, id),
        eq(prompts.userId, this.userId)
      ))
      .returning();
    
    return result[0];
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const promptData = {
      ...insertPrompt,
      userId: this.userId || null,
    };

    const result = await this.db
      .insert(prompts)
      .values(promptData)
      .returning();
    
    return result[0];
  }

  async updatePrompt(id: string, updatePrompt: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const conditions = [eq(prompts.id, id)];
    if (this.userId) {
      conditions.push(eq(prompts.userId, this.userId));
    }

    const result = await this.db
      .update(prompts)
      .set(updatePrompt)
      .where(and(...conditions))
      .returning();
    
    return result[0];
  }

  async deletePrompt(id: string): Promise<boolean> {
    const conditions = [eq(prompts.id, id)];
    if (this.userId) {
      conditions.push(eq(prompts.userId, this.userId));
    }

    const result = await this.db
      .delete(prompts)
      .where(and(...conditions))
      .returning({ id: prompts.id });
    
    return result.length > 0;
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    // Check if template is default or belongs to the user
    const conditions = [eq(templates.id, id)];
    
    if (!this.userId) {
      // Only allow access to default templates for anonymous users
      conditions.push(eq(templates.isDefault, true));
    } else {
      // Allow access to default templates or user's own templates
      conditions.push(
        or(
          eq(templates.isDefault, true),
          eq(templates.userId, this.userId)
        )!
      );
    }
    
    const result = await this.db
      .select()
      .from(templates)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async getTemplates(): Promise<Template[]> {
    // Return only default system templates when no user context
    if (!this.userId) {
      return await this.db
        .select()
        .from(templates)
        .where(eq(templates.isDefault, true))
        .orderBy(templates.name);
    }
    
    // Return default templates + user's own templates
    return await this.db
      .select()
      .from(templates)
      .where(
        or(
          eq(templates.isDefault, true),
          eq(templates.userId, this.userId)
        )
      )
      .orderBy(templates.name);
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    // Return only default system templates when no user context
    if (!this.userId) {
      return await this.db
        .select()
        .from(templates)
        .where(and(
          eq(templates.type, type),
          eq(templates.isDefault, true)
        ))
        .orderBy(templates.name);
    }
    
    // Return default templates + user's own templates of specified type
    return await this.db
      .select()
      .from(templates)
      .where(and(
        eq(templates.type, type),
        or(
          eq(templates.isDefault, true),
          eq(templates.userId, this.userId)
        )
      ))
      .orderBy(templates.name);
  }

  async getUserTemplates(userId: string): Promise<Template[]> {
    return this.db
      .select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(desc(templates.createdAt), templates.name);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const result = await this.db
      .insert(templates)
      .values(insertTemplate)
      .returning();
    
    return result[0];
  }

  async updateTemplate(id: string, updateTemplate: Partial<InsertTemplate>): Promise<Template | undefined> {
    // First check if template exists and is not a default system template
    const existing = await this.getTemplate(id);
    if (!existing) return undefined;

    // Prevent updating default system templates
    if (existing.isDefault) return undefined;

    // Also check ownership if userId is provided in the class
    if (this.userId && existing.userId !== this.userId) return undefined;

    const result = await this.db
      .update(templates)
      .set(updateTemplate)
      .where(eq(templates.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    // First check if template exists and is not a default system template
    const existing = await this.getTemplate(id);
    if (!existing) return false;

    // Prevent deleting default system templates
    if (existing.isDefault) return false;

    // Also check ownership if userId is provided in the class
    if (this.userId && existing.userId !== this.userId) return false;

    const result = await this.db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning({ id: templates.id });
    
    return result.length > 0;
  }

  // User management methods
  async createUser(username: string, email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, DatabaseStorage.SALT_ROUNDS);
    
    const result = await this.db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
      })
      .returning();
    
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return result[0];
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;
    
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    // First, get the user and verify the current password
    const user = await this.getUserById(userId);
    if (!user) return false;
    
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) return false;
    
    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, DatabaseStorage.SALT_ROUNDS);
    
    // Update the password
    const result = await this.db
      .update(users)
      .set({ 
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    
    return result.length > 0;
  }

  async deleteUser(userId: string, password: string): Promise<boolean> {
    // First, verify the password
    const user = await this.getUserById(userId);
    if (!user) return false;
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return false;
    
    // Delete the user (CASCADE will handle related data like API keys, prompts, templates)
    const result = await this.db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    
    return result.length > 0;
  }

  // API key management methods
  async createUserApiKey(
    userId: string, 
    service: string, 
    apiKey: string, 
    keyName?: string
  ): Promise<UserApiKey> {
    const encryptedKey = EncryptionService.encrypt(apiKey);
    
    const result = await this.db
      .insert(userApiKeys)
      .values({
        userId,
        service,
        encryptedKey,
        keyName: keyName || `${service} Key`,
      })
      .returning();
    
    return result[0];
  }

  async getUserApiKeys(userId: string): Promise<UserApiKey[]> {
    return await this.db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId))
      .orderBy(desc(userApiKeys.createdAt));
  }

  async getUserApiKey(userId: string, service: string): Promise<UserApiKey | undefined> {
    const result = await this.db
      .select()
      .from(userApiKeys)
      .where(and(
        eq(userApiKeys.userId, userId),
        eq(userApiKeys.service, service)
      ))
      .limit(1);
    
    return result[0];
  }

  async deleteUserApiKey(userId: string, keyId: string): Promise<boolean> {
    const result = await this.db
      .delete(userApiKeys)
      .where(and(
        eq(userApiKeys.id, keyId),
        eq(userApiKeys.userId, userId)
      ))
      .returning({ id: userApiKeys.id });
    
    return result.length > 0;
  }

  async getDecryptedApiKey(userId: string, service: string): Promise<string | undefined> {
    const apiKey = await this.getUserApiKey(userId, service);
    if (!apiKey) return undefined;
    
    try {
      return EncryptionService.decrypt(apiKey.encryptedKey);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return undefined;
    }
  }

  // Cleanup method for graceful shutdown
  static async closePool(): Promise<void> {
    if (DatabaseStorage.pool) {
      await DatabaseStorage.pool.end();
      DatabaseStorage.pool = undefined as any;
      DatabaseStorage.dbInstance = undefined as any;
      DatabaseStorage.templatesInitialized = false;
    }
  }
  
  // Password Reset Token operations
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const result = await this.db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    
    return result[0];
  }

  async getPasswordResetToken(hashedToken: string): Promise<PasswordResetToken | undefined> {
    const result = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, hashedToken))
      .limit(1);
    
    return result[0];
  }

  async markTokenAsUsed(id: string): Promise<boolean> {
    const result = await this.db
      .update(passwordResetTokens)
      .set({ 
        used: true
      })
      .where(eq(passwordResetTokens.id, id))
      .returning({ id: passwordResetTokens.id });
    
    return result.length > 0;
  }

  async invalidateUserTokens(userId: string): Promise<number> {
    const result = await this.db
      .update(passwordResetTokens)
      .set({ 
        used: true
      })
      .where(and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.used, false)
      ))
      .returning({ id: passwordResetTokens.id });
    
    return result.length;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`)
      .returning({ id: passwordResetTokens.id });
    
    return result.length;
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const newPasswordHash = await bcrypt.hash(newPassword, DatabaseStorage.SALT_ROUNDS);
    
    const result = await this.db
      .update(users)
      .set({ 
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    
    return result.length > 0;
  }

  // Instance method for backward compatibility
  async close(): Promise<void> {
    return DatabaseStorage.closePool();
  }
}

// Export a singleton instance for backward compatibility
export const databaseStorage = new DatabaseStorage();