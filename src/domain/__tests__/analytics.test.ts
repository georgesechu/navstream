import { describe, it, expect } from "vitest";
import { computeCostSavings, alertsBySite, avgResolutionTime, completionRate } from "../analytics";
import { createMockAlert, createMockWorkOrder } from "@/test/factories";
import { createId } from "@/types/common";
import type { SiteId } from "@/types/common";

describe("computeCostSavings", () => {
  it("computes total savings from remote resolutions", () => {
    const alerts = [
      createMockAlert({ status: "resolved", resolutionNotes: "Fixed remotely" }),
      createMockAlert({ status: "resolved", resolutionNotes: "Guided repair" }),
      createMockAlert({ status: "resolved", resolutionNotes: null }), // no notes = not counted
      createMockAlert({ status: "active" }), // not resolved
    ];

    const report = computeCostSavings(alerts, 12000, "Q3 2026");
    expect(report.totalRemoteResolutions).toBe(2);
    expect(report.totalSaved).toBe(24000);
    expect(report.avgTripCost).toBe(12000);
    expect(report.periodLabel).toBe("Q3 2026");
  });

  it("returns zero for no resolutions", () => {
    const report = computeCostSavings([], 12000, "Q3 2026");
    expect(report.totalSaved).toBe(0);
  });
});

describe("alertsBySite", () => {
  it("groups and sorts by count descending", () => {
    const alerts = [
      createMockAlert({ siteId: createId<SiteId>("s1") }),
      createMockAlert({ siteId: createId<SiteId>("s1") }),
      createMockAlert({ siteId: createId<SiteId>("s1") }),
      createMockAlert({ siteId: createId<SiteId>("s2") }),
      createMockAlert({ siteId: createId<SiteId>("s3") }),
      createMockAlert({ siteId: createId<SiteId>("s3") }),
    ];

    const result = alertsBySite(alerts, { s1: "Site A", s2: "Site B", s3: "Site C" });
    expect(result[0]).toEqual({ siteId: "s1", siteName: "Site A", count: 3 });
    expect(result[1]).toEqual({ siteId: "s3", siteName: "Site C", count: 2 });
    expect(result[2]).toEqual({ siteId: "s2", siteName: "Site B", count: 1 });
  });
});

describe("avgResolutionTime", () => {
  it("computes average in minutes", () => {
    const alerts = [
      createMockAlert({
        status: "resolved",
        createdAt: "2026-07-15T10:00:00Z",
        resolvedAt: "2026-07-15T10:30:00Z", // 30 min
      }),
      createMockAlert({
        status: "resolved",
        createdAt: "2026-07-15T10:00:00Z",
        resolvedAt: "2026-07-15T11:00:00Z", // 60 min
      }),
    ];
    expect(avgResolutionTime(alerts)).toBe(45);
  });

  it("returns null when no resolved alerts", () => {
    expect(avgResolutionTime([])).toBeNull();
    expect(avgResolutionTime([createMockAlert({ status: "active" })])).toBeNull();
  });
});

describe("completionRate", () => {
  it("computes percentage of completed work orders", () => {
    const orders = [
      createMockWorkOrder({ status: "completed" }),
      createMockWorkOrder({ status: "completed" }),
      createMockWorkOrder({ status: "open" }),
      createMockWorkOrder({ status: "in-progress" }),
    ];
    expect(completionRate(orders)).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(completionRate([])).toBe(0);
  });

  it("returns 100 when all work orders are completed", () => {
    const orders = [
      createMockWorkOrder({ status: "completed" }),
      createMockWorkOrder({ status: "completed" }),
      createMockWorkOrder({ status: "completed" }),
    ];
    expect(completionRate(orders)).toBe(100);
  });

  it("returns 0 when no work orders are completed", () => {
    const orders = [
      createMockWorkOrder({ status: "open" }),
      createMockWorkOrder({ status: "in-progress" }),
    ];
    expect(completionRate(orders)).toBe(0);
  });
});

describe("alertsBySite - edge cases", () => {
  it("returns empty array for no alerts", () => {
    const result = alertsBySite([], {});
    expect(result).toEqual([]);
  });

  it("uses siteId as fallback when site name is not in map", () => {
    const alerts = [
      createMockAlert({ siteId: createId<SiteId>("unknown-site") }),
    ];
    const result = alertsBySite(alerts, {});
    expect(result[0].siteName).toBe("unknown-site");
    expect(result[0].count).toBe(1);
  });
});

describe("avgResolutionTime - edge cases", () => {
  it("ignores resolved alerts without resolvedAt timestamp", () => {
    const alerts = [
      createMockAlert({
        status: "resolved",
        createdAt: "2026-07-15T10:00:00Z",
        resolvedAt: null,
      }),
    ];
    expect(avgResolutionTime(alerts)).toBeNull();
  });
});
