"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSiteDetail } from "@/hooks/use-site-detail";
import { useLiveSensors } from "@/hooks/use-live-sensors";
import type { LiveSensorValue } from "@/hooks/use-live-sensors";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Cpu,
  Thermometer,
  Radio,
  Video,
  MapPin,
  Users,
  Activity,
  AlertTriangle,
  Wrench,
  Eye,
  Wifi,
  BrainCircuit,
  Plus,
  X,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { POIDetailPanel } from "./poi-detail-panel";

const statusConfig = {
  online: { color: "bg-green", label: "Online", textColor: "text-green" },
  warning: { color: "bg-amber", label: "Warning", textColor: "text-amber" },
  critical: { color: "bg-red", label: "Critical", textColor: "text-red" },
  offline: {
    color: "bg-[var(--nav-text-muted)]",
    label: "Offline",
    textColor: "text-[var(--nav-text-muted)]",
  },
};

const poiTypeIcons: Record<string, LucideIcon> = {
  equipment: Cpu,
  camera: Camera,
  sensor: Thermometer,
  network: Wifi,
  zone: MapPin,
  "access-point": Wifi,
};

const poiTypeColors: Record<string, string> = {
  equipment: "border-cyan/40 bg-cyan/10 text-cyan",
  camera: "border-magenta/40 bg-magenta/10 text-magenta",
  sensor: "border-amber/40 bg-amber/10 text-amber",
  network: "border-green/40 bg-green/10 text-green",
  zone: "border-cyan/40 bg-cyan/10 text-cyan",
  "access-point": "border-green/40 bg-green/10 text-green",
};

const POI_TYPE_OPTIONS = [
  { value: "equipment", label: "Equipment" },
  { value: "camera", label: "Camera" },
  { value: "sensor", label: "Sensor" },
  { value: "network", label: "Network" },
  { value: "zone", label: "Zone" },
  { value: "access-point", label: "Access Point" },
];

function QuickActionCard({
  icon: Icon,
  label,
  description,
  accent,
  delay,
  href,
  "data-testid": testId,
}: {
  icon: typeof Camera;
  label: string;
  description: string;
  accent: string;
  delay: number;
  href?: string;
  "data-testid"?: string;
}) {
  const accentStyles: Record<string, string> = {
    cyan: "border-cyan/20 hover:border-cyan/40 hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]",
    magenta:
      "border-magenta/20 hover:border-magenta/40 hover:shadow-[0_0_20px_rgba(224,64,251,0.1)]",
    amber:
      "border-amber/20 hover:border-amber/40 hover:shadow-[0_0_20px_rgba(255,171,0,0.1)]",
    green:
      "border-green/20 hover:border-green/40 hover:shadow-[0_0_20px_rgba(0,230,118,0.1)]",
  };

  const iconStyles: Record<string, string> = {
    cyan: "text-cyan bg-cyan/10",
    magenta: "text-magenta bg-magenta/10",
    amber: "text-amber bg-amber/10",
    green: "text-green bg-green/10",
  };

  const content = (
    <>
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          iconStyles[accent]
        )}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--nav-text-primary)]">
          {label}
        </p>
        <p className="text-[11px] text-[var(--nav-text-muted)]">
          {description}
        </p>
      </div>
    </>
  );

  const sharedClassName = cn(
    "flex items-center gap-3 p-3 rounded-xl border bg-[var(--nav-bg-secondary)]",
    "hover:bg-[var(--nav-bg-tertiary)] transition-all duration-300 cursor-pointer text-left",
    accentStyles[accent]
  );

  if (href) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
      >
        <Link
          href={href}
          data-testid={testId}
          className={sharedClassName}
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      data-testid={testId}
      className={sharedClassName}
    >
      {content}
    </motion.button>
  );
}

const severityColorMap: Record<string, string> = {
  critical: "text-red",
  warning: "text-amber",
  info: "text-cyan",
};

const fallbackActivity = [
  { text: "Thermal scan completed", time: "2 min ago", color: "text-amber" },
  { text: "Pump Station alert triggered", time: "15 min ago", color: "text-red" },
  { text: "Technician checked in", time: "1 hr ago", color: "text-green" },
  { text: "360\u00B0 capture uploaded", time: "3 hrs ago", color: "text-magenta" },
];

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

interface ActivityAlert {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
}

function RecentActivityFeed({ siteId, alerts }: { siteId: string; alerts: ActivityAlert[] }) {
  const activityItems = useMemo(() => {
    if (!alerts || alerts.length === 0) {
      return fallbackActivity;
    }

    // Sort by createdAt descending, take 5 most recent
    const sorted = [...alerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return sorted.slice(0, 5).map((alert) => ({
      text: alert.title,
      time: formatRelativeTime(alert.createdAt),
      color: severityColorMap[alert.severity] ?? "text-cyan",
    }));
  }, [alerts]);

  return (
    <div className="mt-2" data-testid="site-activity-feed">
      <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1 mb-3">
        Recent Activity
      </h2>
      <div className="flex flex-col gap-2">
        {activityItems.map((event, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)]"
          >
            <span className="text-xs text-[var(--nav-text-secondary)]">
              {event.text}
            </span>
            <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
              {event.time}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

type SelectedPOI = {
  id: string;
  label: string;
  type: string;
  status: "online" | "warning" | "critical" | "offline";
  equipmentId?: string;
};

export function SiteDetailView({
  siteId,
  highlightEquipmentId,
  highlightAlertId,
}: {
  siteId: string;
  highlightEquipmentId?: string;
  highlightAlertId?: string;
}) {
  const { site, pois: apiPois, alerts: siteAlerts, isLoading, refetch } = useSiteDetail(siteId);
  const { sensorValues: liveSensorValues, alerts: liveAlerts, isConnected: isLiveConnected } = useLiveSensors(siteId);
  const [selectedPoi, setSelectedPoi] = useState<SelectedPOI | null>(null);
  const [addPoiMode, setAddPoiMode] = useState(false);
  const [pendingPoi, setPendingPoi] = useState<{ x: number; y: number } | null>(null);
  const [poiFormLabel, setPoiFormLabel] = useState("");
  const [poiFormType, setPoiFormType] = useState("equipment");
  const [poiSaving, setPoiSaving] = useState(false);
  const [deletingPoiId, setDeletingPoiId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!addPoiMode || !canvasRef.current) return;
      // Don't place POI if clicking on an existing POI marker
      const target = e.target as HTMLElement;
      if (target.closest("[data-poi-marker]")) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingPoi({ x, y });
      setPoiFormLabel("");
      setPoiFormType("equipment");
    },
    [addPoiMode]
  );

  const handleSavePoi = useCallback(async () => {
    if (!pendingPoi || !poiFormLabel.trim()) return;
    setPoiSaving(true);
    try {
      const res = await fetch("/api/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          label: poiFormLabel.trim(),
          type: poiFormType,
          x: pendingPoi.x,
          y: pendingPoi.y,
        }),
      });
      if (!res.ok) throw new Error("Failed to save POI");
      setPendingPoi(null);
      setAddPoiMode(false);
      refetch();
    } catch {
      // Error handling — keep form open
    } finally {
      setPoiSaving(false);
    }
  }, [pendingPoi, poiFormLabel, poiFormType, siteId, refetch]);

  const handleDeletePoi = useCallback(
    async (poiId: string) => {
      setDeletingPoiId(poiId);
      try {
        const res = await fetch(`/api/pois/${poiId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete POI");
        if (selectedPoi?.id === poiId) setSelectedPoi(null);
        refetch();
      } catch {
        // Error handling
      } finally {
        setDeletingPoiId(null);
      }
    },
    [selectedPoi, refetch]
  );

  // Derive live POI statuses from sensor values.
  // If a sensor linked to a POI's equipment has crossed a threshold via a live alert,
  // the POI status should reflect the worst severity.
  const liveEquipmentStatus = useMemo(() => {
    const statusMap = new Map<string, "online" | "warning" | "critical">();

    // Check live alerts for equipment severity
    for (const alert of liveAlerts) {
      const current = statusMap.get(alert.equipmentId);
      if (alert.severity === "critical") {
        statusMap.set(alert.equipmentId, "critical");
      } else if (alert.severity === "warning" && current !== "critical") {
        statusMap.set(alert.equipmentId, "warning");
      }
    }

    // Also check latest sensor values against any threshold info we can infer
    // from the live sensor data — alerts already cover threshold crossings
    return statusMap;
  }, [liveAlerts]);

  // Map API POIs to the shape used for rendering
  const pois = useMemo(
    () =>
      apiPois.map((p) => {
        const baseStatus = (p.status ?? "online") as "online" | "warning" | "critical" | "offline";
        // Override with live status if available (only escalate, never downgrade)
        let finalStatus = baseStatus;
        if (p.equipmentId) {
          const liveStatus = liveEquipmentStatus.get(p.equipmentId);
          if (liveStatus === "critical") {
            finalStatus = "critical";
          } else if (liveStatus === "warning" && finalStatus !== "critical") {
            finalStatus = "warning";
          }
        }
        return {
          id: p.id,
          label: p.label,
          type: p.type,
          icon: poiTypeIcons[p.type] ?? MapPin,
          x: p.x,
          y: p.y,
          status: finalStatus,
          equipmentId: p.equipmentId ?? undefined,
        };
      }),
    [apiPois, liveEquipmentStatus]
  );

  // Auto-open POI detail panel when navigating with equipment context
  useEffect(() => {
    if (highlightEquipmentId && pois.length > 0) {
      const matchingPoi = pois.find(
        (p) => p.equipmentId === highlightEquipmentId
      );
      if (matchingPoi) {
        setSelectedPoi({
          id: matchingPoi.id,
          label: matchingPoi.label,
          type: matchingPoi.type,
          status: matchingPoi.status,
          equipmentId: matchingPoi.equipmentId,
        });
      }
    }
  }, [highlightEquipmentId, pois]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--nav-bg-tertiary)] animate-pulse" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-48 rounded bg-[var(--nav-bg-tertiary)] animate-pulse" />
            <div className="h-4 w-32 rounded bg-[var(--nav-bg-tertiary)] animate-pulse" />
          </div>
        </div>
        {/* Canvas skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] min-h-[500px] animate-pulse" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--nav-bg-tertiary)] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <p className="text-[var(--nav-text-muted)]">Site not found</p>
      </div>
    );
  }

  const status = statusConfig[site.status];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-[var(--nav-bg-hover)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--nav-text-secondary)]" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  status.color,
                  site.status === "online" && "status-online"
                )}
              />
              <h1 className="text-xl font-semibold text-[var(--nav-text-primary)]">
                {site.name}
              </h1>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full border",
                  status.textColor,
                  `border-current/20`
                )}
              >
                {status.label}
              </span>
            </div>
            <p className="text-sm text-[var(--nav-text-muted)] mt-1 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {site.type} &middot; {site.lat.toFixed(4)}°,{" "}
              {site.lng.toFixed(4)}°
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)]">
            <div className="flex items-center gap-1.5">
              <Activity className={cn("w-3.5 h-3.5", status.textColor)} />
              <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
                {site.uptime}%
              </span>
            </div>
            <div className="w-px h-4 bg-[var(--nav-border)]" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-dim" />
              <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
                {site.personnelCount}
              </span>
            </div>
            {site.activeAlerts > 0 && (
              <>
                <div className="w-px h-4 bg-[var(--nav-border)]" />
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber" />
                  <span className="text-xs font-mono text-amber">
                    {site.activeAlerts}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Site Canvas — floor plan with POIs */}
        <div
          data-testid="site-canvas"
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={cn(
            "xl:col-span-2 relative rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] overflow-hidden min-h-[500px]",
            addPoiMode && "cursor-crosshair"
          )}
        >
          {/* Floor plan */}
          {site?.floorPlanUrl ? (
            <img
              src={site.floorPlanUrl}
              alt={`${site.name} floor plan`}
              data-testid="floor-plan"
              className="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none"
            />
          ) : (
            <>
              <div className="absolute inset-0 grid-pattern opacity-50" />
              <div className="absolute inset-8 border border-dashed border-[var(--nav-border)] rounded-lg" />
              <div className="absolute left-8 top-8 right-[40%] bottom-[50%] border-r border-b border-dashed border-[var(--nav-border)]" />
              <div className="absolute left-[35%] top-[50%] right-8 bottom-8 border-l border-t border-dashed border-[var(--nav-border)]" />
            </>
          )}

          {/* POI markers */}
          {pois.map((poi, i) => {
            const typeColor =
              poiTypeColors[poi.type] ?? poiTypeColors.equipment;
            const poiStatus = statusConfig[poi.status];
            const isHighlighted = highlightEquipmentId !== undefined && poi.equipmentId === highlightEquipmentId;

            return (
              <motion.div
                key={poi.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isHighlighted ? 1.15 : 1, opacity: 1 }}
                transition={{
                  delay: 0.3 + i * 0.1,
                  type: "spring",
                  stiffness: 200,
                }}
                data-testid={`site-canvas-poi-${poi.id}`}
                data-poi-marker
                className={cn("absolute group cursor-pointer", isHighlighted && "z-10")}
                style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!addPoiMode) {
                    setSelectedPoi({
                      id: poi.id,
                      label: poi.label,
                      type: poi.type,
                      status: poi.status,
                      equipmentId: poi.equipmentId,
                    });
                  }
                }}
              >
                {/* Marker */}
                <div
                  className={cn(
                    "relative w-9 h-9 -ml-4.5 -mt-4.5 rounded-lg border flex items-center justify-center",
                    "transition-all duration-200 hover:scale-110",
                    typeColor,
                    isHighlighted && "ring-2 ring-cyan ring-offset-1 ring-offset-[var(--nav-bg-secondary)] shadow-[0_0_16px_rgba(0,229,255,0.3)]"
                  )}
                >
                  <poi.icon className="w-4 h-4" />
                  {/* Status dot */}
                  <div
                    className={cn(
                      "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-[var(--nav-bg-secondary)]",
                      poiStatus.color
                    )}
                  />
                  {/* Delete button on hover */}
                  <button
                    data-testid={`site-canvas-poi-${poi.id}-delete`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePoi(poi.id);
                    }}
                    disabled={deletingPoiId === poi.id}
                    className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-red/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red z-10"
                    aria-label={`Delete ${poi.label}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-[var(--nav-bg-elevated)] border border-[var(--nav-border)] shadow-[var(--nav-shadow-md)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                  <p className="text-xs font-medium text-[var(--nav-text-primary)]">
                    {poi.label}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-0.5",
                      poiStatus.textColor
                    )}
                  >
                    {poiStatus.label}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* Pending POI marker + inline form */}
          {pendingPoi && (
            <div
              className="absolute z-30"
              style={{ left: `${pendingPoi.x}%`, top: `${pendingPoi.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Marker preview */}
              <div className="w-9 h-9 -ml-4.5 -mt-4.5 rounded-lg border border-cyan/60 bg-cyan/20 flex items-center justify-center animate-pulse">
                <Plus className="w-4 h-4 text-cyan" />
              </div>
              {/* Inline form */}
              <div
                data-testid="poi-add-form"
                className="absolute top-4 left-4 p-3 rounded-lg bg-[var(--nav-bg-elevated)] border border-[var(--nav-border)] shadow-lg min-w-[200px]"
              >
                <div className="flex flex-col gap-2">
                  <input
                    data-testid="poi-add-form-label"
                    type="text"
                    placeholder="POI label..."
                    value={poiFormLabel}
                    onChange={(e) => setPoiFormLabel(e.target.value)}
                    autoFocus
                    className="w-full px-2 py-1.5 rounded text-xs bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)] text-[var(--nav-text-primary)] placeholder:text-[var(--nav-text-muted)] outline-none focus:border-cyan/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && poiFormLabel.trim()) handleSavePoi();
                      if (e.key === "Escape") setPendingPoi(null);
                    }}
                  />
                  <select
                    data-testid="poi-add-form-type"
                    value={poiFormType}
                    onChange={(e) => setPoiFormType(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-xs bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)] text-[var(--nav-text-primary)] outline-none focus:border-cyan/50"
                  >
                    {POI_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <button
                      data-testid="poi-add-form-save"
                      onClick={handleSavePoi}
                      disabled={poiSaving || !poiFormLabel.trim()}
                      className="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {poiSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      data-testid="poi-add-form-cancel"
                      onClick={() => setPendingPoi(null)}
                      className="px-2 py-1.5 rounded text-xs text-[var(--nav-text-muted)] hover:bg-[var(--nav-bg-hover)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backdrop overlay when panel is open */}
          <AnimatePresence>
            {selectedPoi && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/40 z-20"
                onClick={() => setSelectedPoi(null)}
              />
            )}
          </AnimatePresence>

          {/* POI Detail Panel */}
          <AnimatePresence>
            {selectedPoi && (
              <POIDetailPanel
                key={selectedPoi.id}
                poi={selectedPoi}
                siteId={siteId}
                onClose={() => setSelectedPoi(null)}
                liveSensorValues={liveSensorValues}
              />
            )}
          </AnimatePresence>

          {/* Corner label + Live indicator + Add POI button */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)]">
              <Eye className="w-3 h-3 text-cyan" />
              <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
                SITE CANVAS
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)]"
              data-testid="site-canvas-live-indicator"
            >
              <Radio className={cn("w-3 h-3", isLiveConnected ? "text-green animate-pulse" : "text-[var(--nav-text-muted)]")} />
              <span className={cn("text-[10px] font-mono uppercase tracking-wider font-medium", isLiveConnected ? "text-green" : "text-[var(--nav-text-muted)]")}>
                {isLiveConnected ? "Live" : "Offline"}
              </span>
            </div>
            <button
              data-testid="site-canvas-add-poi-btn"
              onClick={(e) => {
                e.stopPropagation();
                setAddPoiMode(!addPoiMode);
                setPendingPoi(null);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded backdrop-blur-sm border transition-colors text-[10px] font-mono",
                addPoiMode
                  ? "bg-cyan/20 border-cyan/40 text-cyan"
                  : "bg-[var(--nav-bg-primary)]/80 border-[var(--nav-border)] text-[var(--nav-text-muted)] hover:border-cyan/30 hover:text-cyan"
              )}
              aria-pressed={addPoiMode}
            >
              {addPoiMode ? (
                <>
                  <X className="w-3 h-3" />
                  CANCEL
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  ADD POI
                </>
              )}
            </button>
          </div>

          {/* POI count */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)] z-10">
            <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
              {pois.length} POIs
            </span>
          </div>
        </div>

        {/* Right panel — Quick actions + info */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1">
            Quick Actions
          </h2>

          <QuickActionCard
            icon={Camera}
            label="360° Walkthrough"
            description="View immersive panoramas"
            accent="magenta"
            delay={0.1}
            href={`/viewer?site=${siteId}`}
            data-testid="quick-action-walkthrough"
          />
          <QuickActionCard
            icon={Video}
            label="Start Live Call"
            description="Connect with on-site personnel"
            accent="green"
            delay={0.15}
            href={`/comms?site=${siteId}`}
            data-testid="quick-action-call"
          />
          <QuickActionCard
            icon={Thermometer}
            label="Thermal Imaging"
            description="View IR / thermal overlays"
            accent="amber"
            delay={0.2}
            href={`/imaging?site=${siteId}`}
            data-testid="quick-action-thermal"
          />
          <QuickActionCard
            icon={Radio}
            label="Live Sensor Feed"
            description="Real-time equipment telemetry"
            accent="cyan"
            delay={0.25}
            href={`/feeds?site=${siteId}`}
            data-testid="quick-action-sensors"
          />
          <QuickActionCard
            icon={BrainCircuit}
            label="AI Diagnostics"
            description="Run AI-assisted analysis"
            accent="magenta"
            delay={0.3}
            href={`/ai?site=${siteId}`}
            data-testid="quick-action-ai"
          />

          {/* Recent activity */}
          <RecentActivityFeed siteId={siteId} alerts={siteAlerts} />
        </div>
      </div>
    </div>
  );
}
