"use client";

import { useFetch } from "./use-fetch";
import { useAppStore, type Site as StoreSite } from "@/stores/app-store";

/** Shape of a POI as returned by the API */
interface ApiPOI {
  id: string;
  siteId: string;
  equipmentId: string | null;
  cameraFeedId: string | null;
  label: string;
  type: string;
  x: number;
  y: number;
  status: string;
}

/** Shape of equipment as returned by the API */
interface ApiEquipment {
  id: string;
  siteId: string;
  name: string;
  category: string;
  status: string;
  model: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  installDate: string | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  operatingHours: number;
  specs: Record<string, unknown> | null;
  maintenanceHistory: unknown[];
  createdAt: string;
  updatedAt: string;
}

/** Shape of a sensor as returned by the API */
interface ApiSensor {
  id: string;
  equipmentId: string;
  siteId: string;
  name: string;
  type: string;
  unit: string;
  currentValue: number | null;
  thresholds: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Shape of an alert as returned by the API */
interface ApiAlert {
  id: string;
  siteId: string;
  equipmentId: string | null;
  sensorId: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape of a camera feed as returned by the API */
interface ApiCameraFeed {
  id: string;
  siteId: string;
  equipmentId: string | null;
  name: string;
  type: string;
  streamUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Shape of a team member as returned by the API */
interface ApiTeamMember {
  id: string;
  siteId: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: string;
  avatar: string | null;
  certifications: string[];
  createdAt: string;
  updatedAt: string;
}

/** Full API response from GET /api/sites/[id] */
interface SiteDetailApiResponse {
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
  equipment: ApiEquipment[];
  sensors: ApiSensor[];
  alerts: ApiAlert[];
  pois: ApiPOI[];
  cameraFeeds: ApiCameraFeed[];
  teamMembers: ApiTeamMember[];
}

/**
 * Fetches detailed site data from /api/sites/{siteId} including
 * equipment, sensors, alerts, POIs, camera feeds, and team members.
 * Falls back to the Zustand store site data if the API is unavailable.
 */
export function useSiteDetail(siteId: string) {
  const { data, isLoading, error, refetch } =
    useFetch<SiteDetailApiResponse>(`/api/sites/${siteId}`);
  const storeSites = useAppStore((state) => state.sites);
  const storeSite = storeSites.find((s) => s.id === siteId) ?? null;

  // Map API site to the shape used by the UI, or fall back to store
  const site: (StoreSite & { floorPlanUrl?: string | null }) | null = data
    ? {
        id: data.id,
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        status: data.status as StoreSite["status"],
        type: data.type,
        personnelCount: data.personnelCount,
        activeAlerts: data.activeAlerts,
        uptime: data.uptime,
        floorPlanUrl: data.floorPlanUrl,
      }
    : storeSite;

  return {
    site,
    equipment: data?.equipment ?? [],
    sensors: data?.sensors ?? [],
    alerts: data?.alerts ?? [],
    pois: data?.pois ?? [],
    cameraFeeds: data?.cameraFeeds ?? [],
    teamMembers: data?.teamMembers ?? [],
    isLoading: isLoading && !storeSite,
    error,
    refetch,
    isFromApi: data !== null,
  };
}
