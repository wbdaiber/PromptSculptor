import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, and, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { 
  type Prompt, 
  type InsertPrompt,
  prompts
} from '@shared/schema';

export class PromptStorageService {
  private db: ReturnType<typeof drizzle>;
  private static pool: Pool | null = null;

  constructor() {
    if (!PromptStorageService.pool) {
      PromptStorageService.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        // Force timezone to UTC to prevent timestamp interpretation issues
        options: '--timezone=UTC',
      });
    }
    this.db = drizzle(PromptStorageService.pool);
  }

  /**
   * Get a single prompt by ID
   */
  async getPrompt(id: string): Promise<Prompt | undefined> {
    try {
      const result = await this.db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`Error fetching prompt ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Get all prompts (for admin dashboard)
   */
  async getAllPrompts(): Promise<Prompt[]> {
    try {
      const result = await this.db
        .select()
        .from(prompts)
        .orderBy(desc(prompts.createdAt));
      
      return result;
    } catch (error) {
      console.error('Error fetching all prompts:', error);
      return [];
    }
  }

  /**
   * Get recent prompts for a user
   */
  async getRecentPrompts(userId: string, limit: number = 10): Promise<Prompt[]> {
    try {
      const result = await this.db
        .select()
        .from(prompts)
        .where(eq(prompts.userId, userId))
        .orderBy(desc(prompts.createdAt))
        .limit(limit);
      
      return result;
    } catch (error) {
      console.error(`Error fetching recent prompts for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get favorite prompts for a user
   */
  async getFavoritePrompts(userId: string, limit: number = 10): Promise<Prompt[]> {
    try {
      const result = await this.db
        .select()
        .from(prompts)
        .where(and(
          eq(prompts.userId, userId),
          eq(prompts.isFavorite, true)
        ))
        .orderBy(desc(prompts.createdAt))
        .limit(limit);
      
      return result;
    } catch (error) {
      console.error(`Error fetching favorite prompts for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Toggle favorite status of a prompt
   */
  async togglePromptFavorite(id: string, userId: string, isFavorite: boolean): Promise<Prompt | undefined> {
    try {
      const result = await this.db
        .update(prompts)
        .set({ 
          isFavorite
        })
        .where(and(
          eq(prompts.id, id),
          eq(prompts.userId, userId) // Ensure user owns the prompt
        ))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`Error toggling favorite status for prompt ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Create a new prompt
   */
  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    try {
      // Debug logging for timestamp investigation
      console.log("=== SERVER PROMPT CREATION DEBUG ===");
      console.log("Insert prompt data:", insertPrompt);
      console.log("Server current time (UTC):", new Date().toISOString());
      console.log("Server current time (local):", new Date().toString());
      console.log("Server timezone offset (minutes):", new Date().getTimezoneOffset());
      console.log("======================================");
      
      const result = await this.db
        .insert(prompts)
        .values(insertPrompt)
        .returning();
      
      console.log("=== CREATED PROMPT DEBUG ===");
      console.log("Created prompt:", result[0]);
      console.log("Created prompt createdAt:", result[0].createdAt);
      console.log("Created prompt createdAt (ISO):", new Date(result[0].createdAt).toISOString());
      console.log("===========================");
      
      return result[0];
    } catch (error) {
      console.error('Error creating prompt:', error);
      throw new Error('Failed to create prompt');
    }
  }

  /**
   * Update an existing prompt
   */
  async updatePrompt(id: string, userId: string, updatePrompt: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    try {
      const result = await this.db
        .update(prompts)
        .set(updatePrompt)
        .where(and(
          eq(prompts.id, id),
          eq(prompts.userId, userId) // Ensure user owns the prompt
        ))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`Error updating prompt ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(prompts)
        .where(and(
          eq(prompts.id, id),
          eq(prompts.userId, userId) // Ensure user owns the prompt
        ));
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error(`Error deleting prompt ${id}:`, error);
      return false;
    }
  }

  /**
   * Get prompt statistics for admin dashboard
   */
  async getPromptStats(): Promise<{
    totalPrompts: number;
    promptsToday: number;
    favoritePrompts: number;
    averagePromptsPerUser: number;
    templateUsage: { templateType: string; count: number }[];
  }> {
    try {
      const result = await this.db.execute(sql`
        WITH prompt_stats AS (
          SELECT 
            COUNT(*) as total_prompts,
            COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as prompts_today,
            COUNT(CASE WHEN is_favorite = true THEN 1 END) as favorite_prompts,
            COALESCE(
              ROUND(
                COUNT(*)::numeric / 
                NULLIF((SELECT COUNT(*) FROM users WHERE is_deleted = false), 0), 
                2
              ), 0
            ) as avg_prompts_per_user
          FROM prompts
          WHERE user_id IS NOT NULL
        )
        SELECT * FROM prompt_stats
      `);

      const templateUsageResult = await this.db.execute(sql`
        SELECT 
          template_type as "templateType", 
          COUNT(*) as "count"
        FROM prompts 
        WHERE template_type IS NOT NULL
        GROUP BY template_type
        ORDER BY "count" DESC
        LIMIT 10
      `);

      const stats = (result as any).rows[0];
      return {
        totalPrompts: Number(stats.total_prompts),
        promptsToday: Number(stats.prompts_today),
        favoritePrompts: Number(stats.favorite_prompts),
        averagePromptsPerUser: Number(stats.avg_prompts_per_user),
        templateUsage: (templateUsageResult as any).rows.map((row: any) => ({
          templateType: row.templateType as string,
          count: Number(row.count)
        }))
      };
    } catch (error) {
      console.error('Error fetching prompt stats:', error);
      return {
        totalPrompts: 0,
        promptsToday: 0,
        favoritePrompts: 0,
        averagePromptsPerUser: 0,
        templateUsage: []
      };
    }
  }

  /**
   * Get user prompt activity metrics
   */
  async getUserPromptActivity(userId: string): Promise<{
    totalPrompts: number;
    favoritePrompts: number;
    recentActivity: Date | null;
    templatePreferences: { templateType: string; count: number }[];
  }> {
    try {
      const result = await this.db.execute(sql`
        WITH user_activity AS (
          SELECT 
            COUNT(*) as total_prompts,
            COUNT(CASE WHEN is_favorite = true THEN 1 END) as favorite_prompts,
            MAX(created_at) as recent_activity
          FROM prompts
          WHERE user_id = ${userId}
        )
        SELECT * FROM user_activity
      `);

      const templatePrefsResult = await this.db.execute(sql`
        SELECT 
          template_type as "templateType", 
          COUNT(*) as "count"
        FROM prompts 
        WHERE user_id = ${userId} AND template_type IS NOT NULL
        GROUP BY template_type
        ORDER BY "count" DESC
        LIMIT 5
      `);

      const stats = (result as any).rows[0];
      return {
        totalPrompts: Number(stats.total_prompts),
        favoritePrompts: Number(stats.favorite_prompts),
        recentActivity: stats.recent_activity ? new Date(stats.recent_activity as string) : null,
        templatePreferences: (templatePrefsResult as any).rows.map((row: any) => ({
          templateType: row.templateType as string,
          count: Number(row.count)
        }))
      };
    } catch (error) {
      console.error(`Error fetching user prompt activity for ${userId}:`, error);
      return {
        totalPrompts: 0,
        favoritePrompts: 0,
        recentActivity: null,
        templatePreferences: []
      };
    }
  }

  /**
   * Search prompts by content or title
   */
  async searchPrompts(userId: string, query: string, limit: number = 20): Promise<Prompt[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT * FROM prompts
        WHERE user_id = ${userId}
        AND (
          title ILIKE ${`%${query}%`} OR 
          natural_language_input ILIKE ${`%${query}%`} OR
          generated_prompt ILIKE ${`%${query}%`}
        )
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);

      return (result as any).rows.map((row: any) => row as Prompt);
    } catch (error) {
      console.error(`Error searching prompts for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get prompts by template type for a user
   */
  async getPromptsByTemplate(userId: string, templateType: string, limit: number = 10): Promise<Prompt[]> {
    try {
      const result = await this.db
        .select()
        .from(prompts)
        .where(and(
          eq(prompts.userId, userId),
          eq(prompts.templateType, templateType)
        ))
        .orderBy(desc(prompts.createdAt))
        .limit(limit);
      
      return result;
    } catch (error) {
      console.error(`Error fetching prompts by template ${templateType} for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get prompts created within a date range
   */
  async getPromptsInDateRange(userId: string, startDate: Date, endDate: Date): Promise<Prompt[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT * FROM prompts
        WHERE user_id = ${userId}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
        ORDER BY created_at DESC
      `);

      return (result as any).rows.map((row: any) => row as Prompt);
    } catch (error) {
      console.error(`Error fetching prompts in date range for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Close database connection pool
   */
  static async closePool(): Promise<void> {
    if (PromptStorageService.pool) {
      await PromptStorageService.pool.end();
      PromptStorageService.pool = null;
    }
  }
}

// Export singleton instance
export const promptStorageService = new PromptStorageService();