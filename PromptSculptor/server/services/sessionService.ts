import { drizzle } from 'drizzle-orm/node-postgres';
import { sql, eq, lt } from 'drizzle-orm';
import { Pool } from 'pg';
import { userSessions } from '@shared/schema';

export interface SessionData {
  userId?: string;
  email?: string;
  isAdmin?: boolean;
  adminEmail?: string;
  [key: string]: any;
}

export class SessionService {
  private db: ReturnType<typeof drizzle>;
  private static pool: Pool | null = null;

  constructor() {
    if (!SessionService.pool) {
      SessionService.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
    this.db = drizzle(SessionService.pool);
  }

  /**
   * Get session data by session ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const result = await this.db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sid, sessionId))
        .limit(1);

      if (!result.length) {
        return null;
      }

      const session = result[0];
      
      // Check if session is expired
      if (session.expire && new Date(session.expire) < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      return session.sess as SessionData;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  /**
   * Create or update session
   */
  async upsertSession(sessionId: string, sessionData: SessionData, expireDate: Date): Promise<boolean> {
    try {
      await this.db
        .insert(userSessions)
        .values({
          sid: sessionId,
          sess: sessionData,
          expire: expireDate,
        })
        .onConflictDoUpdate({
          target: userSessions.sid,
          set: {
            sess: sessionData,
            expire: expireDate,
          },
        });

      return true;
    } catch (error) {
      console.error('Error upserting session:', error);
      return false;
    }
  }

  /**
   * Delete session by ID
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(userSessions)
        .where(eq(userSessions.sid, sessionId));

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a specific user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      const result = await this.db
        .delete(userSessions)
        .where(sql`sess->>'userId' = ${userId}`);

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      return 0;
    }
  }

  /**
   * Delete all admin sessions for a specific admin email
   */
  async deleteAdminSessions(adminEmail: string): Promise<number> {
    try {
      const result = await this.db
        .delete(userSessions)
        .where(sql`sess->>'adminEmail' = ${adminEmail}`);

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting admin sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.db
        .delete(userSessions)
        .where(lt(userSessions.expire, new Date()));

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics for admin dashboard
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    userSessions: number;
    adminSessions: number;
    expiredSessions: number;
  }> {
    try {
      const result = await this.db.execute(sql`
        WITH session_stats AS (
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN sess->>'userId' IS NOT NULL THEN 1 END) as user_sessions,
            COUNT(CASE WHEN sess->>'adminEmail' IS NOT NULL THEN 1 END) as admin_sessions,
            COUNT(CASE WHEN expire < NOW() THEN 1 END) as expired_sessions
          FROM user_sessions
        )
        SELECT * FROM session_stats
      `);

      const stats = (result as any).rows[0];
      return {
        totalSessions: Number(stats.total_sessions),
        userSessions: Number(stats.user_sessions),
        adminSessions: Number(stats.admin_sessions),
        expiredSessions: Number(stats.expired_sessions),
      };
    } catch (error) {
      console.error('Error fetching session stats:', error);
      return {
        totalSessions: 0,
        userSessions: 0,
        adminSessions: 0,
        expiredSessions: 0,
      };
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<Array<{
    sessionId: string;
    createdAt: Date;
    expiresAt: Date;
  }>> {
    try {
      const result = await this.db
        .select({
          sid: userSessions.sid,
          expire: userSessions.expire,
        })
        .from(userSessions)
        .where(
          sql`sess->>'userId' = ${userId} AND expire > NOW()`
        );

      return result.map(row => ({
        sessionId: row.sid,
        createdAt: new Date(), // Session creation time not stored in current schema
        expiresAt: new Date(row.expire),
      }));
    } catch (error) {
      console.error('Error fetching user active sessions:', error);
      return [];
    }
  }

  /**
   * Extend session expiration time
   */
  async extendSession(sessionId: string, newExpireDate: Date): Promise<boolean> {
    try {
      const result = await this.db
        .update(userSessions)
        .set({ expire: newExpireDate })
        .where(eq(userSessions.sid, sessionId));

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  /**
   * Validate admin session and return admin email if valid
   */
  async validateAdminSession(sessionId: string): Promise<string | null> {
    try {
      const sessionData = await this.getSession(sessionId);
      
      if (!sessionData || !sessionData.isAdmin || !sessionData.adminEmail) {
        return null;
      }

      // Verify the admin email is still in the allowed list
      const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS?.split(',') || [];
      if (!allowedEmails.includes(sessionData.adminEmail)) {
        // Admin access revoked, delete session
        await this.deleteSession(sessionId);
        return null;
      }

      return sessionData.adminEmail;
    } catch (error) {
      console.error('Error validating admin session:', error);
      return null;
    }
  }

  /**
   * Create admin session
   */
  async createAdminSession(sessionId: string, adminEmail: string, expireDate: Date): Promise<boolean> {
    const sessionData: SessionData = {
      isAdmin: true,
      adminEmail: adminEmail,
      createdAt: new Date().toISOString(),
    };

    return await this.upsertSession(sessionId, sessionData, expireDate);
  }

  /**
   * Close database connection pool
   */
  static async closePool(): Promise<void> {
    if (SessionService.pool) {
      await SessionService.pool.end();
      SessionService.pool = null;
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService();