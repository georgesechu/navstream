import { describe, it, expect, beforeEach } from "vitest";
import { filterAlerts, sortBySeverity, countBySeverity, shouldEscalate } from "../alerts";
import { createMockAlert, resetIdCounter } from "@/test/factories";
import type { AlertId } from "@/types/common";
import { createId } from "@/types/common";

beforeEach(() => resetIdCounter());

describe("filterAlerts", () => {
  const alerts = [
    createMockAlert({ id: createId<AlertId>("a1"), severity: "critical", status: "active" }),
    createMockAlert({ id: createId<AlertId>("a2"), severity: "warning", status: "active" }),
    createMockAlert({ id: createId<AlertId>("a3"), severity: "warning", status: "acknowledged" }),
    createMockAlert({ id: createId<AlertId>("a4"), severity: "info", status: "resolved" }),
  ];

  it("returns all alerts when filter is 'all'", () => {
    const result = filterAlerts(alerts, { status: "all" });
    expect(result).toHaveLength(4);
  });

  it("filters by status", () => {
    const result = filterAlerts(alerts, { status: "active" });
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.status === "active")).toBe(true);
  });

  it("filters by severity", () => {
    const result = filterAlerts(alerts, { severity: "warning" });
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.severity === "warning")).toBe(true);
  });

  it("combines filters", () => {
    const result = filterAlerts(alerts, { status: "active", severity: "warning" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a2");
  });

  it("returns empty array when nothing matches", () => {
    const result = filterAlerts(alerts, { severity: "critical", status: "resolved" });
    expect(result).toHaveLength(0);
  });

  it("returns all when no filters provided", () => {
    const result = filterAlerts(alerts, {});
    expect(result).toHaveLength(4);
  });
});

describe("sortBySeverity", () => {
  it("sorts active before acknowledged before resolved", () => {
    const alerts = [
      createMockAlert({ id: createId<AlertId>("resolved"), status: "resolved", severity: "critical" }),
      createMockAlert({ id: createId<AlertId>("active"), status: "active", severity: "info" }),
      createMockAlert({ id: createId<AlertId>("ack"), status: "acknowledged", severity: "critical" }),
    ];

    const sorted = sortBySeverity(alerts);
    expect(sorted[0].id).toBe("active");
    expect(sorted[1].id).toBe("ack");
    expect(sorted[2].id).toBe("resolved");
  });

  it("sorts critical before warning before info within same status", () => {
    const alerts = [
      createMockAlert({ id: createId<AlertId>("info"), severity: "info", status: "active" }),
      createMockAlert({ id: createId<AlertId>("critical"), severity: "critical", status: "active" }),
      createMockAlert({ id: createId<AlertId>("warning"), severity: "warning", status: "active" }),
    ];

    const sorted = sortBySeverity(alerts);
    expect(sorted[0].id).toBe("critical");
    expect(sorted[1].id).toBe("warning");
    expect(sorted[2].id).toBe("info");
  });

  it("sorts newest first within same status and severity", () => {
    const alerts = [
      createMockAlert({ id: createId<AlertId>("old"), severity: "warning", status: "active", createdAt: "2026-07-14T00:00:00Z" }),
      createMockAlert({ id: createId<AlertId>("new"), severity: "warning", status: "active", createdAt: "2026-07-15T00:00:00Z" }),
    ];

    const sorted = sortBySeverity(alerts);
    expect(sorted[0].id).toBe("new");
    expect(sorted[1].id).toBe("old");
  });

  it("does not mutate the original array", () => {
    const alerts = [
      createMockAlert({ severity: "info" }),
      createMockAlert({ severity: "critical" }),
    ];
    const original = [...alerts];
    sortBySeverity(alerts);
    expect(alerts).toEqual(original);
  });
});

describe("countBySeverity", () => {
  it("counts correctly", () => {
    const alerts = [
      createMockAlert({ severity: "critical" }),
      createMockAlert({ severity: "critical" }),
      createMockAlert({ severity: "warning" }),
      createMockAlert({ severity: "info" }),
    ];

    const counts = countBySeverity(alerts);
    expect(counts).toEqual({ critical: 2, warning: 1, info: 1 });
  });

  it("filters by status before counting", () => {
    const alerts = [
      createMockAlert({ severity: "critical", status: "active" }),
      createMockAlert({ severity: "critical", status: "resolved" }),
      createMockAlert({ severity: "warning", status: "active" }),
    ];

    const counts = countBySeverity(alerts, "active");
    expect(counts).toEqual({ critical: 1, warning: 1, info: 0 });
  });

  it("returns zeros for empty input", () => {
    expect(countBySeverity([])).toEqual({ critical: 0, warning: 0, info: 0 });
  });
});

describe("shouldEscalate", () => {
  it("returns true when active warning exceeds escalation time", () => {
    const alert = createMockAlert({
      severity: "warning",
      status: "active",
      createdAt: "2026-07-15T10:00:00Z",
    });
    const now = new Date("2026-07-15T10:31:00Z"); // 31 minutes later
    expect(shouldEscalate(alert, now, 30)).toBe(true);
  });

  it("returns false when within escalation time", () => {
    const alert = createMockAlert({
      severity: "warning",
      status: "active",
      createdAt: "2026-07-15T10:00:00Z",
    });
    const now = new Date("2026-07-15T10:20:00Z"); // 20 minutes later
    expect(shouldEscalate(alert, now, 30)).toBe(false);
  });

  it("returns false for critical alerts (already escalated)", () => {
    const alert = createMockAlert({
      severity: "critical",
      status: "active",
      createdAt: "2026-07-15T10:00:00Z",
    });
    const now = new Date("2026-07-15T11:00:00Z");
    expect(shouldEscalate(alert, now, 30)).toBe(false);
  });

  it("returns false for acknowledged alerts", () => {
    const alert = createMockAlert({
      severity: "warning",
      status: "acknowledged",
      createdAt: "2026-07-15T10:00:00Z",
    });
    const now = new Date("2026-07-15T11:00:00Z");
    expect(shouldEscalate(alert, now, 30)).toBe(false);
  });
});
