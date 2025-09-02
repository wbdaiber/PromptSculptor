# Database Maintenance Guide

Production database maintenance, monitoring, and update procedures for PromptSculptor.

**Database Stack**: PostgreSQL via Neon Database (Serverless) + Drizzle ORM + TypeScript

---

## 🔍 Database Monitoring

### Built-in Health Monitoring

The application includes comprehensive monitoring endpoints accessible in production:

```bash
# System health check - database connectivity, services status
curl https://your-domain.com/api/monitoring/health

# Security monitoring - failed logins, suspicious activity
curl https://your-domain.com/api/monitoring/security  

# System metrics - performance stats, resource usage
curl https://your-domain.com/api/monitoring/metrics
```

### Neon Database Console Monitoring

Access your Neon dashboard to monitor:
- **Connection Pools**: Current connections, pool utilization
- **Query Performance**: Slow queries, execution times
- **Resource Usage**: CPU, memory, storage consumption
- **Database Size**: Table sizes, index usage

**Recommended Alerts:**
- Connection pool > 80% utilization
- Query execution time > 5 seconds
- Database storage > 80% of plan limit
- Failed authentication attempts > threshold

---

## 🗄️ Schema Management & Updates

### Migration Commands

```bash
# After making schema changes in shared/schema.ts
npx drizzle-kit generate    # Generate migration files
npx drizzle-kit push        # Apply migrations to database
npx drizzle-kit introspect  # View current database schema
```

### Safe Production Update Process

1. **Pre-Migration Checklist:**
   ```bash
   # Test schema changes locally first
   npm run dev
   npm run check  # TypeScript validation
   
   # Create database backup (via Neon console)
   # Use Neon branch feature for testing
   ```

2. **Production Migration:**
   ```bash
   # Apply during low-traffic periods
   NODE_ENV=production npx drizzle-kit push
   
   # Verify migration success
   curl https://your-domain.com/api/monitoring/health
   ```

3. **Post-Migration Verification:**
   - Check application startup logs
   - Verify all endpoints respond correctly
   - Monitor error rates for 24 hours

---

## 🛠️ Maintenance Tasks

### Automated Maintenance

The application includes several automated maintenance services:

**User Cleanup Service:**
- **Frequency**: Every 24 hours (configurable)
- **Purpose**: Permanently delete soft-deleted users after 30-day retention
- **Configuration**: 
  ```bash
  USER_RETENTION_DAYS=30          # Days to retain soft-deleted users
  CLEANUP_INTERVAL_HOURS=24       # Service frequency
  ```

**Token Cleanup Service:**
- **Frequency**: Every 4 hours (production)
- **Purpose**: Remove expired password reset tokens
- **Automatic**: No manual intervention required

### Manual Maintenance Commands

```bash
# Clean up expired password reset tokens manually
npx tsx server/scripts/cleanupTokens.ts

# Run comprehensive security audit (20 tests)
npx tsx server/scripts/securityAudit.ts

# Test email service functionality
npx tsx server/testEmailService.ts

# Test welcome email delivery
npx tsx server/testWelcomeEmail.ts user@example.com
```

### Database Optimization

**Query Performance:**
```bash
# Monitor slow queries via Neon console
# Review and optimize indexes if needed
# Consider connection pooling adjustments
```

**Storage Management:**
```bash
# Monitor table sizes via Neon dashboard
# Archive old data if needed
# Consider data retention policies
```

---

## 🌐 Production Environment

### Required Environment Variables

```bash
# Core Database
DATABASE_URL="postgresql://username:password@host:5432/database"

# Maintenance Configuration
USER_RETENTION_DAYS=30              # Soft delete retention period
CLEANUP_INTERVAL_HOURS=24           # Cleanup service frequency
MONITORING_ENABLED=true             # Enable metrics reporting

# Email Service (for notifications)
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@your-domain.com"

# Security
SESSION_SECRET="your-session-secret"
BCRYPT_ROUNDS=12
```

### Scaling Considerations

**Neon Database Auto-Scaling:**
- Connection pooling scales automatically
- Compute scales based on demand
- Storage auto-expands as needed

**Performance Monitoring:**
- Monitor database plan limits
- Track connection pool utilization
- Consider upgrading plan for high traffic
- Implement read replicas if needed

---

## 🚨 Emergency Procedures

### Database Connection Issues

```bash
# Check database connectivity
curl https://your-domain.com/api/monitoring/health

# Restart application if needed
npm run start

# Check Neon console for service status
# Review connection pool settings
```

### Data Recovery

**Soft Delete Recovery:**
```sql
-- Restore soft-deleted user within 30-day window
UPDATE users 
SET is_deleted = false, deleted_at = NULL 
WHERE email = 'user@example.com' AND is_deleted = true;
```

**Database Backup Restoration:**
- Use Neon's point-in-time recovery feature
- Restore from automated daily backups
- Create database branch for testing recovery

### Performance Issues

1. **Monitor query performance** via Neon dashboard
2. **Check connection pools** - upgrade plan if limit reached
3. **Review slow query log** - optimize problematic queries
4. **Scale compute resources** - upgrade Neon plan if needed

---

## 📊 Monitoring Dashboard Setup

### Key Metrics to Track

- **Database Performance**: Query response times, connection count
- **Application Health**: API response times, error rates
- **Security Events**: Failed logins, suspicious activity
- **Resource Usage**: CPU, memory, storage consumption

### Alerting Recommendations

```bash
# Set up alerts for:
# - Database connection failures
# - High query execution times (>5s)
# - Storage usage >80%
# - Security events (multiple failed logins)
# - Service downtime
```

---

## 📝 Maintenance Schedule

### Daily
- ✅ **Automated**: User cleanup service runs
- ✅ **Automated**: Token cleanup service runs
- 🔍 **Manual**: Review monitoring dashboard

### Weekly
- 📊 Review query performance metrics
- 🔍 Check database storage usage
- 📈 Review user activity patterns
- 🛡️ Security audit review

### Monthly
- 🔄 Update dependencies (`npm audit`)
- 📦 Review database plan usage
- 🧹 Archive old data if needed
- 📋 Update documentation

### Quarterly
- 🔒 Security assessment
- 📈 Performance optimization review
- 🔄 Disaster recovery testing
- 📊 Capacity planning review

---

## 📞 Support & Resources

**Neon Database:**
- [Neon Console](https://console.neon.tech/)
- [Neon Documentation](https://neon.tech/docs)
- [Support Portal](https://console.neon.tech/support)

**Drizzle ORM:**
- [Drizzle Documentation](https://orm.drizzle.team/)
- [Migration Guide](https://orm.drizzle.team/kit-docs/overview)

**Application Monitoring:**
- Built-in endpoints: `/api/monitoring/*`
- Log files: Check application logs for errors
- Email service: Test with provided scripts

---

*Last Updated: August 31, 2025*
*For technical support or emergency database issues, refer to your hosting provider's support documentation.*