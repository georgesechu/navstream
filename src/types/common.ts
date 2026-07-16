// Branded type helper — prevents accidental mixing of string IDs
type Brand<T, B> = T & { __brand: B };

export type SiteId = Brand<string, "SiteId">;
export type EquipmentId = Brand<string, "EquipmentId">;
export type SensorId = Brand<string, "SensorId">;
export type AlertId = Brand<string, "AlertId">;
export type WorkOrderId = Brand<string, "WorkOrderId">;
export type POIId = Brand<string, "POIId">;
export type CameraFeedId = Brand<string, "CameraFeedId">;
export type TeamMemberId = Brand<string, "TeamMemberId">;
export type GuidedSessionId = Brand<string, "GuidedSessionId">;

// Utility to create branded IDs
export function createId<T extends string>(value: string): T {
  return value as T;
}

export type Timestamp = string; // ISO 8601

export type Coordinates = {
  lat: number;
  lng: number;
};
