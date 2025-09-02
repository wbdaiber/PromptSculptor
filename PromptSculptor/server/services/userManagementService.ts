import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { 
  type User, 
  type InsertUser,
  type UserApiKey,
  type InsertUserApiKey,
  users,
  userApiKeys
} from '../../shared/schema.js';

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

export class UserManagementService {
  private db: ReturnType<typeof drizzle>;
  private static pool: Pool | null = null;
  private static readonly SALT_ROUNDS = 12;

  constructor() {
    if (!UserManagementService.pool) {
      UserManagementService.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
    this.db = drizzle(UserManagementService.pool);
  }

  /**
   * Create a new user
   */
  async createUser(username: string, email: string, password: string): Promise<User> {
    try {
      const passwordHash = await bcrypt.hash(password, UserManagementService.SALT_ROUNDS);
      
      const result = await this.db
        .insert(users)
        .values({
          username,
          email,
          passwordHash,
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get user by email (active users only)
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(and(
          eq(users.email, email),
          eq(users.isDeleted, false)  // Utilizes composite index
        ))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`Error fetching user by email ${email}:`, error);
      return undefined;
    }
  }

  /**
   * Get user by username (active users only)
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(and(
          eq(users.username, username),
          eq(users.isDeleted, false)
        ))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`Error fetching user by username ${username}:`, error);
      return undefined;
    }
  }

  /**
   * Get user by ID (includes deleted users for admin purposes)
   */
  async getUserById(id: string): Promise<User | undefined> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`Error fetching user by ID ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) return false;
      
      return bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Update user password with current password verification
   */
  async updateUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // First, get the user and verify the current password
      const user = await this.getUserById(userId);
      if (!user) return false;
      
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) return false;
      
      // Hash the new password
      const newPasswordHash = await bcrypt.hash(newPassword, UserManagementService.SALT_ROUNDS);
      
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
    } catch (error) {
      console.error('Error updating user password:', error);
      return false;
    }
  }

  /**
   * Soft delete user with data anonymization
   */
  async deleteUser(userId: string, password: string): Promise<boolean> {
    try {
      // First, verify the password
      const user = await this.getUserById(userId);
      if (!user) {
        console.error(`Delete user failed: User ${userId} not found`);
        return false;
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        console.error(`Delete user failed: Invalid password for user ${userId}`);
        return false;
      }
      
      // Enhanced anonymization with timestamp to handle multiple delete/recreate cycles
      const timestamp = Date.now();
      const anonymizedEmail = `deleted_${userId}_${timestamp}@deleted.local`;
      // Keep username under 50 char limit: use last 8 chars of userId + timestamp
      const userIdShort = userId.slice(-8);
      const anonymizedUsername = `del_${userIdShort}_${timestamp}`.slice(0, 50);
      
      // Start transaction for atomic operation
      const result = await this.db.transaction(async (tx) => {
        try {
          // Soft delete with full anonymization
          const updateResult = await tx
            .update(users)
            .set({ 
              isDeleted: true,
              deletedAt: new Date(),
              email: anonymizedEmail,
              username: anonymizedUsername,
              passwordHash: 'DELETED',
              updatedAt: new Date()
            })
            .where(eq(users.id, userId))
            .returning({ id: users.id });
          
          if (updateResult.length === 0) {
            throw new Error('Failed to update user record');
          }
          
          // Log successful soft deletion for monitoring
          console.log(`User ${userId} soft-deleted successfully at ${new Date().toISOString()}`);
          
          return updateResult;
        } catch (txError) {
          console.error(`Transaction failed during user deletion:`, txError);
          throw txError; // Rollback transaction
        }
      });
      
      return result.length > 0;
    } catch (error) {
      console.error(`Critical error in deleteUser for ${userId}:`, error);
      
      // Fallback: Try to at least mark as deleted without anonymization
      try {
        const fallbackResult = await this.db
          .update(users)
          .set({ 
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(users.id, userId))
          .returning({ id: users.id });
        
        if (fallbackResult.length > 0) {
          console.warn(`User ${userId} marked as deleted (fallback mode - anonymization failed)`);
          return true;
        }
      } catch (fallbackError) {
        console.error(`Fallback deletion also failed for user ${userId}:`, fallbackError);
      }
      
      return false;
    }
  }

  /**
   * Create user API key
   */
  async createUserApiKey(
    userId: string,
    service: 'openai' | 'anthropic' | 'google',
    apiKey: string,
    displayName?: string
  ): Promise<UserApiKey> {
    try {
      const encryptedKey = EncryptionService.encrypt(apiKey);
      
      const result = await this.db
        .insert(userApiKeys)
        .values({
          userId,
          service,
          encryptedKey,
          keyName: displayName || `${service.charAt(0).toUpperCase() + service.slice(1)} API Key`,
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating user API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Get user API keys
   */
  async getUserApiKeys(userId: string): Promise<UserApiKey[]> {
    try {
      const result = await this.db
        .select()
        .from(userApiKeys)
        .where(eq(userApiKeys.userId, userId));
      
      return result;
    } catch (error) {
      console.error('Error fetching user API keys:', error);
      return [];
    }
  }

  /**
   * Get specific user API key
   */
  async getUserApiKey(userId: string, service: string): Promise<UserApiKey | undefined> {
    try {
      const result = await this.db
        .select()
        .from(userApiKeys)
        .where(and(
          eq(userApiKeys.userId, userId),
          eq(userApiKeys.service, service)
        ))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error fetching user API key:', error);
      return undefined;
    }
  }

  /**
   * Delete user API key
   */
  async deleteUserApiKey(userId: string, keyId: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(userApiKeys)
        .where(and(
          eq(userApiKeys.id, keyId),
          eq(userApiKeys.userId, userId)
        ));
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting user API key:', error);
      return false;
    }
  }

  /**
   * Get decrypted API key for a service
   */
  async getDecryptedApiKey(userId: string, service: string): Promise<string | undefined> {
    try {
      const apiKey = await this.getUserApiKey(userId, service);
      if (!apiKey) return undefined;
      
      return EncryptionService.decrypt(apiKey.encryptedKey);
    } catch (error) {
      console.error('Error decrypting API key:', error);
      return undefined;
    }
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    deletedUsers: number;
    usersWithApiKeys: number;
    recentRegistrations: number;
  }> {
    try {
      const result = await this.db.execute(sql`
        WITH user_stats AS (
          SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN is_deleted = false THEN 1 END) as active_users,
            COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted_users,
            COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as recent_registrations
          FROM users
        ),
        api_key_stats AS (
          SELECT COUNT(DISTINCT user_id) as users_with_keys
          FROM user_api_keys
        )
        SELECT 
          us.*,
          COALESCE(aks.users_with_keys, 0) as users_with_api_keys
        FROM user_stats us
        CROSS JOIN api_key_stats aks
      `);

      const stats = (result as any).rows[0];
      return {
        totalUsers: Number(stats.total_users),
        activeUsers: Number(stats.active_users),
        deletedUsers: Number(stats.deleted_users),
        usersWithApiKeys: Number(stats.users_with_api_keys),
        recentRegistrations: Number(stats.recent_registrations),
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        deletedUsers: 0,
        usersWithApiKeys: 0,
        recentRegistrations: 0,
      };
    }
  }

  /**
   * Reset user password (admin function)
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const newPasswordHash = await bcrypt.hash(newPassword, UserManagementService.SALT_ROUNDS);
      
      const result = await this.db
        .update(users)
        .set({ 
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      
      return result.length > 0;
    } catch (error) {
      console.error('Error resetting user password:', error);
      return false;
    }
  }

  /**
   * Close database connection pool
   */
  static async closePool(): Promise<void> {
    if (UserManagementService.pool) {
      await UserManagementService.pool.end();
      UserManagementService.pool = null;
    }
  }
}

// Export singleton instance
export const userManagementService = new UserManagementService();