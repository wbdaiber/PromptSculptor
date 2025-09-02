import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { 
  type PasswordResetToken,
  type InsertPasswordResetToken,
  passwordResetTokens
} from '../../shared/schema.js';

/**
 * Lightweight token service for password reset operations
 * Used by refactored DatabaseStorage for backward compatibility
 */
export class TokenServiceLite {
  private db: ReturnType<typeof drizzle>;
  private static pool: Pool | null = null;

  constructor() {
    if (!TokenServiceLite.pool) {
      TokenServiceLite.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
    this.db = drizzle(TokenServiceLite.pool);
  }

  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const result = await this.db.insert(passwordResetTokens).values(token).returning();
    return result[0];
  }

  async getPasswordResetToken(hashedToken: string): Promise<PasswordResetToken | undefined> {
    const result = await this.db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, hashedToken)).limit(1);
    return result[0];
  }

  async markTokenAsUsed(id: string): Promise<boolean> {
    const result = await this.db.update(passwordResetTokens)
      .set({ used: true }).where(eq(passwordResetTokens.id, id)).returning({ id: passwordResetTokens.id });
    return result.length > 0;
  }

  async invalidateUserTokens(userId: string): Promise<number> {
    const result = await this.db.update(passwordResetTokens)
      .set({ used: true })
      .where(and(eq(passwordResetTokens.userId, userId), eq(passwordResetTokens.used, false)))
      .returning({ id: passwordResetTokens.id });
    return result.length;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.db.delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`)
      .returning({ id: passwordResetTokens.id });
    return result.length;
  }

  static async closePool(): Promise<void> {
    if (TokenServiceLite.pool) {
      await TokenServiceLite.pool.end();
      TokenServiceLite.pool = null;
    }
  }
}

export const tokenServiceLite = new TokenServiceLite();