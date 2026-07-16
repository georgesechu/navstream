import type { Equipment, EquipmentStatus } from "@/types/equipment";
import type { Alert } from "@/types/alert";
import type { SensorReading } from "@/types/sensor";

/**
 * Compute uptime percentage for equipment based on status history.
 * Simple version: uses current status as proxy.
 */
export function computeUptime(
  totalHours: number,
  downtimeHours: number
): number {
  if (totalHours <= 0) return 0;
  const uptime = ((totalHours - downtimeHours) / totalHours) * 100;
  return Math.round(uptime * 10) / 10;
}

/**
 * Determine effective equipment status from its alerts.
 * Highest severity active alert wins.
 */
export function deriveEquipmentStatus(
  equipment: Equipment,
  activeAlerts: Alert[]
): EquipmentStatus {
  const equipmentAlerts = activeAlerts.filter(
    (a) => a.equipmentId === equipment.id && a.status === "active"
  );

  if (equipmentAlerts.some((a) => a.severity === "critical")) return "failed";
  if (equipmentAlerts.some((a) => a.severity === "warning")) return "degraded";
  if (equipment.status === "maintenance") return "maintenance";
  return "operational";
}

/**
 * Check if maintenance is overdue.
 */
export function isMaintenanceOverdue(
  nextServiceDate: string | null,
  now: Date
): boolean {
  if (!nextServiceDate) return false;
  return new Date(nextServiceDate) < now;
}

/**
 * Days until next maintenance. Negative if overdue.
 */
export function daysUntilMaintenance(
  nextServiceDate: string | null,
  now: Date
): number | null {
  if (!nextServiceDate) return null;
  const diff = new Date(nextServiceDate).getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
