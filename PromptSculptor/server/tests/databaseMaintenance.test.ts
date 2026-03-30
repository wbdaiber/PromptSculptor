import { test, describe } from 'node:test';
import assert from 'node:assert';
import { databaseMaintenanceService } from '../services/databaseMaintenanceService.js';

describe('DatabaseMaintenanceService Security', () => {
  test('vacuumAnalyze should accept valid table names from the whitelist', async () => {
    // We don't want to actually run the VACUUM in tests if possible,
    // but we can check if it passes the validation step.
    // Since the actual execution will fail if there's no DB connection,
    // we're looking for the validation logic.

    const validTables = ['users', 'prompts', 'templates', 'user_api_keys', 'user_sessions', 'password_reset_tokens', 'analytics_daily_summary'];

    for (const table of validTables) {
      try {
        await databaseMaintenanceService.vacuumAnalyze(table);
      } catch (error: any) {
        // We expect it NOT to throw "Invalid table name"
        assert.ok(!error.message.includes('Invalid table name'), `Should accept valid table: ${table}`);
      }
    }
  });

  test('vacuumAnalyze should reject invalid table names and prevent SQL injection', async () => {
    const invalidInputs = [
      'users; DROP TABLE users',
      'invalid_table',
      'users--',
      ' ',
      '1;1',
      '"users"'
    ];

    for (const input of invalidInputs) {
      try {
        await databaseMaintenanceService.vacuumAnalyze(input);
        assert.fail(`Should have rejected invalid input: ${input}`);
      } catch (error: any) {
        assert.ok(error.message.includes('Invalid table name'), `Error message should indicate invalid table name for input: ${input}. Got: ${error.message}`);
      }
    }
  });
});
