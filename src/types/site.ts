import type { SiteId, Coordinates, Timestamp } from "./common";

export type SiteStatus = "online" | "warning" | "critical" | "offline";

export type SiteType =
  | "Mining"
  | "Processing"
  | "Energy"
  | "Data Center"
  | "Manufacturing"
  | "Logistics";

export interface Site {
  id: SiteId;
  name: string;
  type: SiteType;
  coordinates: Coordinates;
  status: SiteStatus;
  timezone: string;
  personnelCount: number;
  activeAlerts: number;
  uptime: number; // percentage 0-100
  floorPlanUrl: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
