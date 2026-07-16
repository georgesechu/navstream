"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAlerts } from "@/hooks/use-alerts";
import { useSites } from "@/hooks/use-sites";
import { useLiveSensors } from "@/hooks/use-live-sensors";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
  ShieldCheck,
  CheckCircle,
  X,
  Radio,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";

import type { AlertStatus } from "@/types/alert";

const severityConfig = {
  critical: {
    icon: AlertOctagon,
    color: "text-red",
    bg: "bg-red/10",
    border: "border-red/20",
    glow: "shadow-[0_0_12px_rgba(255,23,68,0.1)]",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/20",
    glow: "shadow-[0_0_12px_rgba(255,171,0,0.1)]",
  },
  info: {
    icon: Info,
    color: "text-cyan",
    bg: "bg-cyan/10",
    border: "border-cyan/20",
    glow: "",
  },
};

export default function AlertsPage() {
  const [filter, setFilter] = useState<AlertStatus | "all">("all");
  const { alerts: filtered, criticalCount, warningCount, resolvedCount, totalCount, isLoading, refetch } = useAlerts(filter);
  const { sites } = useSites();
  const { alerts: liveAlerts, isConnected } = useLiveSensors();

  // Track which alerts are being acted on
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  // Resolve notes modal state
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const siteNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const site of sites) {
      map[site.id] = site.name;
    }
    return map;
  }, [sites]);

  // Refetch when new live alerts come in
  const liveAlertCount = liveAlerts.length;
  useMemo(() => {
    if (liveAlertCount > 0) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAlertCount]);

  const handleAcknowledge = useCallback(async (alertId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPendingActions((prev) => new Set(prev).add(alertId));
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acknowledged" }),
      });
      if (res.ok) {
        refetch();
      }
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }, [refetch]);

  const handleResolve = useCallback(async (alertId: string, notes?: string) => {
    setPendingActions((prev) => new Set(prev).add(alertId));
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", notes: notes || undefined }),
      });
      if (res.ok) {
        refetch();
        setResolvingAlertId(null);
        setResolveNotes("");
      }
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }, [refetch]);

  const openResolveDialog = useCallback((alertId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResolvingAlertId(alertId);
    setResolveNotes("");
  }, []);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <Loader2 className="w-8 h-8 text-amber animate-spin" />
          <p className="text-sm text-[var(--nav-text-muted)]">Loading alerts...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Alerts"
          subtitle={`${criticalCount} critical · ${warningCount} warnings · ${totalCount} total`}
          accent="amber"
          actions={
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="flex items-center gap-1.5" data-testid="alerts-live-indicator">
                <Radio className={cn("w-3 h-3", isConnected ? "text-green animate-pulse" : "text-[var(--nav-text-muted)]")} />
                <span className={cn("text-[10px] uppercase tracking-wider font-medium", isConnected ? "text-green" : "text-[var(--nav-text-muted)]")}>
                  {isConnected ? "Live" : "Offline"}
                </span>
              </div>
              <div className="w-px h-4 bg-[var(--nav-border)]" />
              <div className="flex items-center gap-2">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "active", label: "Active" },
                    { key: "acknowledged", label: "Acknowledged" },
                    { key: "resolved", label: "Resolved" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    data-testid={`alerts-filter-${key}`}
                    aria-pressed={filter === key}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                      filter === key
                        ? "bg-amber/10 text-amber border-amber/20"
                        : "text-[var(--nav-text-muted)] border-[var(--nav-border)] hover:bg-[var(--nav-bg-hover)]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {/* Alert summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Critical",
              count: criticalCount,
              icon: AlertOctagon,
              color: "text-red",
              bg: "bg-red/10",
              border: "border-red/20",
            },
            {
              label: "Warnings",
              count: warningCount,
              icon: AlertTriangle,
              color: "text-amber",
              bg: "bg-amber/10",
              border: "border-amber/20",
            },
            {
              label: "Resolved Today",
              count: resolvedCount,
              icon: CheckCircle2,
              color: "text-green",
              bg: "bg-green/10",
              border: "border-green/20",
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              data-testid={`alerts-summary-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border",
                card.border,
                card.bg
              )}
            >
              <card.icon className={cn("w-6 h-6", card.color)} />
              <div>
                <p
                  className={cn(
                    "text-2xl font-bold font-mono",
                    card.color
                  )}
                >
                  {card.count}
                </p>
                <p className="text-[11px] text-[var(--nav-text-muted)] uppercase tracking-wider">
                  {card.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Alerts list */}
        <div data-testid="alerts-list" className="space-y-3">
          {filtered.length === 0 && (
            <div data-testid="alerts-empty-state" className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)] flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[var(--nav-text-muted)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--nav-text-secondary)]">
                  No alerts match this filter
                </p>
                <p className="text-xs text-[var(--nav-text-muted)] mt-1">
                  {filter === "all"
                    ? "There are no alerts in the system right now."
                    : `No ${filter} alerts found. Try a different filter.`}
                </p>
              </div>
            </div>
          )}
          {filtered.map((alert, i) => {
            const severity = severityConfig[alert.severity];
            const SeverityIcon = severity.icon;
            const isPending = pendingActions.has(alert.id);

            return (
              <Link
                key={alert.id}
                href={`/sites/${alert.siteId}?equipment=${alert.equipmentId}&alert=${alert.id}`}
              >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                data-testid={`alert-card-${alert.id}`}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border bg-[var(--nav-bg-secondary)]",
                  "hover:bg-[var(--nav-bg-tertiary)] transition-all cursor-pointer group",
                  severity.border,
                  alert.status === "active" && severity.glow
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    severity.bg,
                    severity.color
                  )}
                >
                  <SeverityIcon className="w-4.5 h-4.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 data-testid={`alert-card-${alert.id}-title`} className="text-sm font-semibold text-[var(--nav-text-primary)]">
                      {alert.title}
                    </h3>
                    <StatusBadge
                      status={
                        alert.status === "resolved"
                          ? "online"
                          : alert.status === "acknowledged"
                            ? "warning"
                            : alert.severity === "critical"
                              ? "critical"
                              : "warning"
                      }
                      label={alert.status}
                    />
                  </div>
                  <p className="text-xs text-[var(--nav-text-secondary)] leading-relaxed">
                    {alert.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-[var(--nav-text-muted)]">
                      <MapPin className="w-2.5 h-2.5" />
                      {siteNameMap[alert.siteId] || alert.siteId} — {alert.equipmentId}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--nav-text-muted)]">
                      <Clock className="w-2.5 h-2.5" />
                      {formatRelativeTime(alert.createdAt)}
                    </span>
                    {alert.assigneeId && (
                      <span className="text-[10px] text-cyan">
                        Assigned: {alert.assigneeId}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {alert.status !== "resolved" && (
                    <div className="flex items-center gap-2 mt-3">
                      {alert.status === "active" && (
                        <button
                          onClick={(e) => handleAcknowledge(alert.id, e)}
                          disabled={isPending}
                          data-testid={`alert-card-${alert.id}-acknowledge-btn`}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                            "bg-amber/5 text-amber border-amber/20 hover:bg-amber/15 hover:border-amber/40",
                            isPending && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          Acknowledge
                        </button>
                      )}
                      {(alert.status === "active" || alert.status === "acknowledged") && (
                        <button
                          onClick={(e) => openResolveDialog(alert.id, e)}
                          disabled={isPending}
                          data-testid={`alert-card-${alert.id}-resolve-btn`}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                            "bg-green/5 text-green border-green/20 hover:bg-green/15 hover:border-green/40",
                            isPending && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Resolve
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Action */}
                <ChevronRight className="w-4 h-4 text-[var(--nav-text-muted)] group-hover:text-[var(--nav-text-secondary)] transition-colors flex-shrink-0 mt-2" />
              </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Resolve dialog */}
      {resolvingAlertId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setResolvingAlertId(null)}
          data-testid="resolve-dialog-backdrop"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="resolve-dialog"
            role="dialog"
            aria-label="Resolve alert"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--nav-text-primary)]">
                Resolve Alert
              </h3>
              <button
                onClick={() => setResolvingAlertId(null)}
                className="p-1 rounded hover:bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)]"
                data-testid="resolve-dialog-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-[var(--nav-text-secondary)] mb-1.5">
                Resolution notes (optional)
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Describe the resolution..."
                rows={3}
                data-testid="resolve-dialog-notes"
                className="w-full px-3 py-2 rounded-lg border border-[var(--nav-border)] bg-[var(--nav-bg-primary)] text-sm text-[var(--nav-text-primary)] placeholder:text-[var(--nav-text-muted)] focus:outline-none focus:border-green/40 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setResolvingAlertId(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--nav-text-secondary)] border border-[var(--nav-border)] hover:bg-[var(--nav-bg-hover)] transition-colors"
                data-testid="resolve-dialog-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(resolvingAlertId, resolveNotes)}
                disabled={pendingActions.has(resolvingAlertId)}
                data-testid="resolve-dialog-confirm"
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border",
                  "bg-green/10 text-green border-green/20 hover:bg-green/20",
                  pendingActions.has(resolvingAlertId) && "opacity-50 cursor-not-allowed"
                )}
              >
                {pendingActions.has(resolvingAlertId) ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3" />
                )}
                Resolve Alert
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}
