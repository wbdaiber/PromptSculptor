/**
 * Production Monitoring Service for Password Recovery System
 * 
 * Provides centralized monitoring, alerting, and metrics collection
 * for the password recovery functionality.
 */

export interface SecurityEvent {
  type: 'password_reset_request' | 'password_reset_success' | 'password_reset_failure' | 'rate_limit_exceeded' | 'invalid_token_attempt' | 'suspicious_activity';
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PasswordResetMetrics {
  totalRequests: number;
  successfulResets: number;
  failedResets: number;
  rateLimitedRequests: number;
  averageTimeToReset: number; // in minutes
  emailDeliverySuccessRate: number;
  tokenUsageRate: number; // percentage of tokens actually used
  topFailureReasons: Array<{reason: string; count: number}>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private securityEvents: SecurityEvent[] = [];
  private metrics: Partial<PasswordResetMetrics> = {};

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Log a security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    // Store event in memory (in production, you'd want to persist this)
    this.securityEvents.push(fullEvent);

    // Console logging with appropriate level
    const logLevel = this.getLogLevel(event.severity);
    const logMessage = this.formatSecurityEvent(fullEvent);

    console[logLevel](logMessage);

    // In production, you would also:
    // - Send to external logging service (DataDog, Splunk, etc.)
    // - Send alerts for high/critical severity events
    // - Store in database for analysis
    // - Send to SIEM system if available

    if (event.severity === 'critical' || event.severity === 'high') {
      this.sendAlert(fullEvent);
    }
  }

  /**
   * Record password reset metrics
   */
  recordMetric(metricName: keyof PasswordResetMetrics, value: number | Array<{reason: string; count: number}>): void {
    // Type guard for topFailureReasons
    if (metricName === 'topFailureReasons') {
      if (Array.isArray(value)) {
        this.metrics[metricName] = value;
      } else {
        console.warn('topFailureReasons should be an array, ignoring numeric value');
        return;
      }
    } else {
      this.metrics[metricName] = value as number;
    }
    
    console.log(`📊 Metric recorded: ${metricName} = ${value}`);
    
    // In production, send to metrics service (Prometheus, CloudWatch, etc.)
  }

  /**
   * Get recent security events
   */
  getRecentSecurityEvents(hours: number = 24): SecurityEvent[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.securityEvents.filter(event => event.timestamp > cutoff);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): Partial<PasswordResetMetrics> {
    return { ...this.metrics };
  }

  /**
   * Generate security report
   */
  generateSecurityReport(hours: number = 24): {
    summary: {
      totalEvents: number;
      criticalEvents: number;
      rateLimitViolations: number;
      suspiciousAttempts: number;
    };
    events: SecurityEvent[];
    recommendations: string[];
  } {
    const events = this.getRecentSecurityEvents(hours);
    
    const summary = {
      totalEvents: events.length,
      criticalEvents: events.filter(e => e.severity === 'critical').length,
      rateLimitViolations: events.filter(e => e.type === 'rate_limit_exceeded').length,
      suspiciousAttempts: events.filter(e => e.type === 'invalid_token_attempt').length
    };

    const recommendations: string[] = [];

    if (summary.criticalEvents > 0) {
      recommendations.push('Review critical security events immediately');
    }

    if (summary.rateLimitViolations > 10) {
      recommendations.push('High rate limiting activity detected - consider adjusting limits or investigating sources');
    }

    if (summary.suspiciousAttempts > 5) {
      recommendations.push('Multiple invalid token attempts detected - possible brute force attack');
    }

    if (events.length === 0) {
      recommendations.push('No security events in the last 24 hours - system operating normally');
    }

    return {
      summary,
      events,
      recommendations
    };
  }

  /**
   * Health check for password recovery system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail';
      details?: string;
    }>;
  }> {
    // Import health check function dynamically to avoid circular dependencies
    const { performSystemHealthCheck } = await import('./healthCheck.js');
    return await performSystemHealthCheck();
  }

  private getLogLevel(severity: SecurityEvent['severity']): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'low': return 'log';
      case 'medium': return 'log';
      case 'high': return 'warn';
      case 'critical': return 'error';
      default: return 'log';
    }
  }

  private formatSecurityEvent(event: SecurityEvent): string {
    const { type, userId, email, ipAddress, timestamp, severity } = event;
    const userInfo = userId ? `User: ${userId}` : email ? `Email: ${email}` : 'Anonymous';
    const ip = ipAddress ? `IP: ${ipAddress}` : '';
    
    return `🔒 [${severity.toUpperCase()}] ${type} - ${userInfo} ${ip} at ${timestamp.toISOString()}`;
  }

  private sendAlert(event: SecurityEvent): void {
    // In production, this would send alerts via:
    // - Slack/Teams webhooks
    // - Email notifications
    // - SMS alerts
    // - PagerDuty/similar service
    
    console.error(`🚨 SECURITY ALERT: ${event.type} - Severity: ${event.severity}`);
    console.error(`   Details: ${JSON.stringify(event.details || {})}`);
    console.error(`   Time: ${event.timestamp.toISOString()}`);
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();

// Convenience functions for common security events
export const SecurityEventLogger = {
  passwordResetRequested: (email: string, userId: string, ipAddress?: string) => {
    monitoringService.logSecurityEvent({
      type: 'password_reset_request',
      userId,
      email,
      ipAddress,
      severity: 'low'
    });
  },

  passwordResetSuccessful: (userId: string, ipAddress?: string) => {
    monitoringService.logSecurityEvent({
      type: 'password_reset_success',
      userId,
      ipAddress,
      severity: 'medium'
    });
  },

  passwordResetFailed: (reason: string, userId?: string, ipAddress?: string) => {
    monitoringService.logSecurityEvent({
      type: 'password_reset_failure',
      userId,
      ipAddress,
      details: { reason },
      severity: 'medium'
    });
  },

  rateLimitExceeded: (ipAddress: string, endpoint: string) => {
    monitoringService.logSecurityEvent({
      type: 'rate_limit_exceeded',
      ipAddress,
      details: { endpoint },
      severity: 'high'
    });
  },

  invalidTokenAttempt: (token: string, ipAddress?: string) => {
    monitoringService.logSecurityEvent({
      type: 'invalid_token_attempt',
      ipAddress,
      details: { tokenPreview: token.substring(0, 8) + '...' },
      severity: 'high'
    });
  },

  suspiciousActivity: (description: string, details?: Record<string, any>, ipAddress?: string) => {
    monitoringService.logSecurityEvent({
      type: 'suspicious_activity',
      ipAddress,
      details: { description, ...details },
      severity: 'critical'
    });
  }
};

// Export the monitoring service for direct use
export { MonitoringService };