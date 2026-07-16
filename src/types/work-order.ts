import type {
  WorkOrderId,
  SiteId,
  EquipmentId,
  AlertId,
  TeamMemberId,
  Timestamp,
} from "./common";

export type WorkOrderPriority = "critical" | "high" | "medium" | "low";
export type WorkOrderStatus = "draft" | "open" | "in-progress" | "completed" | "cancelled";

export interface WorkOrderStep {
  order: number;
  description: string;
  completed: boolean;
  completedAt: Timestamp | null;
  proofImageUrl: string | null;
}

export interface WorkOrder {
  id: WorkOrderId;
  siteId: SiteId;
  equipmentId: EquipmentId;
  alertId: AlertId | null;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assigneeId: TeamMemberId;
  steps: WorkOrderStep[];
  safetyRequirements: string[];
  partsRequired: string[];
  estimatedMinutes: number;
  actualMinutes: number | null;
  dueDate: Timestamp;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
