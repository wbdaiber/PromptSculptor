# Migration Rollback Scripts

This directory contains rollback scripts for all database migrations in PromptSculptor. Each rollback script corresponds to a specific migration and provides the ability to revert changes if needed.

## ⚠️ IMPORTANT WARNINGS

- **ALWAYS backup your database before running any rollback script**
- **Rollback scripts may cause permanent data loss**
- **Test rollback scripts on development/staging environments first**
- **Some rollbacks may require application code changes**
- **Read the complete rollback script comments before executing**

## Available Rollback Scripts

### Database Migration Rollbacks

| Migration | Rollback Script | Risk Level | Data Loss |
|-----------|----------------|------------|-----------|
| `2025-08-30_initial_schema.sql` | `2025-08-30_rollback_initial_schema.sql` | 🚨 **CRITICAL** | **ALL DATA** |
| `2025-08-30_add_username_field.sql` | `2025-08-30_rollback_username_field.sql` | 🚨 **HIGH** | **Soft-deleted users** |
| `2025-08-30_add_favorites_system.sql` | `2025-08-30_rollback_favorites_system.sql` | ⚠️ **MEDIUM** | **None** (may fail) |
| `2025-08-31_add_session_storage_indexes.sql` | `2025-08-31_rollback_session_storage_indexes.sql` | ⚠️ **LOW** | **Sessions only** |

### Configuration Rollbacks

| System | Rollback Procedure | Risk Level | Impact |
|--------|-------------------|------------|---------|
| OAuth Authentication | `OAUTH_ROLLBACK_PROCEDURES.sql` | ⚠️ **LOW** | **Config only** |

## Risk Level Definitions

### 🚨 **CRITICAL RISK**
- **Complete data destruction**
- **Application will not function after rollback**  
- **Requires full re-migration to restore functionality**
- **Only use in complete system failure scenarios**

### 🚨 **HIGH RISK**  
- **Permanent data loss of specific features**
- **May break application functionality**
- **Requires application code changes**
- **Thorough testing required after rollback**

### ⚠️ **MEDIUM RISK**
- **May fail due to data constraints**
- **Requires manual intervention if failed**
- **Application functionality may be affected**
- **Performance implications possible**

### ⚠️ **LOW RISK**
- **Minimal data loss (sessions, cache, etc.)**
- **Primary functionality preserved**  
- **Performance degradation expected**
- **Safe to execute with proper planning**

## Pre-Rollback Checklist

Before executing ANY rollback script:

- [ ] **Create complete database backup**
  ```bash
  pg_dump -h localhost -U username database_name > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Stop the application server**
  ```bash
  # Stop all application processes
  pkill -f "npm run dev"
  pkill -f "npm start"
  ```

- [ ] **Document the rollback reason**
- [ ] **Test rollback on development environment first**
- [ ] **Review rollback script comments completely**
- [ ] **Notify stakeholders of maintenance window**
- [ ] **Prepare application code changes if needed**

## Rollback Execution Process

1. **Preparation**
   ```bash
   cd /path/to/PromptSculptor
   ```

2. **Create Backup**
   ```bash
   pg_dump -h localhost -U your_username your_database_name > pre_rollback_backup.sql
   ```

3. **Execute Rollback Script**
   ```bash
   psql -h localhost -U your_username -d your_database_name -f migrations/rollbacks/ROLLBACK_SCRIPT.sql
   ```

4. **Verify Rollback Success**
   - Run verification queries from rollback script comments
   - Check application logs for errors
   - Test core functionality

5. **Restart Application**
   ```bash
   npm run dev  # development
   npm start    # production
   ```

## Post-Rollback Recovery

If a rollback fails or causes issues:

1. **Restore from backup**
   ```bash
   psql -h localhost -U your_username -d your_database_name < pre_rollback_backup.sql
   ```

2. **Review rollback failure logs**
3. **Fix underlying issues**
4. **Contact support if needed**

## Specific Rollback Guidance

### Initial Schema Rollback
- **Use Only**: Complete system reset scenarios
- **Result**: Empty database, no application functionality
- **Recovery**: Re-run all migrations from scratch

### Soft Delete System Rollback  
- **Impact**: Removes user account recovery capability
- **Data Loss**: All soft-deleted user accounts permanently destroyed
- **Code Changes**: Remove soft delete logic from application

### Favorites System Rollback
- **May Fail**: If duplicate emails exist in soft-deleted users
- **Fix**: Clean up duplicates before rollback
- **Impact**: Prevents re-registration with same email after deletion

### Session Storage Rollback
- **Impact**: Admin dashboard performance significantly degraded
- **Sessions**: All user sessions invalidated
- **Safe**: No permanent data loss, only performance impact

### OAuth System Rollback
- **Type**: Configuration rollback, not database rollback
- **Process**: Environment variables and code changes required
- **Impact**: Changes admin authentication method only

## Emergency Contacts

For critical rollback failures:
1. Create detailed issue report with:
   - Rollback script that failed
   - Complete error messages
   - Database state before rollback
   - Steps taken and results

2. Include database logs and application error logs

3. Specify urgency level and business impact

## Testing Rollback Scripts

Always test rollback scripts on non-production environments:

1. **Create development database copy**
   ```bash
   pg_dump production_db | psql development_db
   ```

2. **Test rollback script**
   ```bash
   psql development_db -f rollback_script.sql
   ```

3. **Verify expected results**
4. **Test application functionality**
5. **Document any issues or requirements**

## Rollback Script Maintenance

Rollback scripts should be:
- **Tested** on each major application update
- **Updated** when migrations change
- **Documented** with any new requirements
- **Reviewed** quarterly for accuracy

## Version History

- **v1.0** (September 1, 2025): Initial rollback script collection
- Complete rollback coverage for all migrations
- Comprehensive risk assessment and procedures
- Standardized rollback script format and documentation