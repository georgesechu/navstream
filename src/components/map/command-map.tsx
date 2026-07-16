"use client";

import { type Site } from "@/stores/app-store";
import { useSites } from "@/hooks/use-sites";
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
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

function SiteCard({ site, index }: { site: Site; index: number }) {
  const [hovered, setHovered] = useState(false);
  const status = statusConfig[site.status];

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
                  "w-2.5 h-2.5 rounded-full",
                  status.color,
                  status.glow,
                  site.status === "online" && "status-online"
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
            {site.activeAlerts > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber" />
                <span className="text-xs font-mono text-amber">
                  {site.activeAlerts}
                </span>
              </div>
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

function StatsBar({ sites }: { sites: Site[] }) {

  const online = sites.filter((s) => s.status === "online").length;
  const warning = sites.filter((s) => s.status === "warning").length;
  const critical = sites.filter((s) => s.status === "critical").length;
  const totalPersonnel = sites.reduce((a, s) => a + s.personnelCount, 0);
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
      label: "Critical",
      value: critical,
      icon: AlertTriangle,
      color: "text-red",
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
            <p className="text-lg font-semibold font-mono text-[var(--nav-text-primary)] leading-none">
              {stat.value}
            </p>
            <p className="text-[10px] text-[var(--nav-text-muted)] uppercase tracking-wider mt-0.5">
              {stat.label}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function CommandMap() {
  const { sites, isLoading } = useSites();
  const router = useRouter();

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
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-cyan/10 text-cyan text-xs font-medium border border-cyan/20 hover:bg-cyan/20 transition-colors">
            + Add Site
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar sites={sites} />

      {/* Map placeholder + site grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        {/* Map area */}
        <div data-testid="command-map-viewport" className="xl:col-span-2 relative rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] overflow-hidden min-h-[400px]">
          {/* Interactive world map */}
          <WorldMap
            sites={sites}
            onSiteClick={(siteId) => router.push(`/sites/${siteId}`)}
            className="absolute inset-0"
          />

          {/* Corner decorations */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)] z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-green status-online" />
            <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
              LIVE VIEW
            </span>
          </div>
        </div>

        {/* Site cards list */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] xl:max-h-none">
          <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1">
            Facilities ({sites.length})
          </h2>
          {sites.map((site, i) => (
            <SiteCard key={site.id} site={site} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
