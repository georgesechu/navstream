"use client";

import { useState, useEffect, useCallback } from "react";

export interface NavStreamSettings {
  sound: boolean;
  notifications: boolean;
  criticalAlerts: boolean;
  scanlines: boolean;
  glowEffects: boolean;
  animations: boolean;
  compactMode: boolean;
  autoRefresh: boolean;
  darkSatellite: boolean;
}

const STORAGE_KEY = "navstream-settings";

const defaultSettings: NavStreamSettings = {
  sound: true,
  notifications: true,
  criticalAlerts: true,
  scanlines: false,
  glowEffects: true,
  animations: true,
  compactMode: false,
  autoRefresh: true,
  darkSatellite: true,
};

function readFromStorage(): NavStreamSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NavStreamSettings>;
    // Merge with defaults so new keys get default values
    return { ...defaultSettings, ...parsed };
  } catch {
    return null;
  }
}

function writeToStorage(settings: NavStreamSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<NavStreamSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    const stored = readFromStorage();
    if (stored) {
      setSettingsState(stored);
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback((key: keyof NavStreamSettings) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writeToStorage(next);
      return next;
    });
  }, []);

  const setSetting = useCallback(
    <K extends keyof NavStreamSettings>(key: K, value: NavStreamSettings[K]) => {
      setSettingsState((prev) => {
        const next = { ...prev, [key]: value };
        writeToStorage(next);
        return next;
      });
    },
    []
  );

  return { settings, toggle, setSetting, hydrated };
}
