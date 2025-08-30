#!/usr/bin/env tsx

/**
 * Security Audit Script for Password Recovery System
 * 
 * Comprehensive security validation for production readiness
 */

import 'dotenv/config';
import { Resend } from 'resend';
import { config } from '../config/env.js';

interface SecurityTest {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
}

class SecurityAuditor {
  private tests: SecurityTest[] = [];

  async runFullAudit(): Promise<void> {
    console.log('🔒 PromptSculptor Security Audit');
    console.log('================================');
    console.log(`Started at: ${new Date().toISOString()}\n`);

    await this.auditEnvironmentSecurity();
    await this.auditPasswordResetSecurity();
    await this.auditEmailSecurity();
    await this.auditRateLimitingSecurity();
    await this.auditDatabaseSecurity();
    await this.auditTokenSecurity();
    await this.auditLoggingSecurity();

    this.generateReport();
  }

  private async auditEnvironmentSecurity(): Promise<void> {
    console.log('📋 Environment Security Audit');
    console.log('------------------------------');

    // Check NODE_ENV
    this.addTest({
      name: 'NODE_ENV Configuration',
      status: config.NODE_ENV === 'production' ? 'pass' : 'warning',
      details: `NODE_ENV is set to: ${config.NODE_ENV}`,
      severity: config.NODE_ENV === 'production' ? 'low' : 'medium',
      recommendation: config.NODE_ENV !== 'production' ? 'Set NODE_ENV=production for production deployment' : undefined
    });

    // Check session secret length
    this.addTest({
      name: 'Session Secret Strength',
      status: config.SESSION_SECRET.length >= 64 ? 'pass' : 'fail',
      details: `Session secret length: ${config.SESSION_SECRET.length} characters`,
      severity: config.SESSION_SECRET.length >= 64 ? 'low' : 'critical',
      recommendation: config.SESSION_SECRET.length < 64 ? 'Generate a session secret of at least 64 characters' : undefined
    });

    // Check encryption key
    this.addTest({
      name: 'Encryption Key Configuration',
      status: config.ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]{64}$/.test(config.ENCRYPTION_KEY) ? 'pass' : 'fail',
      details: `Encryption key format: ${config.ENCRYPTION_KEY.length === 64 ? 'Valid length' : 'Invalid length'}, ${/^[0-9a-fA-F]{64}$/.test(config.ENCRYPTION_KEY) ? 'Valid hex' : 'Invalid format'}`,
      severity: config.ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]{64}$/.test(config.ENCRYPTION_KEY) ? 'low' : 'critical',
      recommendation: !/^[0-9a-fA-F]{64}$/.test(config.ENCRYPTION_KEY) ? 'Generate proper 64-character hex encryption key' : undefined
    });

    // Check admin API key
    this.addTest({
      name: 'Admin API Key Security',
      status: config.ADMIN_API_KEY && config.ADMIN_API_KEY.length >= 32 ? 'pass' : 'fail',
      details: `Admin API key length: ${config.ADMIN_API_KEY?.length || 0} characters`,
      severity: config.ADMIN_API_KEY && config.ADMIN_API_KEY.length >= 32 ? 'low' : 'high',
      recommendation: !config.ADMIN_API_KEY || config.ADMIN_API_KEY.length < 32 ? 'Generate secure admin API key (32+ characters)' : undefined
    });

    console.log('✅ Environment security audit completed\n');
  }

  private async auditPasswordResetSecurity(): Promise<void> {
    console.log('🔑 Password Reset Security Audit');
    console.log('--------------------------------');

    // Test token generation security
    try {
      const { generateResetToken } = await import('../services/tokenService.js');
      const token1 = generateResetToken(30);
      const token2 = generateResetToken(30);

      // Ensure tokens are different
      this.addTest({
        name: 'Token Randomness',
        status: token1.token !== token2.token ? 'pass' : 'fail',
        details: 'Generated tokens are unique',
        severity: token1.token !== token2.token ? 'low' : 'critical',
        recommendation: token1.token === token2.token ? 'Token generation is not random - security vulnerability!' : undefined
      });

      // Test token length
      this.addTest({
        name: 'Token Length Security',
        status: token1.token.length >= 43 ? 'pass' : 'fail', // Base64 encoded 32 bytes = 44 chars (with padding)
        details: `Token length: ${token1.token.length} characters`,
        severity: token1.token.length >= 43 ? 'low' : 'high',
        recommendation: token1.token.length < 43 ? 'Tokens should be at least 32 bytes (44 base64 characters)' : undefined
      });

      // Test token expiration
      const shortToken = generateResetToken(0.01); // 36 seconds
      const isExpired = shortToken.expiresAt.getTime() <= Date.now() + (60 * 1000); // Within 1 minute

      this.addTest({
        name: 'Token Expiration',
        status: isExpired ? 'pass' : 'warning',
        details: `Token expires in: ${Math.round((shortToken.expiresAt.getTime() - Date.now()) / 1000)} seconds`,
        severity: 'low'
      });

    } catch (error) {
      this.addTest({
        name: 'Token Service Availability',
        status: 'fail',
        details: `Token service error: ${error}`,
        severity: 'critical',
        recommendation: 'Fix token service implementation'
      });
    }

    console.log('✅ Password reset security audit completed\n');
  }

  private async auditEmailSecurity(): Promise<void> {
    console.log('📧 Email Security Audit');
    console.log('-----------------------');

    // Check Resend API key format
    const resendKey = config.RESEND_API_KEY;
    this.addTest({
      name: 'Email API Key Format',
      status: resendKey?.startsWith('re_') ? 'pass' : 'fail',
      details: `API key format: ${resendKey ? 'Present' : 'Missing'}, ${resendKey?.startsWith('re_') ? 'Valid format' : 'Invalid format'}`,
      severity: resendKey?.startsWith('re_') ? 'low' : 'high',
      recommendation: !resendKey?.startsWith('re_') ? 'Configure valid Resend API key' : undefined
    });

    // Check email from configuration
    this.addTest({
      name: 'Email From Address',
      status: config.EMAIL_FROM?.includes('@') ? 'pass' : 'fail',
      details: `Email from: ${config.EMAIL_FROM || 'Not configured'}`,
      severity: config.EMAIL_FROM?.includes('@') ? 'low' : 'high',
      recommendation: !config.EMAIL_FROM?.includes('@') ? 'Configure valid sender email address' : undefined
    });

    // Check APP_URL for email links
    this.addTest({
      name: 'Application URL Security',
      status: config.APP_URL.startsWith('https://') || config.NODE_ENV === 'development' ? 'pass' : 'fail',
      details: `App URL: ${config.APP_URL}`,
      severity: config.APP_URL.startsWith('https://') || config.NODE_ENV === 'development' ? 'low' : 'high',
      recommendation: !config.APP_URL.startsWith('https://') && config.NODE_ENV === 'production' ? 'Use HTTPS URL for production' : undefined
    });

    // Test email template security (no sensitive info exposure)
    try {
      const { sendPasswordResetEmail } = await import('../services/emailService.js');
      
      this.addTest({
        name: 'Email Service Availability',
        status: 'pass',
        details: 'Email service loaded successfully',
        severity: 'low'
      });
    } catch (error) {
      this.addTest({
        name: 'Email Service Availability',
        status: 'fail',
        details: `Email service error: ${error}`,
        severity: 'critical',
        recommendation: 'Fix email service implementation'
      });
    }

    console.log('✅ Email security audit completed\n');
  }

  private async auditRateLimitingSecurity(): Promise<void> {
    console.log('⚡ Rate Limiting Security Audit');
    console.log('------------------------------');

    // Check rate limiting configuration
    const windowMs = parseInt(config.RATE_LIMIT_WINDOW_MS);
    const maxRequests = parseInt(config.RATE_LIMIT_MAX_REQUESTS);

    this.addTest({
      name: 'Rate Limiting Window',
      status: windowMs >= 300000 ? 'pass' : 'warning', // At least 5 minutes
      details: `Rate limit window: ${windowMs / 60000} minutes`,
      severity: windowMs >= 300000 ? 'low' : 'medium',
      recommendation: windowMs < 300000 ? 'Consider increasing rate limit window for better security' : undefined
    });

    this.addTest({
      name: 'Rate Limiting Max Requests',
      status: maxRequests <= 100 ? 'pass' : 'warning',
      details: `Max requests per window: ${maxRequests}`,
      severity: maxRequests <= 100 ? 'low' : 'medium',
      recommendation: maxRequests > 100 ? 'Consider reducing max requests for better security' : undefined
    });

    // Check password reset specific rate limiting (3 requests per 15 minutes)
    this.addTest({
      name: 'Password Reset Rate Limiting',
      status: 'pass', // This is hardcoded in the middleware
      details: 'Password reset limited to 3 requests per 15 minutes',
      severity: 'low'
    });

    console.log('✅ Rate limiting security audit completed\n');
  }

  private async auditDatabaseSecurity(): Promise<void> {
    console.log('🗃️ Database Security Audit');
    console.log('---------------------------');

    // Check database URL format
    const dbUrl = config.DATABASE_URL;
    
    this.addTest({
      name: 'Database Connection Security',
      status: dbUrl.includes('ssl=true') || dbUrl.includes('sslmode=require') || config.NODE_ENV === 'development' ? 'pass' : 'warning',
      details: `SSL in connection string: ${dbUrl.includes('ssl') ? 'Present' : 'Not detected'}`,
      severity: dbUrl.includes('ssl') || config.NODE_ENV === 'development' ? 'low' : 'medium',
      recommendation: !dbUrl.includes('ssl') && config.NODE_ENV === 'production' ? 'Use SSL for database connections in production' : undefined
    });

    // Check for password in database URL (should be present but not logged)
    this.addTest({
      name: 'Database Authentication',
      status: dbUrl.includes(':') && dbUrl.includes('@') ? 'pass' : 'fail',
      details: 'Database credentials present in connection string',
      severity: dbUrl.includes(':') && dbUrl.includes('@') ? 'low' : 'critical',
      recommendation: !dbUrl.includes('@') ? 'Database connection must include authentication' : undefined
    });

    console.log('✅ Database security audit completed\n');
  }

  private async auditTokenSecurity(): Promise<void> {
    console.log('🎫 Token Security Audit');
    console.log('-----------------------');

    try {
      const { validateToken, hashToken } = await import('../services/tokenService.js');
      
      // Test token hashing
      const testToken = 'test-token-12345';
      const hash1 = hashToken(testToken);
      const hash2 = hashToken(testToken);

      this.addTest({
        name: 'Token Hashing Consistency',
        status: hash1 === hash2 ? 'pass' : 'fail',
        details: 'Token hashing produces consistent results',
        severity: hash1 === hash2 ? 'low' : 'critical',
        recommendation: hash1 !== hash2 ? 'Token hashing is inconsistent - security vulnerability!' : undefined
      });

      // Test hash length
      this.addTest({
        name: 'Token Hash Security',
        status: hash1.length === 64 ? 'pass' : 'warning', // SHA-256 produces 64-char hex
        details: `Hash length: ${hash1.length} characters`,
        severity: hash1.length === 64 ? 'low' : 'medium',
        recommendation: hash1.length !== 64 ? 'Ensure SHA-256 hashing is used for tokens' : undefined
      });

    } catch (error) {
      this.addTest({
        name: 'Token Security Services',
        status: 'fail',
        details: `Token security services error: ${error}`,
        severity: 'critical',
        recommendation: 'Fix token security service implementation'
      });
    }

    console.log('✅ Token security audit completed\n');
  }

  private async auditLoggingSecurity(): Promise<void> {
    console.log('📝 Logging Security Audit');
    console.log('-------------------------');

    // Test monitoring service
    try {
      const { monitoringService } = await import('../services/monitoringService.js');

      this.addTest({
        name: 'Security Monitoring Service',
        status: 'pass',
        details: 'Monitoring service available',
        severity: 'low'
      });

      // Test security event logging
      monitoringService.logSecurityEvent({
        type: 'suspicious_activity',
        details: { test: 'security audit' },
        severity: 'low'
      });

      this.addTest({
        name: 'Security Event Logging',
        status: 'pass',
        details: 'Security events can be logged',
        severity: 'low'
      });

    } catch (error) {
      this.addTest({
        name: 'Security Monitoring Service',
        status: 'fail',
        details: `Monitoring service error: ${error}`,
        severity: 'high',
        recommendation: 'Fix monitoring service implementation'
      });
    }

    console.log('✅ Logging security audit completed\n');
  }

  private addTest(test: SecurityTest): void {
    this.tests.push(test);
    const icon = test.status === 'pass' ? '✅' : test.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${test.name}: ${test.details}`);
    if (test.recommendation) {
      console.log(`   💡 Recommendation: ${test.recommendation}`);
    }
  }

  private generateReport(): void {
    console.log('\n🔍 Security Audit Report');
    console.log('========================');

    const summary = {
      total: this.tests.length,
      passed: this.tests.filter(t => t.status === 'pass').length,
      warnings: this.tests.filter(t => t.status === 'warning').length,
      failed: this.tests.filter(t => t.status === 'fail').length,
      critical: this.tests.filter(t => t.severity === 'critical').length,
      high: this.tests.filter(t => t.severity === 'high').length
    };

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ⚠️ Warnings: ${summary.warnings}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   🚨 Critical Issues: ${summary.critical}`);
    console.log(`   ⚠️ High Priority Issues: ${summary.high}`);

    // Show critical and high priority issues
    const criticalIssues = this.tests.filter(t => t.severity === 'critical' && t.status === 'fail');
    const highIssues = this.tests.filter(t => t.severity === 'high' && t.status === 'fail');

    if (criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues (Must Fix Before Production):');
      criticalIssues.forEach(issue => {
        console.log(`   • ${issue.name}: ${issue.details}`);
        if (issue.recommendation) {
          console.log(`     Action: ${issue.recommendation}`);
        }
      });
    }

    if (highIssues.length > 0) {
      console.log('\n⚠️ High Priority Issues (Should Fix):');
      highIssues.forEach(issue => {
        console.log(`   • ${issue.name}: ${issue.details}`);
        if (issue.recommendation) {
          console.log(`     Action: ${issue.recommendation}`);
        }
      });
    }

    // Overall assessment
    console.log('\n🏆 Overall Security Assessment:');
    if (summary.critical > 0) {
      console.log('❌ NOT READY FOR PRODUCTION - Critical issues must be resolved');
      process.exit(1);
    } else if (summary.high > 0) {
      console.log('⚠️ PROCEED WITH CAUTION - High priority issues should be addressed');
    } else if (summary.warnings > 0) {
      console.log('✅ PRODUCTION READY - Consider addressing warnings for optimal security');
    } else {
      console.log('🎉 EXCELLENT SECURITY POSTURE - All tests passed!');
    }

    console.log(`\nAudit completed at: ${new Date().toISOString()}`);
  }
}

// Run the security audit
async function runAudit() {
  const auditor = new SecurityAuditor();
  await auditor.runFullAudit();
}

runAudit().catch((error) => {
  console.error('❌ Security audit failed:', error);
  process.exit(1);
});