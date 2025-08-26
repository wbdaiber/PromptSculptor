import { 
  type Prompt, 
  type InsertPrompt, 
  type Template, 
  type InsertTemplate,
  type User,
  type InsertUser,
  type UserApiKey,
  type InsertUserApiKey,
  prompts,
  templates,
  users,
  userApiKeys
} from "@shared/schema";
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, and, sql } from 'drizzle-orm';
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
  createUser(email: string, password: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  verifyPassword(email: string, password: string): Promise<boolean>;
  
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
    const conditions = this.userId ? [eq(prompts.userId, this.userId)] : [];
    
    return await this.db
      .select()
      .from(prompts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(prompts.createdAt));
  }

  async getRecentPrompts(limit: number = 10): Promise<Prompt[]> {
    const conditions = this.userId ? [eq(prompts.userId, this.userId)] : [];
    
    return await this.db
      .select()
      .from(prompts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(prompts.createdAt))
      .limit(limit);
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
    const result = await this.db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);
    
    return result[0];
  }

  async getTemplates(): Promise<Template[]> {
    return await this.db
      .select()
      .from(templates)
      .orderBy(templates.name);
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return await this.db
      .select()
      .from(templates)
      .where(eq(templates.type, type))
      .orderBy(templates.name);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const result = await this.db
      .insert(templates)
      .values(insertTemplate)
      .returning();
    
    return result[0];
  }

  // User management methods
  async createUser(email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, DatabaseStorage.SALT_ROUNDS);
    
    const result = await this.db
      .insert(users)
      .values({
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
  
  // Instance method for backward compatibility
  async close(): Promise<void> {
    return DatabaseStorage.closePool();
  }
}

// Export a singleton instance for backward compatibility
export const databaseStorage = new DatabaseStorage();