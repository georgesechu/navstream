"use client";

import { useMemo } from "react";
import { useFetch } from "./use-fetch";
import { sortBySeverity, countBySeverity } from "@/domain/alerts";
import type { Alert, AlertStatus, AlertSeverity } from "@/types/alert";

/**
 * Alert data as returned by the API (matches DB schema column names).
 */
interface ApiAlert {
  id: string;
  siteId: string;
  equipmentId: string;
  sensorId: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  triggerValue: number | null;
  thresholdValue: number | null;
  assigneeId: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hardcoded fallback alerts — used when the API is unreachable (no DB).
 * Matches the original mockAlerts that were inline in the alerts page.
 */
const fallbackAlerts: Alert[] = [
  {
    id: "alert-1" as Alert["id"],
    siteId: "site-3" as Alert["siteId"],
    equipmentId: "equip-5" as Alert["equipmentId"],
    sensorId: null,
    title: "Bearing temperature critical",
    description:
      "Main bearing assembly temperature at 142\u00B0C \u2014 22\u00B0C above baseline. Immediate inspection recommended.",
    severity: "critical",
    status: "active",
    triggerValue: 142,
    thresholdValue: 120,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-2" as Alert["id"],
    siteId: "site-3" as Alert["siteId"],
    equipmentId: "equip-5" as Alert["equipmentId"],
    sensorId: null,
    title: "Coolant flow rate degraded",
    description:
      "Coolant flow rate has dropped 8% below baseline. Check for blockages in coolant lines.",
    severity: "warning",
    status: "active",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-3" as Alert["id"],
    siteId: "site-6" as Alert["siteId"],
    equipmentId: "equip-10" as Alert["equipmentId"],
    sensorId: null,
    title: "Communication loss \u2014 Svalbard",
    description:
      "All communication with Svalbard Data Center lost. Last heartbeat received 2 hours ago.",
    severity: "critical",
    status: "active",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-4" as Alert["id"],
    siteId: "site-2" as Alert["siteId"],
    equipmentId: "equip-3" as Alert["equipmentId"],
    sensorId: null,
    title: "Vibration anomaly detected",
    description:
      "15% increase in lateral vibration amplitude on conveyor belt motor.",
    severity: "warning",
    status: "acknowledged",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "member-2" as Alert["assigneeId"],
    acknowledgedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-5" as Alert["id"],
    siteId: "site-4" as Alert["siteId"],
    equipmentId: "equip-7" as Alert["equipmentId"],
    sensorId: null,
    title: "Scheduled maintenance due",
    description:
      "Monthly safety inspection due for LNG Tank Farm. Last completed 28 days ago.",
    severity: "info",
    status: "active",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-6" as Alert["id"],
    siteId: "site-5" as Alert["siteId"],
    equipmentId: "equip-9" as Alert["equipmentId"],
    sensorId: null,
    title: "Solar panel efficiency drop",
    description:
      "Block 4 output down 12% \u2014 likely dust accumulation. Cleaning cycle recommended.",
    severity: "warning",
    status: "acknowledged",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "member-3" as Alert["assigneeId"],
    acknowledgedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-7" as Alert["id"],
    siteId: "site-4" as Alert["siteId"],
    equipmentId: "equip-8" as Alert["equipmentId"],
    sensorId: null,
    title: "Pressure relief valve test passed",
    description: "Quarterly PRV test completed successfully. All valves within spec.",
    severity: "info",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-8" as Alert["id"],
    siteId: "site-1" as Alert["siteId"],
    equipmentId: "equip-1" as Alert["equipmentId"],
    sensorId: null,
    title: "Generator output restored",
    description:
      "Main generator output restored to nominal levels after coolant system flush.",
    severity: "warning",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "member-4" as Alert["assigneeId"],
    acknowledgedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
];

function mapApiAlert(apiAlert: ApiAlert): Alert {
  return {
    id: apiAlert.id as Alert["id"],
    siteId: apiAlert.siteId as Alert["siteId"],
    equipmentId: apiAlert.equipmentId as Alert["equipmentId"],
    sensorId: (apiAlert.sensorId ?? null) as Alert["sensorId"],
    title: apiAlert.title,
    description: apiAlert.description,
    severity: apiAlert.severity as AlertSeverity,
    status: apiAlert.status as AlertStatus,
    triggerValue: apiAlert.triggerValue,
    thresholdValue: apiAlert.thresholdValue,
    assigneeId: (apiAlert.assigneeId ?? null) as Alert["assigneeId"],
    acknowledgedAt: apiAlert.acknowledgedAt,
    resolvedAt: apiAlert.resolvedAt,
    resolutionNotes: apiAlert.resolutionNotes,
    createdAt: apiAlert.createdAt,
    updatedAt: apiAlert.updatedAt,
  };
}

/**
 * Fetches alerts from /api/alerts with optional status filter.
 * Falls back to hardcoded mock data if the API is unreachable.
 * Uses domain logic from src/domain/alerts.ts for filtering and sorting.
 */
export function useAlerts(statusFilter: AlertStatus | "all" = "all") {
  const { data, isLoading, error, refetch } = useFetch<ApiAlert[]>("/api/alerts");

  const allAlerts: Alert[] = useMemo(() => {
    if (data && data.length > 0) {
      return data.map(mapApiAlert);
    }
    // Fallback: if API returned empty array, it may be a real empty DB.
    // Only fall back to mock data on actual errors.
    if (error) {
      return fallbackAlerts;
    }
    // API succeeded but returned empty or null
    return data ? data.map(mapApiAlert) : fallbackAlerts;
  }, [data, error]);

  const filtered = useMemo(() => {
    const sorted = sortBySeverity(allAlerts);
    if (statusFilter === "all") return sorted;
    return sorted.filter((a) => a.status === statusFilter);
  }, [allAlerts, statusFilter]);

  const counts = useMemo(
    () => countBySeverity(allAlerts, "active"),
    [allAlerts]
  );

  const resolvedCount = useMemo(
    () => allAlerts.filter((a) => a.status === "resolved").length,
    [allAlerts]
  );

  return {
    alerts: filtered,
    allAlerts,
    criticalCount: counts.critical,
    warningCount: counts.warning,
    resolvedCount,
    totalCount: allAlerts.length,
    isLoading,
    error,
    refetch,
    isFromApi: data !== null && !error,
  };
}
