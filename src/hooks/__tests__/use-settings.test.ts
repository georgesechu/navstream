import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

import { useSettings, type NavStreamSettings } from "../use-settings";

const STORAGE_KEY = "navstream-settings";

describe("useSettings", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns default settings initially", () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.sound).toBe(true);
    expect(result.current.settings.notifications).toBe(true);
    expect(result.current.settings.criticalAlerts).toBe(true);
    expect(result.current.settings.scanlines).toBe(false);
    expect(result.current.settings.glowEffects).toBe(true);
    expect(result.current.settings.animations).toBe(true);
    expect(result.current.settings.compactMode).toBe(false);
    expect(result.current.settings.autoRefresh).toBe(true);
    expect(result.current.settings.darkSatellite).toBe(true);
  });

  it("toggle function updates a setting value", () => {
    const { result } = renderHook(() => useSettings());

    // sound starts as true
    expect(result.current.settings.sound).toBe(true);

    act(() => {
      result.current.toggle("sound");
    });

    expect(result.current.settings.sound).toBe(false);

    // Toggle again
    act(() => {
      result.current.toggle("sound");
    });

    expect(result.current.settings.sound).toBe(true);
  });

  it("toggle persists to localStorage", () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.toggle("scanlines");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.any(String)
    );

    const stored = JSON.parse(
      localStorageMock.setItem.mock.calls[
        localStorageMock.setItem.mock.calls.length - 1
      ][1]
    );
    expect(stored.scanlines).toBe(true);
  });

  it("setSetting updates a specific setting", () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setSetting("compactMode", true);
    });

    expect(result.current.settings.compactMode).toBe(true);
  });

  it("hydrates from localStorage on mount", () => {
    const savedSettings: NavStreamSettings = {
      sound: false,
      notifications: false,
      criticalAlerts: true,
      scanlines: true,
      glowEffects: false,
      animations: true,
      compactMode: true,
      autoRefresh: false,
      darkSatellite: true,
    };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(savedSettings));
    // Reset mock so the getItem spy returns the stored value
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_KEY) return JSON.stringify(savedSettings);
      return null;
    });

    const { result } = renderHook(() => useSettings());

    // After hydration, settings should match stored values
    // Note: useEffect runs asynchronously, but renderHook should flush effects
    expect(result.current.settings.sound).toBe(false);
    expect(result.current.settings.scanlines).toBe(true);
    expect(result.current.settings.compactMode).toBe(true);
    expect(result.current.settings.autoRefresh).toBe(false);
  });

  it("sets hydrated to true after mount", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.hydrated).toBe(true);
  });

  it("merges partial stored settings with defaults", () => {
    // Store only a subset of settings
    const partialSettings = { sound: false, scanlines: true };
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_KEY) return JSON.stringify(partialSettings);
      return null;
    });

    const { result } = renderHook(() => useSettings());

    // Stored values should take effect
    expect(result.current.settings.sound).toBe(false);
    expect(result.current.settings.scanlines).toBe(true);
    // Non-stored values should use defaults
    expect(result.current.settings.glowEffects).toBe(true);
    expect(result.current.settings.animations).toBe(true);
  });

  it("handles corrupted localStorage data gracefully", () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === STORAGE_KEY) return "not-valid-json";
      return null;
    });

    const { result } = renderHook(() => useSettings());

    // Should fall back to defaults
    expect(result.current.settings.sound).toBe(true);
    expect(result.current.settings.scanlines).toBe(false);
  });
});
