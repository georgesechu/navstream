"use client";

import { useMemo, useCallback, useState } from "react";
import { useFetch } from "./use-fetch";

export interface ApiWorkOrder {
  id: string;
  siteId: string;
  siteName: string;
  equipmentId: string;
  equipmentName: string;
  alertId: string | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  steps: {
    order: number;
    description: string;
    completed: boolean;
    completedAt: string | null;
    proofImageUrl: string | null;
  }[];
  safetyRequirements: string[];
  partsRequired: string[];
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  dueDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fallback sessions used when the API is unreachable.
 */
const fallbackWorkOrders: ApiWorkOrder[] = [
  {
    id: "s1",
    siteId: "site-1",
    siteName: "Kalgoorlie Gold Mine",
    equipmentId: "equip-1",
    equipmentName: "Main Generator",
    alertId: null,
    title: "Generator Inspection",
    description: "Routine quarterly generator inspection",
    priority: "medium",
    status: "completed",
    assigneeId: "c1",
    assigneeName: "James Mitchell",
    steps: Array.from({ length: 8 }, (_, i) => ({
      order: i + 1,
      description: `Step ${i + 1}`,
      completed: true,
      completedAt: new Date().toISOString(),
      proofImageUrl: null,
    })),
    safetyRequirements: [],
    partsRequired: [],
    estimatedMinutes: 45,
    actualMinutes: 42,
    dueDate: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "s2",
    siteId: "site-3",
    siteName: "Broken Hill Processing",
    equipmentId: "equip-5",
    equipmentName: "Primary Pump",
    alertId: null,
    title: "Pump Station Diagnosis",
    description: "Diagnose bearing temperature anomaly",
    priority: "high",
    status: "in-progress",
    assigneeId: "c3",
    assigneeName: "David Okonkwo",
    steps: Array.from({ length: 6 }, (_, i) => ({
      order: i + 1,
      description: `Step ${i + 1}`,
      completed: i < 3,
      completedAt: i < 3 ? new Date().toISOString() : null,
      proofImageUrl: null,
    })),
    safetyRequirements: [],
    partsRequired: [],
    estimatedMinutes: 60,
    actualMinutes: null,
    dueDate: new Date().toISOString(),
    completedAt: null,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "s3",
    siteId: "site-4",
    siteName: "Darwin LNG Terminal",
    equipmentId: "equip-7",
    equipmentName: "LNG Tank Farm",
    alertId: null,
    title: "Monthly Safety Walk",
    description: "Scheduled monthly safety inspection walkthrough",
    priority: "medium",
    status: "open",
    assigneeId: "c4",
    assigneeName: "Emma Torres",
    steps: Array.from({ length: 12 }, (_, i) => ({
      order: i + 1,
      description: `Step ${i + 1}`,
      completed: false,
      completedAt: null,
      proofImageUrl: null,
    })),
    safetyRequirements: [],
    partsRequired: [],
    estimatedMinutes: 90,
    actualMinutes: null,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface CommsSession {
  id: string;
  title: string;
  site: string;
  siteId: string;
  equipmentName: string;
  assigneeName: string;
  date: string;
  duration: string;
  status: "completed" | "active" | "scheduled";
  steps: number;
  completed: number;
  priority: string;
}

/**
 * Map work order status to comms session status.
 */
function mapSessionStatus(
  woStatus: string
): "completed" | "active" | "scheduled" {
  if (woStatus === "completed") return "completed";
  if (woStatus === "in-progress") return "active";
  return "scheduled"; // open, draft, cancelled → scheduled
}

/**
 * Format date for display in session card.
 */
function formatSessionDate(dateStr: string, status: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (status === "completed" || status === "in-progress") {
    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format duration for display.
 */
function formatDuration(wo: ApiWorkOrder): string {
  const sessionStatus = mapSessionStatus(wo.status);
  if (sessionStatus === "completed") {
    const mins = wo.actualMinutes ?? wo.estimatedMinutes ?? 0;
    return `${mins} min`;
  }
  if (sessionStatus === "active") return "In progress";
  return "Scheduled";
}

/**
 * Fetches work orders from /api/work-orders and maps them to comms sessions.
 * Falls back to hardcoded data if API is unavailable.
 */
export function useWorkOrders() {
  const { data, isLoading, error, refetch } =
    useFetch<ApiWorkOrder[]>("/api/work-orders");

  // Optimistic local overrides for steps (keyed by workOrderId)
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, ApiWorkOrder["steps"]>
  >({});

  const rawWorkOrders = useMemo((): ApiWorkOrder[] => {
    const base = (() => {
      if (data && data.length > 0) return data;
      if (error) return fallbackWorkOrders;
      return data ?? fallbackWorkOrders;
    })();

    // Apply local overrides
    return base.map((wo) => {
      const override = localOverrides[wo.id];
      if (override) {
        return { ...wo, steps: override };
      }
      return wo;
    });
  }, [data, error, localOverrides]);

  const sessions = useMemo((): CommsSession[] => {
    return rawWorkOrders.map((wo) => {
      const steps = wo.steps ?? [];
      const completedSteps = steps.filter((s) => s.completed).length;
      const sessionStatus = mapSessionStatus(wo.status);

      return {
        id: wo.id,
        title: wo.title,
        site: wo.siteName,
        siteId: wo.siteId,
        equipmentName: wo.equipmentName,
        assigneeName: wo.assigneeName,
        date: formatSessionDate(
          sessionStatus === "completed"
            ? wo.completedAt ?? wo.createdAt
            : sessionStatus === "active"
              ? wo.updatedAt
              : wo.dueDate,
          wo.status
        ),
        duration: formatDuration(wo),
        status: sessionStatus,
        steps: steps.length,
        completed: completedSteps,
        priority: wo.priority,
      };
    });
  }, [rawWorkOrders]);

  // Sort: active first, then scheduled, then completed
  const sortedSessions = useMemo(() => {
    const order = { active: 0, scheduled: 1, completed: 2 };
    return [...sessions].sort(
      (a, b) => order[a.status] - order[b.status]
    );
  }, [sessions]);

  /**
   * Toggle a step's completed status on a work order.
   * Applies optimistic update locally, then PATCHes the server.
   */
  const toggleStep = useCallback(
    async (workOrderId: string, stepOrder: number, completed: boolean) => {
      // Find current work order
      const wo = rawWorkOrders.find((w) => w.id === workOrderId);
      if (!wo) return;

      // Optimistic update
      const updatedSteps = (wo.steps ?? []).map((s) =>
        s.order === stepOrder
          ? {
              ...s,
              completed,
              completedAt: completed ? new Date().toISOString() : null,
            }
          : s
      );
      setLocalOverrides((prev) => ({ ...prev, [workOrderId]: updatedSteps }));

      try {
        await fetch(`/api/work-orders/${workOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            steps: [{ order: stepOrder, completed }],
          }),
        });
        // Refetch to get server state (including auto-status changes)
        refetch();
      } catch {
        // Revert optimistic update on error
        setLocalOverrides((prev) => {
          const next = { ...prev };
          delete next[workOrderId];
          return next;
        });
      }
    },
    [rawWorkOrders, refetch]
  );

  /**
   * Get the full work order data (with steps) for a given ID.
   */
  const getWorkOrder = useCallback(
    (id: string): ApiWorkOrder | undefined => {
      return rawWorkOrders.find((wo) => wo.id === id);
    },
    [rawWorkOrders]
  );

  return {
    sessions: sortedSessions,
    workOrders: rawWorkOrders,
    getWorkOrder,
    toggleStep,
    isLoading,
    error,
    refetch,
    isFromApi: data !== null && !error,
  };
}
