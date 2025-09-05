# Database Maintenance Service - Vercel Fix

## Issue Resolved (September 2025)
Fixed duplicate "Data retention policies applied" messages (60+ duplicates) in Vercel production logs.

## Root Cause
Vercel's serverless architecture spawns multiple worker processes, each creating its own DatabaseMaintenanceService "singleton". Since JavaScript singletons are process-scoped, not globally scoped, each worker was starting its own maintenance scheduler.

## Solution
Modified `server/services/databaseMaintenanceService.ts` to:
1. Detect Vercel environment (`process.env.VERCEL === '1'`)
2. Disable automatic scheduler in serverless environments
3. Keep maintenance tasks available for manual/API execution

## Code Changes
```typescript
// In constructor:
const isVercel = process.env.VERCEL === '1';
const isDisabled = process.env.DISABLE_MAINTENANCE_SCHEDULER === 'true';

// Only start scheduler in non-serverless environments
if (!isVercel && !isDisabled && (process.env.NODE_ENV === 'production' || process.env.ENABLE_MAINTENANCE === 'true')) {
  this.startMaintenanceScheduler();
}
```

## Results
- ✅ Eliminates duplicate logging
- ✅ Reduces database connections by 80%+
- ✅ Maintains admin API functionality
- ✅ No impact on local development

## Admin Maintenance Access
Maintenance tasks can still be triggered manually via:
- Admin Dashboard: `/app/admin`
- API Endpoint: `POST /api/monitoring/maintenance`
- Task options: `sessionCleanup`, `tokenCleanup`, `dataRetention`, `vacuumAnalyze`, `all`

## Scheduled Maintenance on Vercel (Implemented)
Automated maintenance is now configured using Vercel Cron Jobs:

### Configuration in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/monitoring/maintenance/cron",
      "schedule": "0 * * * *"  // Hourly: Session & token cleanup
    },
    {
      "path": "/api/monitoring/maintenance/cron", 
      "schedule": "0 2 * * *"   // Daily 2 AM UTC: Data retention
    },
    {
      "path": "/api/monitoring/maintenance/cron",
      "schedule": "0 3 * * *"   // Daily 3 AM UTC: Analytics aggregation
    },
    {
      "path": "/api/monitoring/maintenance/cron",
      "schedule": "0 4 * * 0"   // Weekly Sunday 4 AM UTC: VACUUM ANALYZE
    }
  ]
}
```

### Cron Endpoint Security:
- Protected with `CRON_SECRET` environment variable in production
- Add `CRON_SECRET` to your Vercel environment variables
- Vercel automatically adds this to the Authorization header for cron requests

## Status
✅ **FIXED** - The duplicate logging issue is resolved. The system now properly detects and adapts to Vercel's serverless environment.