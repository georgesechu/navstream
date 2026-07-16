import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { useAlerts } from "../use-alerts";

function createApiAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert-1",
    siteId: "site-1",
    equipmentId: "equip-1",
    sensorId: null,
    title: "Test Alert",
    description: "Test description",
    severity: "warning",
    status: "active",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: "2026-07-15T10:00:00Z",
    updatedAt: "2026-07-15T10:00:00Z",
    ...overrides,
  };
}

describe("useAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns filtered and sorted alerts from API", async () => {
    const apiAlerts = [
      createApiAlert({ id: "a1", severity: "warning", status: "active", createdAt: "2026-07-15T09:00:00Z" }),
      createApiAlert({ id: "a2", severity: "critical", status: "active", createdAt: "2026-07-15T10:00:00Z" }),
      createApiAlert({ id: "a3", severity: "info", status: "active", createdAt: "2026-07-15T08:00:00Z" }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiAlerts,
    });

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Sorted by severity: critical first, then warning, then info
    expect(result.current.alerts).toHaveLength(3);
    expect(result.current.alerts[0].severity).toBe("critical");
    expect(result.current.alerts[1].severity).toBe("warning");
    expect(result.current.alerts[2].severity).toBe("info");
    expect(result.current.isFromApi).toBe(true);
  });

  it("returns correct counts for critical, warning, and resolved", async () => {
    const apiAlerts = [
      createApiAlert({ id: "a1", severity: "critical", status: "active" }),
      createApiAlert({ id: "a2", severity: "critical", status: "active" }),
      createApiAlert({ id: "a3", severity: "warning", status: "active" }),
      createApiAlert({ id: "a4", severity: "warning", status: "resolved", resolvedAt: "2026-07-15T12:00:00Z" }),
      createApiAlert({ id: "a5", severity: "info", status: "resolved", resolvedAt: "2026-07-15T12:00:00Z" }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiAlerts,
    });

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // countBySeverity filters to "active" status only
    expect(result.current.criticalCount).toBe(2);
    expect(result.current.warningCount).toBe(1);
    expect(result.current.resolvedCount).toBe(2);
    expect(result.current.totalCount).toBe(5);
  });

  it("falls back to mock data when API fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to hardcoded fallbackAlerts (8 alerts in the hook)
    expect(result.current.alerts.length).toBeGreaterThan(0);
    expect(result.current.isFromApi).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    // Fallback has known alerts — verify critical ones appear first
    const severities = result.current.alerts.map((a) => a.severity);
    // All critical alerts should come before warning alerts (among active ones)
    const firstWarningIdx = severities.indexOf("warning");
    const lastCriticalIdx = severities.lastIndexOf("critical");
    if (firstWarningIdx !== -1 && lastCriticalIdx !== -1) {
      expect(lastCriticalIdx).toBeLessThan(firstWarningIdx);
    }
  });

  it("filters alerts by status when statusFilter is provided", async () => {
    const apiAlerts = [
      createApiAlert({ id: "a1", severity: "critical", status: "active" }),
      createApiAlert({ id: "a2", severity: "warning", status: "acknowledged", acknowledgedAt: "2026-07-15T11:00:00Z" }),
      createApiAlert({ id: "a3", severity: "info", status: "resolved", resolvedAt: "2026-07-15T12:00:00Z" }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiAlerts,
    });

    const { result } = renderHook(() => useAlerts("active"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Only active alerts should be returned
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].status).toBe("active");
    // But totalCount should reflect all alerts
    expect(result.current.totalCount).toBe(3);
  });

  it("returns all alerts when statusFilter is 'all'", async () => {
    const apiAlerts = [
      createApiAlert({ id: "a1", status: "active" }),
      createApiAlert({ id: "a2", status: "acknowledged" }),
      createApiAlert({ id: "a3", status: "resolved" }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiAlerts,
    });

    const { result } = renderHook(() => useAlerts("all"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(3);
  });

  it("returns isLoading true initially", () => {
    mockFetch.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    const { result } = renderHook(() => useAlerts());

    expect(result.current.isLoading).toBe(true);
  });
});
