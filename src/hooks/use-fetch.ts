"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Simple generic data-fetching hook.
 * Fetches from the given URL on mount and returns { data, isLoading, error, refetch }.
 */
export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchedOnce = { current: false };

  const fetchData = useCallback(async () => {
    // Only show loading spinner on initial fetch, not on background refetches
    if (!hasFetchedOnce.current) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = (await response.json()) as T;
      setData(json);
      hasFetchedOnce.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    hasFetchedOnce.current = false;
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
