import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock the Zustand store before importing the hook
const mockStoreSites = [
  {
    id: "site-1",
    name: "Kalgoorlie Gold Mine",
    lat: -30.749,
    lng: 121.466,
    status: "online" as const,
    type: "Mining",
    personnelCount: 12,
    activeAlerts: 0,
    uptime: 99.7,
  },
  {
    id: "site-2",
    name: "Pilbara Iron Ore",
    lat: -22.297,
    lng: 118.775,
    status: "warning" as const,
    type: "Mining",
    personnelCount: 8,
    activeAlerts: 3,
    uptime: 97.2,
  },
];

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (state: { sites: typeof mockStoreSites }) => unknown) =>
    selector({ sites: mockStoreSites }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { useSites } from "../use-sites";

describe("useSites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sites from API when fetch succeeds", async () => {
    const apiSites = [
      {
        id: "site-api-1",
        name: "API Site 1",
        type: "Mining",
        lat: -30.0,
        lng: 120.0,
        status: "online",
        timezone: "Australia/Perth",
        personnelCount: 10,
        activeAlerts: 1,
        uptime: 98.5,
        floorPlanUrl: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-07-15T00:00:00Z",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => apiSites,
    });

    const { result } = renderHook(() => useSites());

    await waitFor(() => {
      expect(result.current.isFromApi).toBe(true);
    });

    expect(result.current.sites).toHaveLength(1);
    expect(result.current.sites[0].id).toBe("site-api-1");
    expect(result.current.sites[0].name).toBe("API Site 1");
    expect(result.current.sites[0].lat).toBe(-30.0);
    expect(result.current.sites[0].lng).toBe(120.0);
  });

  it("falls back to store data when API fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSites());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to the Zustand store sites
    expect(result.current.sites).toHaveLength(2);
    expect(result.current.sites[0].id).toBe("site-1");
    expect(result.current.sites[1].id).toBe("site-2");
    expect(result.current.isFromApi).toBe(false);
  });

  it("returns isLoading false immediately when store has fallback data", () => {
    // Even while loading, if the store has data, isLoading should be false
    // because showLoading = isLoading && storeSites.length === 0
    mockFetch.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    const { result } = renderHook(() => useSites());

    // Store has 2 sites, so showLoading should be false even while fetching
    expect(result.current.isLoading).toBe(false);
    expect(result.current.sites).toHaveLength(2); // fallback store data
  });

  it("falls back to store data when API returns empty array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useSites());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Empty API response falls back to store data
    expect(result.current.sites).toHaveLength(2);
    expect(result.current.isFromApi).toBe(false);
  });

  it("maps API site fields correctly to store Site shape", async () => {
    const apiSites = [
      {
        id: "site-mapped",
        name: "Mapped Site",
        type: "Energy",
        lat: -12.46,
        lng: 130.845,
        status: "critical",
        timezone: "Australia/Darwin",
        personnelCount: 15,
        activeAlerts: 5,
        uptime: 89.1,
        floorPlanUrl: "/floor.svg",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-07-15T00:00:00Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiSites,
    });

    const { result } = renderHook(() => useSites());

    await waitFor(() => {
      expect(result.current.isFromApi).toBe(true);
    });

    const site = result.current.sites[0];
    expect(site.id).toBe("site-mapped");
    expect(site.name).toBe("Mapped Site");
    expect(site.type).toBe("Energy");
    expect(site.status).toBe("critical");
    expect(site.personnelCount).toBe(15);
    expect(site.activeAlerts).toBe(5);
    expect(site.uptime).toBe(89.1);
    // floorPlanUrl, timezone, createdAt, updatedAt should NOT be on the mapped Site
    expect(site).not.toHaveProperty("floorPlanUrl");
    expect(site).not.toHaveProperty("timezone");
  });
});
