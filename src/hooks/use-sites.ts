"use client";

import { useFetch } from "./use-fetch";
import { useAppStore, type Site } from "@/stores/app-store";

interface ApiSite {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  status: string;
  timezone: string;
  personnelCount: number;
  activeAlerts: number;
  uptime: number;
  floorPlanUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapApiSiteToStoreSite(apiSite: ApiSite): Site {
  return {
    id: apiSite.id,
    name: apiSite.name,
    lat: apiSite.lat,
    lng: apiSite.lng,
    status: apiSite.status as Site["status"],
    type: apiSite.type,
    personnelCount: apiSite.personnelCount,
    activeAlerts: apiSite.activeAlerts,
    uptime: apiSite.uptime,
  };
}

/**
 * Fetches sites from /api/sites, falling back to the Zustand store data
 * if the API is unreachable or returns an error.
 */
export function useSites() {
  const { data, isLoading, error, refetch } = useFetch<ApiSite[]>("/api/sites");
  const storeSites = useAppStore((state) => state.sites);

  // Map API data to the Site shape used by the UI, or fall back to store
  const sites: Site[] =
    data && data.length > 0 ? data.map(mapApiSiteToStoreSite) : storeSites;

  // We're only truly "loading" if we have no fallback data to show
  // Once we have store data, we can show it immediately while fetching
  const showLoading = isLoading && storeSites.length === 0;

  return {
    sites,
    isLoading: showLoading,
    error,
    refetch,
    isFromApi: data !== null && data.length > 0,
  };
}
