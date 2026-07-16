"use client";

import { useFetch } from "./use-fetch";

export interface CameraFeedData {
  id: string;
  siteId: string;
  siteName: string;
  equipmentId: string | null;
  name: string;
  type: string;
  streamId: string;
  resolution: string | null;
  fps: number | null;
  isLive: boolean;
  isRecording: boolean;
}

/**
 * Fetches camera feeds from the API.
 * Returns feed data with site names included.
 */
export function useCameraFeeds() {
  const { data, isLoading, error, refetch } = useFetch<CameraFeedData[]>("/api/cameras");

  return {
    feeds: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
