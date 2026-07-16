import type {
  AlertId,
  SiteId,
  EquipmentId,
  SensorId,
  TeamMemberId,
  Timestamp,
} from "./common";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface Alert {
  id: AlertId;
  siteId: SiteId;
  equipmentId: EquipmentId;
  sensorId: SensorId | null;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  triggerValue: number | null;
  thresholdValue: number | null;
  assigneeId: TeamMemberId | null;
  acknowledgedAt: Timestamp | null;
  resolvedAt: Timestamp | null;
  resolutionNotes: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AlertFilters {
  status?: AlertStatus | "all";
  severity?: AlertSeverity | "all";
  siteId?: SiteId;
  equipmentId?: EquipmentId;
}
