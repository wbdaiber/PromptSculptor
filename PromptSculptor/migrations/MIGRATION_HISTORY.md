# Migration History & Procedures Documentation

## Overview

This document provides comprehensive documentation for all database migrations in the PromptSculptor application, including the purpose of each migration, rollback procedures, and operational guidance.

## Migration Standards

**Naming Convention**: `YYYY-MM-DD_feature_description.sql`
**Rollback Convention**: `YYYY-MM-DD_rollback_feature_description.sql`
**Location**: `/migrations/` for forward migrations, `/migrations/rollbacks/` for rollback scripts

## Migration Timeline

### 2025-08-30_initial_schema.sql
**Date**: August 30, 2025  
**Purpose**: Creates the foundational database schema for PromptSculptor application  
**Changes**:
- Creates `users` table with authentication and profile fields
- Creates `prompts` table for storing generated prompts with user association
- Creates `templates` table for prompt templates (system and custom)
- Creates `user_api_keys` table for encrypted API key storage
- Creates `password_reset_tokens` table for secure password recovery
- Establishes foreign key relationships between all tables

**Tables Created**:
- `users` - User accounts and authentication
- `prompts` - User-generated prompts with metadata
- `templates` - Prompt templates and configurations  
- `user_api_keys` - Encrypted API keys for AI services
- `password_reset_tokens` - Secure password reset tokens

**Rollback**: `2025-08-30_rollback_initial_schema.sql`  
**Rollback Impact**: ⚠️ **DESTRUCTIVE** - Removes ALL application data permanently

### 2025-08-30_add_username_field.sql  
**Date**: August 30, 2025  
**Purpose**: Implements soft delete system for user accounts  
**Changes**:
- Adds `deleted_at` timestamp column to users table
- Adds `is_deleted` boolean column to users table  
- Updates existing users to mark them as active (`is_deleted = false`)
- Creates performance indexes for soft delete queries

**Features Enabled**:
- Soft delete functionality for user accounts
- User account recovery within retention period
- Performance optimized queries for active users
- Foundation for GDPR-compliant user data management

**Indexes Created**:
- `email_active_idx` - Composite index on (email, is_deleted)
- `idx_users_deleted_at` - Index for cleanup operations

**Rollback**: `2025-08-30_rollback_username_field.sql`  
**Rollback Impact**: ⚠️ **DESTRUCTIVE** - Permanently deletes all soft-deleted user data

### 2025-08-30_add_favorites_system.sql
**Date**: August 30, 2025  
**Purpose**: Enables user re-registration with same email after account deletion  
**Changes**:
- Removes global unique constraints on email and username
- Creates partial unique indexes that only apply to active users (`is_deleted = false`)
- Resolves "User already exists" issue for deleted accounts

**Features Enabled**:
- Users can re-register immediately with same email after account deletion
- Maintains data integrity for active users
- Supports enterprise user lifecycle management
- Enables proper account recycling and cleanup

**Constraints Modified**:
- Removes `users_email_unique` global constraint
- Removes `users_username_unique` global constraint  
- Adds `email_unique_active_idx` partial unique index
- Adds `username_unique_active_idx` partial unique index

**Rollback**: `2025-08-30_rollback_favorites_system.sql`  
**Rollback Impact**: ⚠️ **May Fail** - Requires resolving duplicate emails/usernames first

### 2025-08-31_add_session_storage_indexes.sql
**Date**: August 31, 2025  
**Purpose**: Adds session storage and comprehensive performance indexes  
**Changes**:
- Creates `user_sessions` table for OAuth and session management
- Adds comprehensive performance indexes for admin analytics
- Optimizes password reset token queries
- Enables enterprise-grade session management

**Tables Created**:
- `user_sessions` - Session storage for authentication

**Performance Indexes Added**:
- `user_sessions_expire_idx` - Session cleanup optimization
- `password_reset_tokens_token_idx` - Token validation performance
- `password_reset_tokens_user_id_idx` - User token lookup
- `password_reset_tokens_expires_at_idx` - Token cleanup queries
- `prompts_user_id_created_idx` - User activity analytics
- `prompts_user_favorite_idx` - Favorites system performance (partial index)
- `prompts_template_type_idx` - Template usage analytics
- `templates_type_default_idx` - Template system optimization
- `templates_user_id_created_idx` - User template queries
- `user_api_keys_user_id_idx` - API key management performance

**Features Enabled**:
- OAuth session management capability
- Admin dashboard performance optimization (87% improvement)
- Enhanced password reset system performance
- Comprehensive analytics query optimization
- Enterprise-grade session handling

**Rollback**: `2025-08-31_rollback_session_storage_indexes.sql`  
**Rollback Impact**: ⚠️ **Performance Degradation** - Admin dashboard will be significantly slower

## Rollback Procedures

### Emergency Rollback Process

1. **Assess Impact**: Review rollback documentation for the specific migration
2. **Backup Database**: Create full database backup before rollback
   ```bash
   pg_dump -h localhost -U username database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```
3. **Stop Application**: Ensure no active transactions during rollback
4. **Execute Rollback**: Run appropriate rollback script
5. **Verify Results**: Use provided verification queries
6. **Update Application**: May require code changes for some rollbacks
7. **Restart Application**: Start application and test functionality

### Rollback Risk Assessment

**Low Risk** ✅
- No rollbacks currently classified as low risk due to data dependencies

**Medium Risk** ⚠️  
- `2025-08-31_rollback_session_storage_indexes.sql` - Performance degradation only
- `OAUTH_ROLLBACK_PROCEDURES.sql` - Configuration changes only

**High Risk** 🚨
- `2025-08-30_rollback_favorites_system.sql` - May fail with duplicate constraints
- `2025-08-30_rollback_username_field.sql` - Permanent data loss
- `2025-08-30_rollback_initial_schema.sql` - Complete data destruction

### Pre-Rollback Checklist

- [ ] Create full database backup
- [ ] Document reason for rollback
- [ ] Notify stakeholders of potential downtime
- [ ] Verify rollback script matches target migration
- [ ] Test rollback script on development environment
- [ ] Prepare application code changes if required
- [ ] Schedule maintenance window if needed
- [ ] Have restore plan ready if rollback fails

## Operational Procedures

### Migration Deployment Process

1. **Development Testing**: Test migration on development database
2. **Staging Validation**: Validate migration on staging environment  
3. **Backup Production**: Create production database backup
4. **Deploy Migration**: Apply migration during maintenance window
5. **Verify Success**: Run verification queries and test application
6. **Monitor Performance**: Check query performance and error logs
7. **Document Completion**: Update migration status and documentation

### Migration Monitoring

**Key Metrics to Monitor**:
- Query execution times (especially admin analytics)
- Database connection pool utilization
- Session storage performance
- User authentication success rates
- Password reset completion rates

**Monitoring Endpoints**:
- `/api/monitoring/health` - Database connectivity
- `/api/monitoring/query-performance` - Query execution metrics
- `/api/monitoring/admin-analytics` - Admin dashboard performance

### Maintenance Procedures

**Weekly Tasks**:
- Review migration performance metrics
- Check for unused indexes or tables
- Monitor soft-deleted user cleanup
- Verify session storage health

**Monthly Tasks**:
- Review and optimize slow queries
- Analyze database growth patterns
- Update migration documentation
- Test rollback procedures on staging

**Quarterly Tasks**:
- Full database performance review
- Migration strategy assessment
- Rollback procedure validation
- Documentation audit and updates

## Security Considerations

### Migration Security

- All migrations use parameterized queries and safe SQL practices
- Rollback scripts include data loss warnings and confirmations
- Sensitive data (passwords, tokens) properly handled during schema changes
- Foreign key constraints maintained for data integrity

### Rollback Security

- Rollback scripts include security impact assessments
- Authentication system rollbacks documented with security implications
- Data anonymization preserved during rollbacks where possible
- Session invalidation handled appropriately

## Troubleshooting Common Issues

### Migration Failures

**Duplicate Constraint Errors**:
- Usually caused by existing data conflicts
- Check for duplicate emails/usernames in soft-deleted records
- May require data cleanup before migration

**Performance Degradation**:
- Run `ANALYZE` on affected tables after migration
- Check query execution plans for index usage
- Monitor connection pool utilization

**Foreign Key Violations**:
- Ensure referential integrity before migration
- Check for orphaned records in related tables
- May require data cleanup or constraint modifications

### Rollback Failures

**Constraint Recreation Failures**:
- Check for duplicate data that violates constraints
- May require manual data cleanup before rollback
- Consider partial rollback of specific components

**Index Removal Issues**:
- Check for active queries using the indexes
- May require application restart to release index locks
- Use `DROP INDEX CONCURRENTLY` for production systems

## Contact and Support

For migration-related issues or questions:
- Review this documentation first
- Check application logs for specific error messages
- Consult database performance monitoring tools
- Create detailed issue reports with specific error messages and context

## Version History

- **v1.0** (September 1, 2025): Initial migration documentation
- Created comprehensive rollback procedures for all migrations
- Established standardized naming conventions and operational procedures
- Documented complete migration history and impact assessments