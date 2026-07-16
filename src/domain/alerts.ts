import type { Alert, AlertFilters, AlertSeverity, AlertStatus } from "@/types/alert";

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const STATUS_ORDER: Record<AlertStatus, number> = {
  active: 0,
  acknowledged: 1,
  resolved: 2,
};

/**
 * Filter alerts by status, severity, site, or equipment.
 * "all" or undefined means no filter for that field.
 */
export function filterAlerts(alerts: Alert[], filters: AlertFilters): Alert[] {
  return alerts.filter((alert) => {
    if (filters.status && filters.status !== "all" && alert.status !== filters.status) {
      return false;
    }
    if (filters.severity && filters.severity !== "all" && alert.severity !== filters.severity) {
      return false;
    }
    if (filters.siteId && alert.siteId !== filters.siteId) {
      return false;
    }
    if (filters.equipmentId && alert.equipmentId !== filters.equipmentId) {
      return false;
    }
    return true;
  });
}

/**
 * Sort alerts: active before acknowledged before resolved,
 * then critical before warning before info,
 * then newest first.
 */
export function sortBySeverity(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Count alerts by severity, optionally limited to a specific status.
 */
export function countBySeverity(
  alerts: Alert[],
  status?: AlertStatus
): Record<AlertSeverity, number> {
  const filtered = status ? alerts.filter((a) => a.status === status) : alerts;
  return {
    critical: filtered.filter((a) => a.severity === "critical").length,
    warning: filtered.filter((a) => a.severity === "warning").length,
    info: filtered.filter((a) => a.severity === "info").length,
  };
}

/**
 * Determine if an alert should auto-escalate from warning to critical.
 * Escalates if unacknowledged for longer than the threshold.
 */
export function shouldEscalate(
  alert: Alert,
  now: Date,
  escalationMinutes: number
): boolean {
  if (alert.severity !== "warning") return false;
  if (alert.status !== "active") return false;

  const createdAt = new Date(alert.createdAt);
  const elapsedMs = now.getTime() - createdAt.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);

  return elapsedMinutes >= escalationMinutes;
}
