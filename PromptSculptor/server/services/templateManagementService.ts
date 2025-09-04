import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { 
  type Template, 
  type InsertTemplate,
  templates
} from '../../shared/schema.js';
import { TemplateService } from './templateService.js';

export class TemplateManagementService {
  private db: ReturnType<typeof drizzle>;
  private templateService: TemplateService;
  private static pool: Pool | null = null;

  constructor() {
    try {
      if (!TemplateManagementService.pool) {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
          console.error('[TemplateManagementService] DATABASE_URL is not set in environment variables');
          throw new Error('DATABASE_URL environment variable is not configured');
        }
        console.log('[TemplateManagementService] Initializing database pool with URL:', dbUrl ? 'URL exists' : 'URL missing');
        
        // Vercel serverless-friendly pool configuration
        TemplateManagementService.pool = new Pool({
          connectionString: dbUrl,
          max: process.env.VERCEL ? 1 : 10, // Use single connection in Vercel
          idleTimeoutMillis: process.env.VERCEL ? 10000 : 30000, // Shorter timeout in Vercel
          connectionTimeoutMillis: 5000, // Increased timeout for cold starts
          // Additional settings for serverless environments
          statement_timeout: 60000,
          query_timeout: 60000,
          application_name: 'promptsculptor-vercel'
        });
        
        // Test the connection immediately
        TemplateManagementService.pool.on('error', (err) => {
          console.error('[TemplateManagementService] Unexpected database pool error:', err);
        });
      }
      
      this.db = drizzle(TemplateManagementService.pool);
      this.templateService = TemplateService.getInstance();
      console.log('[TemplateManagementService] Service initialized successfully');
    } catch (error) {
      console.error('[TemplateManagementService] Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Clean up database connections (useful for serverless environments)
   */
  static async cleanup(): Promise<void> {
    if (TemplateManagementService.pool) {
      try {
        await TemplateManagementService.pool.end();
        TemplateManagementService.pool = null;
        console.log('[TemplateManagementService] Database pool closed successfully');
      } catch (error) {
        console.error('[TemplateManagementService] Error closing database pool:', error);
      }
    }
  }

  /**
   * Initialize default system templates using UPSERT for idempotency
   * This method is safe to call multiple times and handles concurrency
   */
  async initializeDefaultTemplates(): Promise<void> {
    try {
      const defaultTemplates = await this.templateService.getDefaultTemplates();
      
      await this.db.transaction(async (tx) => {
        for (const template of defaultTemplates) {
          // Check if template already exists
          const existing = await tx
            .select()
            .from(templates)
            .where(and(
              eq(templates.slug, template.slug!),
              eq(templates.isDefault, true)
            ))
            .limit(1);
          
          if (existing.length === 0) {
            // Insert new template
            await tx
              .insert(templates)
              .values({
                ...template,
                isDefault: true,
                userId: null
              });
          } else {
            // Update existing template if needed
            await tx
              .update(templates)
              .set({
                name: template.name,
                description: template.description,
                sampleInput: template.sampleInput,
                promptStructure: template.promptStructure,
              })
              .where(and(
                eq(templates.slug, template.slug!),
                eq(templates.isDefault, true)
              ));
          }
        }
      });
      console.log('✅ Default templates initialized/updated successfully');
    } catch (error) {
      console.error('Error initializing default templates:', error);
      // Don't throw - allow app to continue even if templates fail to initialize
    }
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<Template | undefined> {
    try {
      const result = await this.db
        .select()
        .from(templates)
        .where(eq(templates.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`Error fetching template ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Get all templates (system + user templates)
   */
  async getTemplates(): Promise<Template[]> {
    try {
      const result = await this.db
        .select()
        .from(templates)
        .orderBy(templates.isDefault, desc(templates.createdAt));
      
      return result;
    } catch (error) {
      console.error('Error fetching all templates:', error);
      return [];
    }
  }

  /**
   * Get templates by type (e.g., 'email', 'blog', 'creative')
   */
  async getTemplatesByType(type: string): Promise<Template[]> {
    try {
      const result = await this.db
        .select()
        .from(templates)
        .where(eq(templates.type, type))
        .orderBy(templates.isDefault, desc(templates.createdAt));
      
      return result;
    } catch (error) {
      console.error(`Error fetching templates by type ${type}:`, error);
      return [];
    }
  }

  /**
   * Get user-specific templates
   */
  async getUserTemplates(userId: string): Promise<Template[]> {
    try {
      const result = await this.db
        .select()
        .from(templates)
        .where(eq(templates.userId, userId))
        .orderBy(desc(templates.createdAt));
      
      return result;
    } catch (error) {
      console.error(`Error fetching user templates for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get only default system templates (public)
   */
  async getDefaultTemplates(): Promise<Template[]> {
    try {
      const result = await this.db
        .select()
        .from(templates)
        .where(eq(templates.isDefault, true))
        .orderBy(templates.type);
      
      return result;
    } catch (error) {
      console.error('Error fetching default templates:', error);
      // Fallback: Return in-memory default templates if database query fails
      // This handles the case where slug column doesn't exist yet
      const templateService = TemplateService.getInstance();
      const defaultTemplates = templateService.getDefaultTemplates();
      return defaultTemplates.map((t, index) => ({
        ...t,
        id: `default-${t.type}`,
        slug: t.slug || null,
        userId: null,
        isDefault: true,
        createdAt: new Date()
      })) as Template[];
    }
  }

  /**
   * Get templates accessible to a user (system + their own)
   */
  async getAccessibleTemplates(userId?: string): Promise<Template[]> {
    try {
      const result = await this.db
        .select()
        .from(templates)
        .where(
          userId 
            ? or(
                eq(templates.isDefault, true),
                eq(templates.userId, userId)
              )
            : eq(templates.isDefault, true)
        )
        .orderBy(templates.isDefault, desc(templates.createdAt));
      
      return result;
    } catch (error) {
      console.error('Error fetching accessible templates:', error);
      // Fallback: Return in-memory default templates if database query fails
      // This handles the case where slug column doesn't exist yet
      const templateService = TemplateService.getInstance();
      const defaultTemplates = templateService.getDefaultTemplates();
      return defaultTemplates.map((t, index) => ({
        ...t,
        id: `default-${t.type}`,
        slug: t.slug || null,
        userId: null,
        isDefault: true,
        createdAt: new Date()
      })) as Template[];
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    try {
      console.log('[TemplateManagementService] Creating template with data:', insertTemplate);
      
      if (!this.db) {
        console.error('[TemplateManagementService] Database connection not initialized');
        throw new Error('Database connection not initialized');
      }
      
      const result = await this.db
        .insert(templates)
        .values(insertTemplate)
        .returning();
      
      if (!result || result.length === 0) {
        console.error('[TemplateManagementService] No result returned from database insert');
        throw new Error('Failed to create template - no result returned');
      }
      
      console.log('[TemplateManagementService] Template created successfully:', result[0]);
      return result[0];
    } catch (error) {
      console.error('[TemplateManagementService] Error creating template:', error);
      console.error('[TemplateManagementService] Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('[TemplateManagementService] Database URL exists:', !!process.env.DATABASE_URL);
      
      if (error instanceof Error && error.message.includes('connect')) {
        throw new Error('Database connection failed - please check DATABASE_URL configuration');
      }
      
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, userId: string, updateTemplate: Partial<InsertTemplate>): Promise<Template | undefined> {
    try {
      // Only allow updating user's own templates
      const result = await this.db
        .update(templates)
        .set(updateTemplate)
        .where(and(
          eq(templates.id, id),
          eq(templates.userId, userId)
        ))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`Error updating template ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string, userId: string): Promise<boolean> {
    try {
      // Only allow deleting user's own templates (not system defaults)
      const result = await this.db
        .delete(templates)
        .where(and(
          eq(templates.id, id),
          eq(templates.userId, userId),
          eq(templates.isDefault, false) // Cannot delete system templates
        ));
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error(`Error deleting template ${id}:`, error);
      return false;
    }
  }

  /**
   * Get template statistics for admin dashboard
   */
  async getTemplateStats(): Promise<{
    totalTemplates: number;
    systemTemplates: number;
    userTemplates: number;
    templateTypes: { type: string; count: number }[];
    popularTemplates: { id: string; title: string; usageCount: number }[];
  }> {
    try {
      const result = await this.db.execute(sql`
        WITH template_stats AS (
          SELECT 
            COUNT(*) as total_templates,
            COUNT(CASE WHEN is_default = true THEN 1 END) as system_templates,
            COUNT(CASE WHEN is_default = false THEN 1 END) as user_templates
          FROM templates
        )
        SELECT * FROM template_stats
      `);

      const typeStatsResult = await this.db.execute(sql`
        SELECT 
          type, 
          COUNT(*) as "count"
        FROM templates 
        GROUP BY type
        ORDER BY "count" DESC
      `);

      const popularTemplatesResult = await this.db.execute(sql`
        SELECT 
          t.id,
          t.title,
          COALESCE(p.usage_count, 0) as "usageCount"
        FROM templates t
        LEFT JOIN (
          SELECT template_type, COUNT(*) as usage_count
          FROM prompts 
          WHERE template_type IS NOT NULL
          GROUP BY template_type
        ) p ON t.type = p.template_type
        ORDER BY "usageCount" DESC
        LIMIT 10
      `);

      const stats = (result as any).rows[0];
      return {
        totalTemplates: Number(stats.total_templates),
        systemTemplates: Number(stats.system_templates),
        userTemplates: Number(stats.user_templates),
        templateTypes: (typeStatsResult as any).rows.map((row: any) => ({
          type: row.type as string,
          count: Number(row.count)
        })),
        popularTemplates: (popularTemplatesResult as any).rows.map((row: any) => ({
          id: row.id as string,
          title: row.title as string,
          usageCount: Number(row.usageCount)
        }))
      };
    } catch (error) {
      console.error('Error fetching template stats:', error);
      return {
        totalTemplates: 0,
        systemTemplates: 0,
        userTemplates: 0,
        templateTypes: [],
        popularTemplates: []
      };
    }
  }

  /**
   * Get user template activity
   */
  async getUserTemplateActivity(userId: string): Promise<{
    createdTemplates: number;
    favoriteTemplateTypes: { type: string; count: number }[];
    recentTemplateUsage: Date | null;
  }> {
    try {
      const result = await this.db.execute(sql`
        WITH user_template_stats AS (
          SELECT 
            COUNT(*) as created_templates
          FROM templates
          WHERE user_id = ${userId}
        ),
        template_usage AS (
          SELECT 
            MAX(created_at) as recent_usage
          FROM prompts
          WHERE user_id = ${userId} AND template_type IS NOT NULL
        )
        SELECT 
          uts.created_templates,
          tu.recent_usage
        FROM user_template_stats uts
        CROSS JOIN template_usage tu
      `);

      const favoriteTypesResult = await this.db.execute(sql`
        SELECT 
          template_type as "type", 
          COUNT(*) as "count"
        FROM prompts 
        WHERE user_id = ${userId} AND template_type IS NOT NULL
        GROUP BY template_type
        ORDER BY "count" DESC
        LIMIT 5
      `);

      const stats = (result as any).rows[0];
      return {
        createdTemplates: Number(stats.created_templates),
        favoriteTemplateTypes: (favoriteTypesResult as any).rows.map((row: any) => ({
          type: row.type as string,
          count: Number(row.count)
        })),
        recentTemplateUsage: stats.recent_usage ? new Date(stats.recent_usage as string) : null
      };
    } catch (error) {
      console.error(`Error fetching user template activity for ${userId}:`, error);
      return {
        createdTemplates: 0,
        favoriteTemplateTypes: [],
        recentTemplateUsage: null
      };
    }
  }

  /**
   * Search templates by title or content
   */
  async searchTemplates(query: string, userId?: string, limit: number = 20): Promise<Template[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT * FROM templates
        WHERE (
          title ILIKE ${`%${query}%`} OR 
          description ILIKE ${`%${query}%`} OR
          sample_input ILIKE ${`%${query}%`}
        )
        AND (
          is_default = true 
          ${userId ? sql`OR user_id = ${userId}` : sql``}
        )
        ORDER BY is_default DESC, created_at DESC
        LIMIT ${limit}
      `);

      return (result as any).rows.map((row: any) => row as Template);
    } catch (error) {
      console.error('Error searching templates:', error);
      return [];
    }
  }

  /**
   * Get template usage analytics
   */
  async getTemplateUsageAnalytics(): Promise<{
    type: string;
    usageCount: number;
    uniqueUsers: number;
    avgPromptsPerUser: number;
  }[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          template_type as "type",
          COUNT(*) as "usageCount",
          COUNT(DISTINCT user_id) as "uniqueUsers",
          COALESCE(
            ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2), 
            0
          ) as "avgPromptsPerUser"
        FROM prompts
        WHERE template_type IS NOT NULL AND user_id IS NOT NULL
        GROUP BY template_type
        ORDER BY "usageCount" DESC
      `);

      return (result as any).rows.map((row: any) => ({
        type: row.type as string,
        usageCount: Number(row.usageCount),
        uniqueUsers: Number(row.uniqueUsers),
        avgPromptsPerUser: Number(row.avgPromptsPerUser)
      }));
    } catch (error) {
      console.error('Error fetching template usage analytics:', error);
      return [];
    }
  }

  /**
   * Clone a system template for user customization
   */
  async cloneTemplate(templateId: string, userId: string, customTitle?: string): Promise<Template | undefined> {
    try {
      // Get the original template
      const originalTemplate = await this.getTemplate(templateId);
      if (!originalTemplate) return undefined;

      // Create a user copy
      const clonedTemplate: InsertTemplate = {
        name: customTitle || `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        type: originalTemplate.type,
        icon: originalTemplate.icon,
        iconColor: originalTemplate.iconColor,
        sampleInput: originalTemplate.sampleInput,
        promptStructure: originalTemplate.promptStructure as any,
        isDefault: false,
        userId: userId
      };

      return await this.createTemplate(clonedTemplate);
    } catch (error) {
      console.error(`Error cloning template ${templateId}:`, error);
      return undefined;
    }
  }

  /**
   * Close database connection pool
   */
  static async closePool(): Promise<void> {
    if (TemplateManagementService.pool) {
      await TemplateManagementService.pool.end();
      TemplateManagementService.pool = null;
    }
  }
}

// Lazy initialization for serverless environments
let _instance: TemplateManagementService | null = null;

export const getTemplateManagementService = (): TemplateManagementService => {
  if (!_instance) {
    _instance = new TemplateManagementService();
  }
  return _instance;
};

// For backward compatibility, export a getter that creates the instance lazily
export const templateManagementService = getTemplateManagementService();