import type { SensorId, EquipmentId, SiteId, Timestamp } from "./common";

export type SensorType =
  | "temperature"
  | "vibration"
  | "pressure"
  | "flow"
  | "humidity"
  | "current"
  | "voltage"
  | "rpm"
  | "level";

export type SensorUnit = "°C" | "mm/s" | "PSI" | "bar" | "L/min" | "%" | "A" | "V" | "RPM" | "m";

export interface AlertThresholds {
  warningLow: number | null;
  warningHigh: number | null;
  criticalLow: number | null;
  criticalHigh: number | null;
}

export interface Sensor {
  id: SensorId;
  equipmentId: EquipmentId;
  siteId: SiteId;
  name: string;
  type: SensorType;
  unit: SensorUnit;
  thresholds: AlertThresholds;
  currentValue: number | null;
  baseline: number; // expected normal value
  lastReadingAt: Timestamp | null;
}

export interface SensorReading {
  sensorId: SensorId;
  value: number;
  timestamp: Timestamp;
}
