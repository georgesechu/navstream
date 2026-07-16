import type { CameraFeedId, SiteId, EquipmentId } from "./common";

export type CameraType = "fixed" | "ptz" | "360" | "thermal" | "drone";

export interface CameraFeed {
  id: CameraFeedId;
  siteId: SiteId;
  equipmentId: EquipmentId | null;
  name: string;
  type: CameraType;
  streamId: string; // go2rtc stream identifier
  resolution: string;
  fps: number;
  isLive: boolean;
  isRecording: boolean;
}
