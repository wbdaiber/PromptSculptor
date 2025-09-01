import { users, prompts, userApiKeys } from '@shared/schema';
import { sql, desc, gte, lt, and, count, isNotNull, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export interface UserGrowthData {
  period: '7d' | '30d' | '90d';
  signups: Array<{
    date: string;
    count: number;
  }>;
  totalUsers: number;
  growthRate: number;
}

export interface UserEngagementData {
  totalUsers: number;
  activeUsers: number;
  promptsGenerated: number;
  apiKeysConfigured: number;
  favoritePrompts: number;
  averagePromptsPerUser: number;
}

export interface UserRetentionData {
  newUsers: number;
  returningUsers: number;
  retentionRate: number;
  churnRate: number;
}

export interface UserActivityData {
  recentSignups: Array<{
    id: string;
    username: string;
    email: string;
    createdAt: string;
  }>;
  recentPrompts: Array<{
    id: string;
    title: string;
    templateType: string;
    createdAt: string;
    username?: string;
  }>;
  topTemplateTypes: Array<{
    templateType: string;
    count: number;
  }>;
}

class UserAnalyticsService {
  private db: ReturnType<typeof drizzle>;
  private static pool: Pool;
  private static dbInstance: ReturnType<typeof drizzle>;

  constructor() {
    // Initialize singleton pool and db instance
    if (!UserAnalyticsService.pool) {
      UserAnalyticsService.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      UserAnalyticsService.dbInstance = drizzle(UserAnalyticsService.pool);
    }
    
    this.db = UserAnalyticsService.dbInstance;
  }

  /**
   * Get user growth data for specified period
   */
  async getUserGrowthData(period: '7d' | '30d' | '90d' = '30d'): Promise<UserGrowthData> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily signup counts
    const signupData = await this.db
      .select({
        date: sql<string>`date_trunc('day', ${users.createdAt})::date`,
        count: count(users.id),
      })
      .from(users)
      .where(and(
        gte(users.createdAt, startDate),
        eq(users.isDeleted, false)
      ))
      .groupBy(sql`date_trunc('day', ${users.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${users.createdAt})::date`);

    // Get total active users
    const [{ total }] = await this.db
      .select({ total: count(users.id) })
      .from(users)
      .where(eq(users.isDeleted, false));

    // Calculate growth rate (comparing current period to previous period)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    const [currentPeriodSignups] = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .where(and(
        gte(users.createdAt, startDate),
        eq(users.isDeleted, false)
      ));

    const [previousPeriodSignups] = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .where(and(
        gte(users.createdAt, previousPeriodStart),
        lt(users.createdAt, startDate),
        eq(users.isDeleted, false)
      ));

    const growthRate = previousPeriodSignups.count > 0 
      ? ((currentPeriodSignups.count - previousPeriodSignups.count) / previousPeriodSignups.count) * 100
      : currentPeriodSignups.count > 0 ? 100 : 0;

    // Fill in missing days with zero counts
    const signups: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existing = signupData.find((s: any) => s.date === dateStr);
      signups.push({
        date: dateStr,
        count: existing ? existing.count : 0,
      });
    }

    return {
      period,
      signups,
      totalUsers: total,
      growthRate: Math.round(growthRate * 100) / 100,
    };
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(): Promise<UserEngagementData> {
    // Total active users
    const [{ totalUsers }] = await this.db
      .select({ totalUsers: count(users.id) })
      .from(users)
      .where(eq(users.isDeleted, false));

    // Active users (users with prompts in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ activeUsers }] = await this.db
      .select({ activeUsers: sql<number>`count(distinct ${prompts.userId})` })
      .from(prompts)
      .where(and(
        gte(prompts.createdAt, thirtyDaysAgo),
        isNotNull(prompts.userId)
      ));

    // Total prompts generated
    const [{ promptsGenerated }] = await this.db
      .select({ promptsGenerated: count(prompts.id) })
      .from(prompts);

    // Users with API keys configured
    const [{ apiKeysConfigured }] = await this.db
      .select({ apiKeysConfigured: sql<number>`count(distinct ${userApiKeys.userId})` })
      .from(userApiKeys);

    // Favorite prompts
    const [{ favoritePrompts }] = await this.db
      .select({ favoritePrompts: count(prompts.id) })
      .from(prompts)
      .where(eq(prompts.isFavorite, true));

    // Average prompts per user
    const averagePromptsPerUser = totalUsers > 0 ? Math.round((promptsGenerated / totalUsers) * 100) / 100 : 0;

    return {
      totalUsers,
      activeUsers: activeUsers || 0,
      promptsGenerated,
      apiKeysConfigured: apiKeysConfigured || 0,
      favoritePrompts,
      averagePromptsPerUser,
    };
  }

  /**
   * Get user retention data
   */
  async getUserRetentionStats(): Promise<UserRetentionData> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // New users in the last 30 days
    const [{ newUsers }] = await this.db
      .select({ newUsers: count(users.id) })
      .from(users)
      .where(and(
        gte(users.createdAt, thirtyDaysAgo),
        eq(users.isDeleted, false)
      ));

    // Users who created prompts in the last 30 days but registered before that
    const [{ returningUsers }] = await this.db
      .select({ returningUsers: sql<number>`count(distinct ${prompts.userId})` })
      .from(prompts)
      .innerJoin(users, eq(prompts.userId, users.id))
      .where(and(
        gte(prompts.createdAt, thirtyDaysAgo),
        lt(users.createdAt, thirtyDaysAgo),
        eq(users.isDeleted, false)
      ));

    // Total users before 30 days ago
    const [{ totalOldUsers }] = await this.db
      .select({ totalOldUsers: count(users.id) })
      .from(users)
      .where(and(
        lt(users.createdAt, thirtyDaysAgo),
        eq(users.isDeleted, false)
      ));

    const retentionRate = totalOldUsers > 0 ? (returningUsers / totalOldUsers) * 100 : 0;
    const churnRate = 100 - retentionRate;

    return {
      newUsers,
      returningUsers: returningUsers || 0,
      retentionRate: Math.round(retentionRate * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
    };
  }

  /**
   * Get recent user activity
   */
  async getUserActivityData(): Promise<UserActivityData> {
    // Recent signups (last 10)
    const recentSignups = await this.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.isDeleted, false))
      .orderBy(desc(users.createdAt))
      .limit(10);

    // Recent prompts (last 20)
    const recentPromptsData = await this.db
      .select({
        id: prompts.id,
        title: prompts.title,
        templateType: prompts.templateType,
        createdAt: prompts.createdAt,
        username: users.username,
      })
      .from(prompts)
      .leftJoin(users, eq(prompts.userId, users.id))
      .orderBy(desc(prompts.createdAt))
      .limit(20);

    // Top template types
    const topTemplateTypes = await this.db
      .select({
        templateType: prompts.templateType,
        count: count(prompts.id),
      })
      .from(prompts)
      .groupBy(prompts.templateType)
      .orderBy(desc(count(prompts.id)))
      .limit(10);

    return {
      recentSignups: recentSignups.map((user: any) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
      })),
      recentPrompts: recentPromptsData.map((prompt: any) => ({
        ...prompt,
        createdAt: prompt.createdAt.toISOString(),
      })),
      topTemplateTypes,
    };
  }
}

export const userAnalyticsService = new UserAnalyticsService();