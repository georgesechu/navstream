import type { EquipmentId, SiteId, Timestamp } from "./common";

export type EquipmentStatus = "operational" | "degraded" | "failed" | "maintenance" | "offline";

export type EquipmentCategory =
  | "pump"
  | "generator"
  | "conveyor"
  | "compressor"
  | "hvac"
  | "transformer"
  | "motor"
  | "valve"
  | "tank"
  | "sensor-array"
  | "network"
  | "other";

export interface MaintenanceRecord {
  date: Timestamp;
  type: "scheduled" | "unscheduled" | "emergency";
  description: string;
  technician: string;
  durationMinutes: number;
  partsReplaced: string[];
}

export interface EquipmentSpecs {
  manufacturer: string;
  model: string;
  serialNumber: string;
  installDate: Timestamp;
  warrantyExpiry: Timestamp | null;
  specifications: Record<string, string>; // key-value pairs like "Max Pressure": "150 PSI"
}

export interface Equipment {
  id: EquipmentId;
  siteId: SiteId;
  name: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  specs: EquipmentSpecs;
  location: string; // human-readable location within site, e.g. "Pump Station — Bay 3"
  maintenanceHistory: MaintenanceRecord[];
  lastServiceDate: Timestamp | null;
  nextServiceDate: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
