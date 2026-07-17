"use client";

import { type Site } from "@/stores/app-store";
import { useSites } from "@/hooks/use-sites";
import { useLiveSensors } from "@/hooks/use-live-sensors";
import { WorldMap } from "./world-map";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Zap,
  Radio,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const statusConfig = {
  online: {
    color: "bg-green",
    glow: "shadow-[0_0_12px_rgba(0,230,118,0.4)]",
    ring: "ring-green/30",
    label: "Online",
    textColor: "text-green",
  },
  warning: {
    color: "bg-amber",
    glow: "shadow-[0_0_12px_rgba(255,171,0,0.4)]",
    ring: "ring-amber/30",
    label: "Warning",
    textColor: "text-amber",
  },
  critical: {
    color: "bg-red",
    glow: "shadow-[0_0_12px_rgba(255,23,68,0.4)]",
    ring: "ring-red/30",
    label: "Critical",
    textColor: "text-red",
  },
  offline: {
    color: "bg-[var(--nav-text-muted)]",
    glow: "",
    ring: "ring-[var(--nav-text-muted)]/20",
    label: "Offline",
    textColor: "text-[var(--nav-text-muted)]",
  },
};

function SiteCard({ site, index, liveAlertCount }: { site: Site; index: number; liveAlertCount?: number }) {
  const [hovered, setHovered] = useState(false);
  // Override status if live alerts indicate worse condition
  const effectiveStatus = liveAlertCount !== undefined && liveAlertCount > 0
    ? (site.status === "critical" ? "critical" : "warning")
    : site.status;
  const status = statusConfig[effectiveStatus];
  const displayAlerts = liveAlertCount !== undefined ? liveAlertCount : site.activeAlerts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
    >
      <Link href={`/sites/${site.id}`}>
        <div
          data-testid={`site-card-${site.id}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            "relative group rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)]",
            "p-4 cursor-pointer transition-all duration-300",
            "hover:border-[var(--nav-bg-hover)] hover:bg-[var(--nav-bg-tertiary)]",
            "hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
          )}
        >
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors duration-500",
                  status.color,
                  status.glow,
                  effectiveStatus === "online" && "status-online",
                  effectiveStatus === "critical" && "animate-pulse"
                )}
              />
              <div>
                <h3 className="text-sm font-semibold text-[var(--nav-text-primary)] group-hover:text-cyan transition-colors">
                  {site.name}
                </h3>
                <p className="text-[11px] text-[var(--nav-text-muted)] mt-0.5">
                  {site.type} &middot; {site.lat.toFixed(2)}°,{" "}
                  {site.lng.toFixed(2)}°
                </p>
              </div>
            </div>
            <ArrowUpRight
              className={cn(
                "w-4 h-4 text-[var(--nav-text-muted)] transition-all",
                "group-hover:text-cyan group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              )}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <Activity className={cn("w-3.5 h-3.5", status.textColor)} />
              <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
                {site.uptime}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-dim" />
              <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
                {site.personnelCount}
              </span>
            </div>
            {displayAlerts > 0 && (
              <motion.div
                key={displayAlerts}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-1.5"
              >
                <AlertTriangle className={cn("w-3.5 h-3.5", effectiveStatus === "critical" ? "text-red" : "text-amber")} />
                <span className={cn("text-xs font-mono", effectiveStatus === "critical" ? "text-red" : "text-amber")}>
                  {displayAlerts}
                </span>
              </motion.div>
            )}
          </div>

          {/* Hover glow border effect */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-xl ring-1 ring-inset ring-cyan/20 pointer-events-none"
              />
            )}
          </AnimatePresence>
        </div>
      </Link>
    </motion.div>
  );
}

function StatsBar({ sites, liveAlertCount }: { sites: Site[]; liveAlertCount?: number }) {

  const online = sites.filter((s) => s.status === "online").length;
  const warning = sites.filter((s) => s.status === "warning").length;
  const critical = sites.filter((s) => s.status === "critical").length;
  const totalPersonnel = sites.reduce((a, s) => a + s.personnelCount, 0);
  const totalAlerts = liveAlertCount ?? sites.reduce((a, s) => a + s.activeAlerts, 0);
  const avgUptime =
    sites.length > 0
      ? (sites.reduce((a, s) => a + s.uptime, 0) / sites.length).toFixed(1)
      : "0";

  const stats = [
    {
      label: "Total Sites",
      value: sites.length,
      icon: MapPin,
      color: "text-cyan",
    },
    { label: "Online", value: online, icon: Zap, color: "text-green" },
    {
      label: "Warnings",
      value: warning,
      icon: AlertTriangle,
      color: "text-amber",
    },
    {
      label: "Active Alerts",
      value: totalAlerts,
      icon: AlertTriangle,
      color: totalAlerts > 0 ? "text-red" : "text-cyan-dim",
    },
    {
      label: "Personnel",
      value: totalPersonnel,
      icon: Users,
      color: "text-cyan-dim",
    },
    {
      label: "Avg Uptime",
      value: `${avgUptime}%`,
      icon: Activity,
      color: "text-green",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          data-testid={`command-map-stats-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
          className="flex items-center gap-3 rounded-lg border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] px-3 py-2.5"
        >
          <stat.icon className={cn("w-4 h-4", stat.color)} />
          <div>
            <motion.p
              key={`${stat.label}-${stat.value}`}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.3 }}
              className="text-lg font-semibold font-mono text-[var(--nav-text-primary)] leading-none"
            >
              {stat.value}
            </motion.p>
            <p className="text-[10px] text-[var(--nav-text-muted)] uppercase tracking-wider mt-0.5">
              {stat.label}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

interface OnlineDevice {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  status: string;
  batteryLevel: number | null;
}

function useOnlineDevices(pollIntervalMs = 5000) {
  const [devices, setDevices] = useState<OnlineDevice[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices");
      if (res.ok) {
        const data: OnlineDevice[] = await res.json();
        // Only include devices with GPS that are online
        setDevices(
          data.filter(
            (d) => d.status === "online" && d.lat != null && d.lng != null
          )
        );
      }
    } catch {
      // Silently fail — will retry next poll
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    pollRef.current = setInterval(fetchDevices, pollIntervalMs);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchDevices, pollIntervalMs]);

  return devices;
}

export function CommandMap() {
  const { sites, isLoading } = useSites();
  const { alerts: liveAlerts, isConnected: isLiveConnected } = useLiveSensors();
  const router = useRouter();
  const onlineDevices = useOnlineDevices(5000);

  // Compute per-site live alert counts from SSE alerts
  const siteAlertCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of liveAlerts) {
      counts.set(alert.siteId, (counts.get(alert.siteId) ?? 0) + 1);
    }
    return counts;
  }, [liveAlerts]);

  const totalLiveAlerts = liveAlerts.length;

  // Override site statuses with live alert data
  const liveSites = useMemo(() => {
    return sites.map((site) => {
      const liveCount = siteAlertCounts.get(site.id) ?? 0;
      if (liveCount === 0) return site;
      // Check if any live alert for this site is critical
      const hasCritical = liveAlerts.some(
        (a) => a.siteId === site.id && a.severity === "critical"
      );
      const newStatus = hasCritical ? "critical" : "warning";
      // Only escalate, never downgrade
      if (site.status === "critical") return site;
      if (site.status === "warning" && newStatus !== "critical") return site;
      return { ...site, status: newStatus as Site["status"] };
    });
  }, [sites, siteAlertCounts, liveAlerts]);

  if (isLoading) {
    return (
      <div data-testid="command-map" className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <Loader2 className="w-8 h-8 text-cyan animate-spin" />
        <p className="text-sm text-[var(--nav-text-muted)]">Loading sites...</p>
      </div>
    );
  }

  return (
    <div data-testid="command-map" className="flex flex-col gap-6 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--nav-text-primary)] flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
            Command Map
          </h1>
          <p className="text-sm text-[var(--nav-text-muted)] mt-1">
            Global facility overview &middot; Real-time monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live connection indicator */}
          <div
            data-testid="command-map-live-indicator"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)]"
          >
            <Radio className={cn("w-3.5 h-3.5", isLiveConnected ? "text-green animate-pulse" : "text-[var(--nav-text-muted)]")} />
            <span className={cn("text-[10px] font-mono uppercase tracking-wider font-medium", isLiveConnected ? "text-green" : "text-[var(--nav-text-muted)]")}>
              {isLiveConnected ? "Live" : "Offline"}
            </span>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-cyan/10 text-cyan text-xs font-medium border border-cyan/20 hover:bg-cyan/20 transition-colors">
            + Add Site
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar sites={liveSites} liveAlertCount={totalLiveAlerts > 0 ? totalLiveAlerts : undefined} />

      {/* Map placeholder + site grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        {/* Map area */}
        <div data-testid="command-map-viewport" className="xl:col-span-2 relative rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] overflow-hidden min-h-[400px]">
          {/* Interactive world map */}
          <WorldMap
            sites={liveSites}
            devices={onlineDevices.map((d) => ({
              id: d.id,
              name: d.name,
              lat: d.lat!,
              lng: d.lng!,
              status: d.status,
              batteryLevel: d.batteryLevel,
            }))}
            onSiteClick={(siteId) => router.push(`/sites/${siteId}`)}
            className="absolute inset-0"
          />

          {/* Corner decorations */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)] z-10">
            <div className={cn("w-1.5 h-1.5 rounded-full", isLiveConnected ? "bg-green status-online" : "bg-[var(--nav-text-muted)]")} />
            <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
              {isLiveConnected ? "LIVE VIEW" : "CONNECTING..."}
            </span>
          </div>
        </div>

        {/* Site cards list */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] xl:max-h-none">
          <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1">
            Facilities ({liveSites.length})
          </h2>
          {liveSites.map((site, i) => (
            <SiteCard
              key={site.id}
              site={site}
              index={i}
              liveAlertCount={siteAlertCounts.get(site.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
