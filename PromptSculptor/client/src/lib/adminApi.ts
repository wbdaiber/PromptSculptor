// Admin API client for monitoring endpoints with authentication

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    details?: string;
  }>;
}

export interface SecurityEvent {
  type: 'password_reset_request' | 'password_reset_success' | 'password_reset_failure' | 'rate_limit_exceeded' | 'invalid_token_attempt' | 'suspicious_activity';
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityReport {
  report: {
    summary: {
      totalEvents: number;
      criticalEvents: number;
      rateLimitViolations: number;
      suspiciousAttempts: number;
    };
    events: SecurityEvent[];
    recommendations: string[];
  };
  timestamp: string;
}

export interface TokenStatistics {
  total: number;
  active: number;
  expired: number;
  used: number;
  cleanupRequired: number;
}

export interface MetricsData {
  passwordResetMetrics: {
    totalRequests: number;
    successfulResets: number;
    failedResets: number;
    rateLimitedRequests: number;
    averageTimeToReset: number;
    emailDeliverySuccessRate: number;
    tokenUsageRate: number;
    topFailureReasons: Array<{reason: string; count: number}>;
  };
  tokenStatistics: TokenStatistics;
  timestamp: string;
}

export interface CleanupResult {
  cleanup: {
    tokensRemoved: number;
    oldestTokenAge: number;
    totalActiveTokens: number;
  };
  timestamp: string;
}

// Base admin API request function with session-based authentication
async function adminApiRequest(
  method: string, 
  endpoint: string, 
  body?: any
): Promise<Response> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include session cookies
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Request failed';
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    
    throw new Error(`${response.status}: ${errorMessage}`);
  }

  return response;
}

// Health monitoring functions
export async function getSystemHealth(): Promise<HealthStatus> {
  const response = await adminApiRequest('GET', '/api/monitoring/health');
  return response.json();
}

export async function getSystemMetrics(): Promise<MetricsData> {
  const response = await adminApiRequest('GET', '/api/monitoring/metrics');
  return response.json();
}

export async function getSecurityReport(hours: number = 24): Promise<SecurityReport> {
  const response = await adminApiRequest('GET', `/api/monitoring/security?hours=${hours}`);
  return response.json();
}

// System administration functions
export async function triggerTokenCleanup(): Promise<CleanupResult> {
  const response = await adminApiRequest('POST', '/api/monitoring/cleanup-tokens');
  return response.json();
}

// Test admin authentication validity
export async function testAdminAuth(): Promise<boolean> {
  try {
    await getSystemHealth();
    return true;
  } catch (error) {
    console.error('Admin auth test failed:', error);
    return false;
  }
}

// User analytics functions (to be implemented with database queries)
export interface UserGrowthData {
  period: string;
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

// User analytics functions
export async function getUserGrowthData(period: '7d' | '30d' | '90d' = '30d'): Promise<UserGrowthData> {
  const response = await adminApiRequest('GET', `/api/monitoring/user-growth?period=${period}`);
  const result = await response.json();
  return result.data;
}

export async function getUserEngagementMetrics(): Promise<UserEngagementData> {
  const response = await adminApiRequest('GET', '/api/monitoring/user-engagement');
  const result = await response.json();
  return result.data;
}

export async function getUserRetentionStats(): Promise<UserRetentionData> {
  const response = await adminApiRequest('GET', '/api/monitoring/user-retention');
  const result = await response.json();
  return result.data;
}

export async function getUserActivityData(): Promise<UserActivityData> {
  const response = await adminApiRequest('GET', '/api/monitoring/user-activity');
  const result = await response.json();
  return result.data;
}

// Error handling utilities
export class AdminApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

// Rate limiting helper
export class RateLimitHelper {
  private static requests = new Map<string, number[]>();
  
  static canMakeRequest(endpoint: string, maxRequests = 60, windowMs = 60000): boolean {
    const now = Date.now();
    const key = endpoint;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    this.requests.set(key, validRequests);
    
    return validRequests.length < maxRequests;
  }
  
  static recordRequest(endpoint: string): void {
    const now = Date.now();
    const key = endpoint;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    this.requests.get(key)!.push(now);
  }
}