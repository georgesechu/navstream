"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseLiveAlertCountResult {
  /** Number of active alerts */
  count: number;
  /** Whether a new alert just arrived (true for ~2s after new alert) */
  hasNewAlert: boolean;
}

/**
 * Polls /api/alerts for active alert count and listens for SSE alert events.
 * Returns the count and a transient `hasNewAlert` flag for animation triggers.
 */
export function useLiveAlertCount(): UseLiveAlertCountResult {
  const [count, setCount] = useState(0);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const newAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?status=active");
      if (!res.ok) return;
      const data = await res.json();
      if (!mountedRef.current) return;
      const activeCount = Array.isArray(data) ? data.length : 0;
      setCount((prev) => {
        if (activeCount > prev && prev > 0) {
          // New alert arrived — trigger pulse
          setHasNewAlert(true);
          if (newAlertTimeoutRef.current) clearTimeout(newAlertTimeoutRef.current);
          newAlertTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) setHasNewAlert(false);
          }, 2000);
        }
        return activeCount;
      });
    } catch {
      // Ignore fetch errors
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchCount();

    // Poll every 10s for count updates
    const interval = setInterval(fetchCount, 10_000);

    // Also listen to SSE for immediate alert notifications
    const es = new EventSource("/api/sensors/live");

    es.addEventListener("alert", () => {
      if (!mountedRef.current) return;
      // Refetch count immediately when a new alert arrives
      fetchCount();
    });

    es.onerror = () => {
      // SSE errors are fine — we still have polling as fallback
    };

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      es.close();
      if (newAlertTimeoutRef.current) clearTimeout(newAlertTimeoutRef.current);
    };
  }, [fetchCount]);

  return { count, hasNewAlert };
}
