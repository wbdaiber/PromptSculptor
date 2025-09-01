# Production User Monitoring Guide

This guide explains how to monitor user signups, usage, and system performance in production.

## Admin API Setup

### 1. Generate Admin API Key

Create a secure random key for admin access:

```bash
# Generate a 64-character hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Alternative: OpenSSL
openssl rand -hex 32
```

### 2. Configure Environment Variable

Add to your production `.env` file:

```bash
ADMIN_API_KEY=your-generated-key-here
```

**⚠️ Security**: Keep this key secure and rotate it regularly. Never commit it to version control.

## Monitoring Endpoints

### Health Check
Monitor system status and component health:

```bash
curl -H "x-admin-api-key: YOUR_KEY" https://your-domain.com/api/monitoring/health
```

**Response includes:**
- Database connectivity status
- Email service availability  
- Security event summary
- Overall system health (healthy/degraded/unhealthy)

### User & Usage Metrics
Get comprehensive usage statistics:

```bash
curl -H "x-admin-api-key: YOUR_KEY" https://your-domain.com/api/monitoring/metrics
```

**Response includes:**
- Password reset metrics and success rates
- Token usage statistics
- System performance indicators
- Database connection health

### Security Reports
Monitor security events and threats:

```bash
curl -H "x-admin-api-key: YOUR_KEY" https://your-domain.com/api/monitoring/security?hours=24
```

**Response includes:**
- Recent security events (last 24 hours by default)
- Rate limiting violations
- Suspicious activity detection
- Failed authentication attempts
- Security recommendations

## Database Analytics Queries

### User Signup Tracking

```sql
-- Total active users
SELECT COUNT(*) as total_users 
FROM users 
WHERE is_deleted = false;

-- Daily signups (last 30 days)
SELECT 
  DATE(created_at) as signup_date,
  COUNT(*) as signups 
FROM users 
WHERE is_deleted = false 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;

-- Weekly signup trends
SELECT 
  DATE_TRUNC('week', created_at) as week_start,
  COUNT(*) as signups
FROM users 
WHERE is_deleted = false
GROUP BY week_start
ORDER BY week_start DESC
LIMIT 12;
```

### User Engagement Analytics

```sql
-- Active users (generated prompts in last 30 days)
SELECT COUNT(DISTINCT user_id) as active_users
FROM prompts 
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND user_id IS NOT NULL;

-- User retention metrics
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_signups,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_signups,
  COUNT(CASE WHEN created_at < NOW() - INTERVAL '30 days' THEN 1 END) as retained_users
FROM users 
WHERE is_deleted = false;

-- User activity levels
SELECT 
  user_id,
  COUNT(*) as total_prompts,
  COUNT(CASE WHEN is_favorite = true THEN 1 END) as favorite_prompts,
  MAX(created_at) as last_activity
FROM prompts 
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_prompts DESC;
```

### Usage Pattern Analysis

```sql
-- Most popular prompt types
SELECT 
  template_type,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users
FROM prompts 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY template_type
ORDER BY usage_count DESC;

-- API key adoption rates
SELECT 
  service,
  COUNT(*) as keys_configured,
  COUNT(DISTINCT user_id) as unique_users
FROM user_api_keys
GROUP BY service;

-- User engagement by model preference
SELECT 
  target_model,
  COUNT(*) as usage_count,
  AVG(word_count) as avg_prompt_length
FROM prompts 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY target_model;
```

## Automated Monitoring Scripts

### Daily Metrics Collection Script

Create `scripts/daily_metrics.sh`:

```bash
#!/bin/bash

# Set your domain and admin key
DOMAIN="https://your-domain.com"
ADMIN_KEY="your-admin-key"

# Create daily report
DATE=$(date +%Y-%m-%d)
REPORT_FILE="reports/daily_report_$DATE.json"

echo "Collecting daily metrics for $DATE..."

# Health check
curl -s -H "x-admin-api-key: $ADMIN_KEY" "$DOMAIN/api/monitoring/health" > "reports/health_$DATE.json"

# Usage metrics  
curl -s -H "x-admin-api-key: $ADMIN_KEY" "$DOMAIN/api/monitoring/metrics" > "reports/metrics_$DATE.json"

# Security report
curl -s -H "x-admin-api-key: $ADMIN_KEY" "$DOMAIN/api/monitoring/security?hours=24" > "reports/security_$DATE.json"

echo "Reports saved to reports/ directory"
```

### Weekly Summary Script

Create `scripts/weekly_summary.sql`:

```sql
-- Weekly summary query
SELECT 
  'User Growth' as metric,
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' THEN 1 END) as new_last_week
FROM users WHERE is_deleted = false

UNION ALL

SELECT 
  'Prompt Activity' as metric,
  COUNT(*) as total_prompts,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as this_week,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' THEN 1 END) as last_week
FROM prompts

UNION ALL

SELECT 
  'Active Users' as metric,
  COUNT(DISTINCT user_id) as total_active,
  COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN user_id END) as active_this_week,
  COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' THEN user_id END) as active_last_week
FROM prompts WHERE user_id IS NOT NULL;
```

## External Analytics Integration

### Google Analytics 4 Setup

Add to your static landing page (`client/public/index.html`):

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### PostHog Integration

Add to your React app (`client/src/main.tsx`):

```typescript
import posthog from 'posthog-js'

if (import.meta.env.PROD) {
  posthog.init('your-posthog-key', {
    api_host: 'https://app.posthog.com'
  })
}
```

## Alerting & Notifications

### Critical Alerts

Set up alerts for:
- System health failures (database/email service down)
- High rate limiting violations (potential attack)
- Suspicious security events
- User signup spikes or drops

### Recommended Thresholds

```bash
# Health check failures
if health_status != "healthy" -> alert immediately

# Security events  
if critical_events > 0 -> alert immediately
if rate_limit_violations > 10/hour -> alert
if invalid_token_attempts > 5/hour -> investigate

# Performance
if response_time > 2000ms -> monitor
if error_rate > 5% -> alert
```

## Production Monitoring Checklist

### Daily Tasks
- [ ] Check system health status
- [ ] Review security reports
- [ ] Monitor user signup trends
- [ ] Verify email delivery rates

### Weekly Tasks  
- [ ] Analyze user engagement metrics
- [ ] Review retention statistics
- [ ] Check API key adoption rates
- [ ] Generate usage pattern reports

### Monthly Tasks
- [ ] Comprehensive security audit
- [ ] User growth analysis
- [ ] Performance optimization review
- [ ] Database maintenance and cleanup

## Emergency Response

### System Downtime
1. Check health endpoint for component status
2. Review server logs for error patterns
3. Verify database connectivity
4. Check email service status
5. Monitor security events for attacks

### Security Incidents
1. Review security reports immediately
2. Check for pattern in failed attempts
3. Consider temporary rate limit adjustments
4. Monitor user account creation anomalies
5. Document incident for future prevention

## Data Retention & Privacy

### Log Retention
- Security events: 90 days
- Performance metrics: 1 year  
- User analytics: Indefinite (anonymized after account deletion)

### GDPR Compliance
- User data automatically soft-deleted with 30-day retention
- Personal data anonymized in logs after account deletion
- Admin access logs maintained for audit compliance

---

**⚠️ Important**: Replace placeholder values (YOUR_KEY, your-domain.com, GA_MEASUREMENT_ID) with your actual production values before deployment.