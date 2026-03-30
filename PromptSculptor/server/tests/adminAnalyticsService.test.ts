
import { describe, it, expect, beforeEach, mock } from "bun:test";

// Mock pg Pool and drizzle before importing the service
mock.module("pg", () => {
  return {
    Pool: class {
      connect() { return Promise.resolve({ query: () => Promise.resolve({ rows: [] }), release: () => {} }); }
      on() {}
      end() { return Promise.resolve(); }
    }
  };
});

mock.module("drizzle-orm/node-postgres", () => {
  return {
    drizzle: () => ({
      execute: () => Promise.resolve({ rows: [] })
    })
  };
});

// Import the actual service
import { AdminAnalyticsService } from "../services/adminAnalyticsService.js";

describe("AdminAnalyticsService Query Stats", () => {
  let service: any;

  beforeEach(() => {
    service = new AdminAnalyticsService();
  });

  it("should record and calculate basic query stats", () => {
    // recordQueryTime is private, access via cast or prototype
    (service as any).recordQueryTime("testQuery", 100);
    (service as any).recordQueryTime("testQuery", 200);

    const stats = service.getQueryExecutionStats();
    expect(stats.testQuery).toBeDefined();
    expect(stats.testQuery.avg).toBe(150);
    expect(stats.testQuery.min).toBe(100);
    expect(stats.testQuery.max).toBe(200);
    expect(stats.testQuery.count).toBe(2);
  });

  it("should handle sliding window of 100 elements", () => {
    // Fill first 100 with 100ms
    for (let i = 0; i < 100; i++) {
      (service as any).recordQueryTime("testQuery", 100);
    }

    let stats = service.getQueryExecutionStats();
    expect(stats.testQuery.count).toBe(100);
    expect(stats.testQuery.avg).toBe(100);

    // Add 101st element (200ms), first element (100ms) should be shifted out
    (service as any).recordQueryTime("testQuery", 200);
    stats = service.getQueryExecutionStats();
    expect(stats.testQuery.count).toBe(100);
    // 99 * 100 + 200 = 10100. 10100 / 100 = 101.
    expect(stats.testQuery.avg).toBe(101);
    expect(stats.testQuery.min).toBe(100);
    expect(stats.testQuery.max).toBe(200);
  });

  it("should recompute min when min element is shifted out", () => {
    (service as any).recordQueryTime("testQuery", 50); // Min
    for (let i = 0; i < 99; i++) {
      (service as any).recordQueryTime("testQuery", 100);
    }

    let stats = service.getQueryExecutionStats();
    expect(stats.testQuery.min).toBe(50);

    // Shift out the 50ms min
    (service as any).recordQueryTime("testQuery", 110);
    stats = service.getQueryExecutionStats();
    expect(stats.testQuery.min).toBe(100);
    expect(stats.testQuery.max).toBe(110);
  });

  it("should recompute max when max element is shifted out", () => {
    (service as any).recordQueryTime("testQuery", 500); // Max
    for (let i = 0; i < 99; i++) {
      (service as any).recordQueryTime("testQuery", 100);
    }

    let stats = service.getQueryExecutionStats();
    expect(stats.testQuery.max).toBe(500);

    // Shift out the 500ms max
    (service as any).recordQueryTime("testQuery", 110);
    stats = service.getQueryExecutionStats();
    expect(stats.testQuery.max).toBe(110);
    expect(stats.testQuery.min).toBe(100);
  });
});
