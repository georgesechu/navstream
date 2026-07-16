"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LiveSensorValue } from "@/hooks/use-live-sensors";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/charts/sparkline";
import { SensorLineChart } from "@/components/charts/sensor-line-chart";
import {
  X,
  Cpu,
  Wrench,
  Thermometer,
  Video,
  BrainCircuit,
  AlertTriangle,
  Clock,
  Calendar,
  Info,
  Gauge,
  Activity,
  Zap,
  Droplets,
  Wind,
  CircuitBoard,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import type {
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
  Sensor,
  SensorReading,
  Alert,
  AlertSeverity,
  WorkOrder,
} from "@/types";

// API response shape from /api/equipment/[id]
interface EquipmentWithRelations extends Equipment {
  sensors: (Sensor & { readings: SensorReading[] })[];
  alerts: Alert[];
  workOrders: WorkOrder[];
}

// POI shape matching what site-detail uses
interface POIData {
  id: string;
  label: string;
  type: string;
  status: "online" | "warning" | "critical" | "offline";
  equipmentId?: string;
}

const categoryIcons: Record<string, typeof Cpu> = {
  pump: Droplets,
  generator: Zap,
  conveyor: Activity,
  compressor: Wind,
  hvac: Wind,
  transformer: Zap,
  motor: CircuitBoard,
  valve: Gauge,
  tank: Droplets,
  "sensor-array": Activity,
  network: CircuitBoard,
  other: Cpu,
};

const statusToVariant: Record<EquipmentStatus, "online" | "warning" | "critical" | "offline"> = {
  operational: "online",
  degraded: "warning",
  failed: "critical",
  maintenance: "warning",
  offline: "offline",
};

const severityConfig: Record<AlertSeverity, { color: string; icon: string }> = {
  critical: { color: "text-red", icon: "text-red" },
  warning: { color: "text-amber", icon: "text-amber" },
  info: { color: "text-cyan", icon: "text-cyan" },
};

function getSensorValueColor(
  value: number | null,
  thresholds: { warningHigh: number | null; criticalHigh: number | null; warningLow: number | null; criticalLow: number | null }
): "cyan" | "amber" | "magenta" {
  if (value === null) return "cyan";
  if (
    (thresholds.criticalHigh !== null && value >= thresholds.criticalHigh) ||
    (thresholds.criticalLow !== null && value <= thresholds.criticalLow)
  ) {
    return "magenta";
  }
  if (
    (thresholds.warningHigh !== null && value >= thresholds.warningHigh) ||
    (thresholds.warningLow !== null && value <= thresholds.warningLow)
  ) {
    return "amber";
  }
  return "cyan";
}

function getSensorSparklineAccent(
  value: number | null,
  thresholds: { warningHigh: number | null; criticalHigh: number | null; warningLow: number | null; criticalLow: number | null }
): "cyan" | "green" | "amber" | "magenta" {
  if (value === null) return "cyan";
  if (
    (thresholds.criticalHigh !== null && value >= thresholds.criticalHigh) ||
    (thresholds.criticalLow !== null && value <= thresholds.criticalLow)
  ) {
    return "magenta";
  }
  if (
    (thresholds.warningHigh !== null && value >= thresholds.warningHigh) ||
    (thresholds.warningLow !== null && value <= thresholds.warningLow)
  ) {
    return "amber";
  }
  return "green";
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function daysUntil(dateStr: string | null): { label: string; overdue: boolean } {
  if (!dateStr) return { label: "Not scheduled", overdue: false };
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d OVERDUE`, overdue: true };
  if (diffDays === 0) return { label: "Today", overdue: false };
  return { label: `${diffDays}d`, overdue: false };
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-[var(--nav-bg-tertiary)]",
        className
      )}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-10 h-10 rounded-lg" />
        <div className="flex flex-col gap-2 flex-1">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  );
}

function SimplePOIInfo({ poi }: { poi: POIData }) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center">
          <Info className="w-5 h-5 text-cyan" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--nav-text-primary)]">
            {poi.label}
          </h3>
          <p className="text-xs text-[var(--nav-text-muted)] capitalize">
            {poi.type}
          </p>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)]">
        <p className="text-xs text-[var(--nav-text-secondary)]">
          This point of interest is not linked to any equipment. Equipment
          linking is available through the POI management interface.
        </p>
      </div>
    </div>
  );
}

export function POIDetailPanel({
  poi,
  siteId,
  onClose,
  liveSensorValues,
}: {
  poi: POIData;
  siteId?: string;
  onClose: () => void;
  liveSensorValues?: Map<string, LiveSensorValue>;
}) {
  const [equipmentData, setEquipmentData] = useState<EquipmentWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poi.equipmentId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/equipment/${poi.equipmentId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch equipment data");
        return res.json();
      })
      .then((data: EquipmentWithRelations) => {
        if (!cancelled) setEquipmentData(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [poi.equipmentId]);

  const hasEquipment = !!poi.equipmentId;

  // Build query params for contextual navigation
  const contextParams = new URLSearchParams();
  if (poi.equipmentId) contextParams.set("equipment", poi.equipmentId);
  if (siteId) contextParams.set("site", siteId);
  const contextQuery = contextParams.toString();
  const contextSuffix = contextQuery ? `?${contextQuery}` : "";

  const CategoryIcon = equipmentData
    ? categoryIcons[equipmentData.category] || Cpu
    : Cpu;

  const activeAlerts = equipmentData
    ? equipmentData.alerts.filter((a) => a.status === "active")
    : [];

  const nextService = equipmentData
    ? daysUntil(equipmentData.nextServiceDate)
    : null;

  return (
    <motion.div
      data-testid="poi-detail-panel"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute top-0 right-0 bottom-0 w-[380px] max-w-full bg-[var(--nav-bg-secondary)] border-l border-[var(--nav-border)] z-30 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--nav-border)]">
        <div className="flex items-center gap-3 min-w-0">
          {hasEquipment && equipmentData && (
            <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-4.5 h-4.5 text-cyan" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--nav-text-primary)] truncate">
              {equipmentData?.name || poi.label}
            </h3>
            {equipmentData && (
              <div className="mt-1">
                <StatusBadge
                  status={statusToVariant[equipmentData.status]}
                  label={equipmentData.status.charAt(0).toUpperCase() + equipmentData.status.slice(1)}
                />
              </div>
            )}
          </div>
        </div>
        <button
          data-testid="poi-detail-panel-close"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--nav-bg-hover)] transition-colors flex-shrink-0"
          aria-label="Close detail panel"
        >
          <X className="w-4 h-4 text-[var(--nav-text-muted)]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && <LoadingSkeleton />}
        {error && (
          <div className="p-5">
            <div className="p-3 rounded-lg bg-red/5 border border-red/20">
              <p className="text-xs text-red">{error}</p>
            </div>
          </div>
        )}
        {!loading && !error && !hasEquipment && <SimplePOIInfo poi={poi} />}
        {!loading && !error && hasEquipment && equipmentData && (
          <div className="flex flex-col gap-0">
            {/* Sensors Section */}
            {equipmentData.sensors.length > 0 && (
              <SensorSection sensors={equipmentData.sensors} liveSensorValues={liveSensorValues} />
            )}

            {/* Active Alerts Section */}
            {activeAlerts.length > 0 && (
              <div className="p-4 border-b border-[var(--nav-border-subtle)]">
                <h4 className="text-[11px] font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-3">
                  Active Alerts ({activeAlerts.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {activeAlerts.map((alert) => {
                    const sevConfig = severityConfig[alert.severity];
                    return (
                      <Link
                        key={alert.id}
                        href="/alerts"
                        className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)] hover:bg-[var(--nav-bg-hover)] transition-colors"
                      >
                        <AlertTriangle
                          className={cn("w-3.5 h-3.5 flex-shrink-0", sevConfig.icon)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--nav-text-primary)] truncate">
                            {alert.title}
                          </p>
                          <p className="text-[10px] text-[var(--nav-text-muted)]">
                            {timeAgo(alert.createdAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase",
                            sevConfig.color
                          )}
                        >
                          {alert.severity}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Equipment Specs Section */}
            {equipmentData.specs && (
              <div className="p-4 border-b border-[var(--nav-border-subtle)]">
                <h4 className="text-[11px] font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-3">
                  Equipment Specs
                </h4>
                <div className="flex flex-col gap-1.5">
                  <SpecRow label="Manufacturer" value={equipmentData.specs.manufacturer} />
                  <SpecRow label="Model" value={equipmentData.specs.model} />
                  <SpecRow label="Serial Number" value={equipmentData.specs.serialNumber} />
                  <SpecRow
                    label="Install Date"
                    value={new Date(equipmentData.specs.installDate).toLocaleDateString()}
                  />
                  <SpecRow
                    label="Warranty"
                    value={
                      equipmentData.specs.warrantyExpiry
                        ? new Date(equipmentData.specs.warrantyExpiry) > new Date()
                          ? `Active (until ${new Date(equipmentData.specs.warrantyExpiry).toLocaleDateString()})`
                          : "Expired"
                        : "N/A"
                    }
                    valueClass={
                      equipmentData.specs.warrantyExpiry &&
                      new Date(equipmentData.specs.warrantyExpiry) < new Date()
                        ? "text-amber"
                        : undefined
                    }
                  />
                  {Object.entries(equipmentData.specs.specifications).map(
                    ([key, value]) => (
                      <SpecRow key={key} label={key} value={value} />
                    )
                  )}
                </div>
              </div>
            )}

            {/* Maintenance Section */}
            <div className="p-4 border-b border-[var(--nav-border-subtle)]">
              <h4 className="text-[11px] font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-3">
                Maintenance
              </h4>
              <div className="flex flex-col gap-2">
                {/* Next service */}
                {nextService && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[var(--nav-text-muted)]" />
                      <span className="text-xs text-[var(--nav-text-secondary)]">
                        Next Service
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-mono font-semibold",
                        nextService.overdue ? "text-red" : "text-green"
                      )}
                    >
                      {nextService.label}
                    </span>
                  </div>
                )}
                {/* Last service */}
                {equipmentData.lastServiceDate && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[var(--nav-text-muted)]" />
                      <span className="text-xs text-[var(--nav-text-secondary)]">
                        Last Service
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
                      {new Date(equipmentData.lastServiceDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {/* Recent history entries */}
                {equipmentData.maintenanceHistory.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[10px] text-[var(--nav-text-muted)] mb-1.5">
                      Recent History
                    </p>
                    {equipmentData.maintenanceHistory.slice(0, 3).map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 py-1.5 border-b border-[var(--nav-border-subtle)] last:border-0"
                      >
                        <Wrench className="w-3 h-3 text-[var(--nav-text-muted)] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--nav-text-secondary)] truncate">
                            {entry.description}
                          </p>
                          <p className="text-[10px] text-[var(--nav-text-muted)]">
                            {new Date(entry.date).toLocaleDateString()} &middot;{" "}
                            {entry.technician}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Section */}
            <div className="p-4">
              <h4 className="text-[11px] font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-3">
                Actions
              </h4>
              <div className="flex flex-col gap-2">
                <ActionLink
                  href={`/imaging${contextSuffix}`}
                  icon={Thermometer}
                  label="View Thermal"
                  accent="amber"
                />
                <ActionLink
                  href={`/comms${contextSuffix}`}
                  icon={Video}
                  label="Start Call"
                  accent="green"
                />
                <ActionLink
                  href={`/ai${contextSuffix}`}
                  icon={BrainCircuit}
                  label="Create Work Order"
                  accent="magenta"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Small component that flashes when a live value changes.
 */
function LiveValue({
  value,
  unit,
  colorClass,
  isLive,
}: {
  value: number | null;
  unit: string;
  colorClass: string;
  isLive: boolean;
}) {
  const prevValueRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevValueRef.current !== value && value !== null) {
      setFlash(true);
      const timeout = setTimeout(() => setFlash(false), 600);
      prevValueRef.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "text-sm font-mono font-semibold transition-all duration-300",
          colorClass,
          flash && "scale-110 brightness-150"
        )}
        style={flash ? { textShadow: "0 0 8px currentColor" } : undefined}
      >
        {value !== null ? `${value}${unit}` : "N/A"}
      </span>
      {isLive && (
        <span
          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-green/10 text-green border border-green/20"
          data-testid="sensor-live-badge"
        >
          <span className="w-1 h-1 rounded-full bg-green animate-pulse" />
          Live
        </span>
      )}
    </span>
  );
}

function SensorSection({
  sensors,
  liveSensorValues,
}: {
  sensors: (Sensor & { readings: SensorReading[] })[];
  liveSensorValues?: Map<string, LiveSensorValue>;
}) {
  const [expandedSensor, setExpandedSensor] = useState<string | null>(null);

  return (
    <div className="p-4 border-b border-[var(--nav-border-subtle)]">
      <h4 className="text-[11px] font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-3">
        Sensors
      </h4>
      <div className="flex flex-col gap-2.5">
        {sensors.map((sensor) => {
          // Use live value if available, otherwise fall back to static currentValue
          const liveValue = liveSensorValues?.get(sensor.id);
          const displayValue = liveValue ? liveValue.value : sensor.currentValue;
          const hasLiveData = !!liveValue;

          const valueColor = getSensorValueColor(
            displayValue,
            sensor.thresholds
          );
          const sparklineAccent = getSensorSparklineAccent(
            displayValue,
            sensor.thresholds
          );
          const readingValues = sensor.readings
            .slice()
            .reverse()
            .map((r) => r.value);

          const valueColorClass =
            valueColor === "magenta"
              ? "text-red"
              : valueColor === "amber"
                ? "text-amber"
                : "text-green";

          const isExpanded = expandedSensor === sensor.id;
          const hasReadings = sensor.readings.length >= 2;

          // Build chart data from readings (chronological order)
          const chartData = sensor.readings
            .slice()
            .reverse()
            .map((r) => ({
              timestamp: r.timestamp,
              value: r.value,
            }));

          const chartThresholds = {
            warningHigh: sensor.thresholds.warningHigh ?? undefined,
            criticalHigh: sensor.thresholds.criticalHigh ?? undefined,
          };

          const chartAccent =
            sparklineAccent === "magenta"
              ? "magenta"
              : sparklineAccent === "amber"
                ? "amber"
                : "green";

          return (
            <div
              key={sensor.id}
              data-testid={`poi-detail-sensor-${sensor.id}`}
              className="rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedSensor(isExpanded ? null : sensor.id)
                }
                className="w-full p-2.5 text-left"
                aria-expanded={isExpanded}
                data-testid={`poi-detail-sensor-${sensor.id}-toggle`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--nav-text-secondary)]">
                      {sensor.name}
                    </span>
                    {hasReadings && (
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 text-[var(--nav-text-muted)] transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    )}
                  </div>
                  <LiveValue
                    value={displayValue}
                    unit={sensor.unit}
                    colorClass={valueColorClass}
                    isLive={hasLiveData}
                  />
                </div>
                {readingValues.length >= 2 && !isExpanded && (
                  <Sparkline
                    data={readingValues}
                    width={320}
                    height={32}
                    accent={sparklineAccent}
                  />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && hasReadings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-[var(--nav-border-subtle)]"
                  >
                    <div className="p-2.5">
                      <SensorLineChart
                        data={chartData}
                        unit={sensor.unit}
                        label={sensor.name}
                        sensorId={sensor.id}
                        thresholds={chartThresholds}
                        width={340}
                        height={180}
                        accent={chartAccent}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpecRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-[var(--nav-text-muted)]">{label}</span>
      <span
        className={cn(
          "text-[11px] font-mono text-[var(--nav-text-secondary)]",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
  accent,
}: {
  href: string;
  icon: typeof Thermometer;
  label: string;
  accent: "amber" | "green" | "magenta";
}) {
  const accentStyles: Record<string, string> = {
    amber: "border-amber/20 hover:border-amber/40 text-amber bg-amber/5 hover:bg-amber/10",
    green: "border-green/20 hover:border-green/40 text-green bg-green/5 hover:bg-green/10",
    magenta: "border-magenta/20 hover:border-magenta/40 text-magenta bg-magenta/5 hover:bg-magenta/10",
  };

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-200",
        accentStyles[accent]
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
