import type { Alert } from "@/types/alert";
import type { WorkOrder } from "@/types/work-order";
import type { SiteId } from "@/types/common";

export interface CostSavingsReport {
  totalRemoteResolutions: number;
  avgTripCost: number;
  totalSaved: number;
  periodLabel: string;
}

/**
 * Compute cost savings from remote resolutions.
 */
export function computeCostSavings(
  resolvedAlerts: Alert[],
  avgTripCost: number,
  periodLabel: string
): CostSavingsReport {
  const remoteResolutions = resolvedAlerts.filter(
    (a) => a.status === "resolved" && a.resolutionNotes !== null
  );

  return {
    totalRemoteResolutions: remoteResolutions.length,
    avgTripCost,
    totalSaved: remoteResolutions.length * avgTripCost,
    periodLabel,
  };
}

/**
 * Count alerts by site for a bar chart.
 */
export function alertsBySite(
  alerts: Alert[],
  siteNames: Record<string, string>
): { siteId: string; siteName: string; count: number }[] {
  const counts: Record<string, number> = {};

  for (const alert of alerts) {
    const key = alert.siteId as string;
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([siteId, count]) => ({
      siteId,
      siteName: siteNames[siteId] || siteId,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Compute average resolution time in minutes for resolved alerts.
 */
export function avgResolutionTime(alerts: Alert[]): number | null {
  const resolved = alerts.filter(
    (a) => a.status === "resolved" && a.resolvedAt
  );

  if (resolved.length === 0) return null;

  const totalMinutes = resolved.reduce((sum, a) => {
    const created = new Date(a.createdAt).getTime();
    const resolvedAt = new Date(a.resolvedAt!).getTime();
    return sum + (resolvedAt - created) / (1000 * 60);
  }, 0);

  return Math.round(totalMinutes / resolved.length);
}

/**
 * Compute work order completion rate.
 */
export function completionRate(workOrders: WorkOrder[]): number {
  if (workOrders.length === 0) return 0;
  const completed = workOrders.filter((wo) => wo.status === "completed").length;
  return Math.round((completed / workOrders.length) * 100);
}
