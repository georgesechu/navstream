import type { POIId, SiteId, EquipmentId, CameraFeedId } from "./common";

export type POIType = "equipment" | "camera" | "sensor" | "zone" | "network" | "access-point";

export interface POI {
  id: POIId;
  siteId: SiteId;
  equipmentId: EquipmentId | null;
  cameraFeedId: CameraFeedId | null;
  label: string;
  type: POIType;
  x: number; // percentage position on floor plan (0-100)
  y: number;
  status: "online" | "warning" | "critical" | "offline";
}
