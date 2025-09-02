# Production Deployment Guide - Email System

## Overview

This guide covers the complete deployment process for the PromptSculptor email system (password recovery and welcome emails) in production environments. The system is now fully functional and ready for production deployment with comprehensive email capabilities.

## Prerequisites

### System Requirements
- Node.js 18+ (LTS recommended)
- PostgreSQL 13+ database
- SSL certificate for HTTPS
- Domain with DNS control
- SMTP service (Resend account recommended)

### Service Accounts Required
- **Resend Account**: For email delivery
- **Database Service**: PostgreSQL hosting (AWS RDS, DigitalOcean, etc.)
- **Monitoring Service**: Optional (DataDog, New Relic, etc.)

## Environment Configuration

### 1. Database Setup

```bash
# Create production database
createdb promptsculptor_production

# Run migrations
NODE_ENV=production npm run db:push
```

### 2. Domain and Email Configuration

#### Resend Setup
1. Create account at https://resend.com
2. **Verify your domain in the Resend dashboard** (Required for production)
3. Obtain API key from dashboard
4. Configure SPF/DKIM records for email deliverability

> **IMPORTANT**: Domain verification is required to send emails to any recipient. Without domain verification, emails will only be sent to the Resend account owner's email address.

#### DNS Configuration
```dns
; SPF Record
promptsculptor.com. TXT "v=spf1 include:_spf.resend.com ~all"

; DKIM Record (provided by Resend)
resend._domainkey.promptsculptor.com. CNAME resend.d.resend.com
```

### 3. Environment Variables

Create production `.env` file:

```env
# Server Configuration
NODE_ENV=production
PORT=5001

# Database
DATABASE_URL=postgresql://username:password@host:5432/promptsculptor_production

# Security Keys - GENERATE NEW VALUES FOR PRODUCTION
ADMIN_API_KEY=your-secure-admin-api-key-here
SESSION_SECRET=your-64-character-session-secret-here
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here

# API Keys
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Email Configuration (Production)
RESEND_API_KEY=your-production-resend-api-key
EMAIL_FROM=noreply@promptsculptor.com
APP_URL=https://promptsculptor.com

# Security Configuration
CORS_ORIGINS=https://promptsculptor.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_PER_MINUTE=10
```

### 4. Generate Secure Keys

```bash
# Generate session secret (64 characters)
openssl rand -hex 32

# Generate encryption key (64 hex characters = 32 bytes)
openssl rand -hex 32

# Generate admin API key
openssl rand -hex 32
```

## Deployment Process

### 1. Build Application

```bash
# Install dependencies
npm ci --production

# Build the application
npm run build

# Verify build
npm run check
```

### 2. Database Migration

```bash
# Apply database migrations
NODE_ENV=production npm run db:push

# Verify database schema
psql $DATABASE_URL -c "\\dt"
```

### 3. Test Email Configuration

```bash
# Test password reset email service
npx tsx server/testEmailService.ts admin@promptsculptor.com

# Test welcome email functionality
npx tsx server/testWelcomeEmail.ts admin@promptsculptor.com

# Test token cleanup
npx tsx server/scripts/cleanupTokens.ts
```

### 4. Server Deployment

#### Option 1: PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option 2: Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 5001
CMD ["npm", "start"]
```

```bash
# Build and run Docker container
docker build -t promptsculptor .
docker run -d --env-file .env -p 5001:5001 promptsculptor
```

#### Option 3: Systemd Service

```ini
# /etc/systemd/system/promptsculptor.service
[Unit]
Description=PromptSculptor Password Recovery System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/promptsculptor
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
EnvironmentFile=/var/www/promptsculptor/.env

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
systemctl enable promptsculptor
systemctl start promptsculptor
systemctl status promptsculptor
```

## Reverse Proxy Configuration

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name promptsculptor.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    location /api/auth/forgot-password {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name promptsculptor.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring and Maintenance

### 1. Health Monitoring

```bash
# Health check endpoint
curl https://promptsculptor.com/api/monitoring/health

# Security monitoring (requires admin key)
curl -H "x-admin-api-key: YOUR_ADMIN_KEY" \
     https://promptsculptor.com/api/monitoring/security
```

### 2. Automated Token Cleanup

#### Cron Job Setup

```bash
# Edit crontab
crontab -e

# Add cleanup job (runs every 4 hours)
0 */4 * * * cd /var/www/promptsculptor && npx tsx server/scripts/cleanupTokens.ts >> /var/log/token-cleanup.log 2>&1
```

#### Manual Cleanup

```bash
# Manual token cleanup via API
curl -X POST -H "x-admin-api-key: YOUR_ADMIN_KEY" \
     https://promptsculptor.com/api/monitoring/cleanup-tokens
```

### 3. Log Management

```bash
# Application logs location
tail -f /var/log/promptsculptor/app.log

# Token cleanup logs
tail -f /var/log/token-cleanup.log

# Nginx access logs
tail -f /var/log/nginx/promptsculptor.access.log
```

### 4. Database Maintenance

```sql
-- Monitor password reset token usage
SELECT 
    COUNT(*) as total_tokens,
    COUNT(*) FILTER (WHERE used = true) as used_tokens,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens
FROM password_reset_tokens;

-- Clean up old unused tokens (older than 7 days)
DELETE FROM password_reset_tokens 
WHERE expires_at < NOW() - INTERVAL '7 days';
```

## Security Checklist

### Pre-Deployment Security Audit

- [ ] All environment variables use production values
- [ ] SSL certificate is valid and properly configured
- [ ] Database credentials are unique and secure
- [ ] API keys are properly secured and restricted
- [ ] Rate limiting is configured at both application and reverse proxy level
- [ ] Security headers are properly set
- [ ] Email domain is verified and SPF/DKIM are configured
- [ ] Monitoring and alerting are set up
- [ ] Backup strategy is implemented
- [ ] Log rotation is configured

### Email System Security

**Password Recovery Security:**
- [ ] Tokens are cryptographically secure (32 bytes)
- [ ] Tokens expire in 30 minutes
- [ ] Single-use enforcement is working
- [ ] Rate limiting prevents brute force (3 requests per 15 minutes)
- [ ] No user enumeration in responses
- [ ] Security events are properly logged
- [ ] Email templates don't expose sensitive information
- [ ] Token cleanup is automated

**Welcome Email Security:**
- [ ] Welcome emails are non-blocking (registration succeeds if email fails)
- [ ] No sensitive information exposed in welcome email templates
- [ ] Email delivery failures are properly logged
- [ ] Domain verification is configured for production sending

## Performance Optimization

### Database Optimization

```sql
-- Create indexes for password reset tokens
CREATE INDEX CONCURRENTLY idx_password_reset_tokens_user_id 
ON password_reset_tokens(user_id);

CREATE INDEX CONCURRENTLY idx_password_reset_tokens_expires_at 
ON password_reset_tokens(expires_at);

CREATE INDEX CONCURRENTLY idx_password_reset_tokens_token 
ON password_reset_tokens(token);
```

### Monitoring Metrics

Key metrics to monitor:
- Password reset request rate
- Welcome email delivery success rate
- Password reset email delivery success rate
- Token usage rate (successful resets vs requests)
- Rate limiting violations
- Response times for auth endpoints
- User registration completion rate
- Database query performance

## Troubleshooting

### Common Issues

#### Email Not Delivering

**For Password Reset Emails:**
1. Check Resend API key and domain verification
2. Verify SPF/DKIM DNS records
3. Check email service logs
4. Test with `npx tsx server/testEmailService.ts`

**For Welcome Emails:**
1. Ensure domain is verified in Resend dashboard
2. Check that `EMAIL_FROM` uses verified domain
3. Test with `npx tsx server/testWelcomeEmail.ts`
4. Review server logs for welcome email errors

> **Common Issue**: If you see "You can only send testing emails to your own email address" error, it means your domain is not verified in Resend. This is required for production email sending.

#### Rate Limiting Too Aggressive
1. Adjust `RATE_LIMIT_MAX_REQUESTS` in environment
2. Configure nginx rate limiting
3. Monitor rate limiting logs

#### Database Connection Issues
1. Verify DATABASE_URL format
2. Check database server connectivity
3. Ensure SSL is properly configured
4. Monitor connection pool metrics

### Emergency Procedures

#### Disable Password Reset (Emergency)
```bash
# Temporarily disable password reset endpoint
# Add to nginx configuration:
location /api/auth/forgot-password {
    return 503 "Password reset temporarily unavailable";
}

# Reload nginx
nginx -s reload
```

#### Reset Rate Limiting
```bash
# If using Redis for rate limiting
redis-cli FLUSHDB

# If using memory-based limiting, restart application
systemctl restart promptsculptor
```

## Rollback Plan

### Rollback Procedure
1. Keep previous version deployed in separate directory
2. Use blue-green deployment or feature flags
3. Database migrations should be backward compatible
4. Monitor error rates after deployment

```bash
# Example rollback
systemctl stop promptsculptor
cd /var/www/promptsculptor-previous
systemctl start promptsculptor
```

## Support and Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor health check endpoints
- Review security event logs
- Check email delivery metrics

#### Weekly
- Review database performance
- Analyze password reset success rates
- Clean up expired tokens manually if needed

#### Monthly
- Rotate API keys and secrets
- Review and update dependencies
- Backup database and configuration
- Security audit of logs and metrics

### Contact Information

For production issues:
- Technical Support: tech-support@promptsculptor.com  
- Security Issues: security@promptsculptor.com
- Emergency: [Emergency contact information]

---

## Appendix

### Password Recovery System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Browser  │    │  Load Balancer  │    │   Application   │
│                 │───▶│     (nginx)     │───▶│    Server       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │   Email Service │◀────────────┤
                       │   (Resend)      │             │
                       └─────────────────┘             │
                                                        │
                       ┌─────────────────┐             │
                       │   PostgreSQL    │◀────────────┘
                       │   Database      │
                       └─────────────────┘
```

### Recovery Flow Diagram

```
User Request → Rate Limiting → User Lookup → Token Generation → 
Email Sending → User Clicks Link → Token Validation → 
Password Update → Session Cleanup → Success Response
```

This completes the production deployment guide for the PromptSculptor password recovery system.