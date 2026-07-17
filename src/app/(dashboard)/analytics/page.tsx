"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { GlowCard } from "@/components/ui/glow-card";
import { RadialGauge } from "@/components/charts/radial-gauge";
import { Sparkline } from "@/components/charts/sparkline";
import { BarChart } from "@/components/charts/bar-chart";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAnalytics } from "@/hooks/use-analytics";

// Static sparkline data for trend visualization (not sourced from API)
const uptimeData = [99.2, 99.5, 99.1, 98.8, 99.3, 99.7, 99.4, 99.6, 99.8, 99.2, 99.5, 99.7];
const alertsData = [12, 8, 15, 10, 7, 9, 11, 6, 8, 5, 7, 3];
const tasksData = [24, 28, 32, 27, 35, 30, 38, 33, 29, 36, 40, 42];
const responseData = [45, 38, 42, 35, 30, 28, 32, 25, 22, 20, 18, 15];

/** Map event severity to icon and color */
function eventIconProps(severity: string): { icon: typeof CheckCircle2; color: string } {
  switch (severity) {
    case "critical":
      return { icon: AlertTriangle, color: "text-red" };
    case "warning":
      return { icon: AlertTriangle, color: "text-amber" };
    case "resolved":
      return { icon: CheckCircle2, color: "text-green" };
    default:
      return { icon: Activity, color: "text-cyan" };
  }
}

export default function AnalyticsPage() {
  const { kpis, alertsBySite: alertsBySiteData, recentEvents, isLoading } = useAnalytics();
  const router = useRouter();

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Analytics"
          subtitle="Performance metrics and operational insights"
          accent="cyan"
          actions={
            <div className="flex items-center gap-2">
              <button
                data-testid="analytics-shift-report-btn"
                onClick={() => router.push("/ai?prompt=shift-handover")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate Shift Report
              </button>
              {["24h", "7d", "30d", "90d"].map((period) => (
                <button
                  key={period}
                  data-testid={`analytics-period-${period}`}
                  aria-pressed={period === "30d"}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                    period === "30d"
                      ? "bg-cyan/10 text-cyan border-cyan/20"
                      : "text-[var(--nav-text-muted)] border-[var(--nav-border)] hover:bg-[var(--nav-bg-hover)]"
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
          }
        />

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "System Uptime",
              value: kpis.systemUptime,
              change: "+0.3%",
              trend: "up" as const,
              icon: Activity,
              accent: "green" as const,
              sparkData: uptimeData,
            },
            {
              label: "Active Alerts",
              value: kpis.activeAlerts,
              change: "-57%",
              trend: "down" as const,
              icon: AlertTriangle,
              accent: "amber" as const,
              sparkData: alertsData,
            },
            {
              label: "Tasks Completed",
              value: kpis.tasksCompleted,
              change: "+17%",
              trend: "up" as const,
              icon: CheckCircle2,
              accent: "cyan" as const,
              sparkData: tasksData,
            },
            {
              label: "Avg Response Time",
              value: kpis.avgResponseTime,
              change: "-40%",
              trend: "down" as const,
              icon: Clock,
              accent: "magenta" as const,
              sparkData: responseData,
            },
          ].map((kpi, i) => (
            <GlowCard key={kpi.label} accent={kpi.accent} delay={i * 0.05} data-testid={`analytics-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      "p-1.5 rounded-lg",
                      kpi.accent === "green"
                        ? "bg-green/10 text-green"
                        : kpi.accent === "amber"
                          ? "bg-amber/10 text-amber"
                          : kpi.accent === "cyan"
                            ? "bg-cyan/10 text-cyan"
                            : "bg-magenta/10 text-magenta"
                    )}
                  >
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-0.5 text-[11px] font-medium",
                      (kpi.label === "Active Alerts" || kpi.label === "Avg Response Time")
                        ? kpi.trend === "down" ? "text-green" : "text-red"
                        : kpi.trend === "up" ? "text-green" : "text-red"
                    )}
                  >
                    {kpi.trend === "up" ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {kpi.change}
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono text-[var(--nav-text-primary)]">
                  {kpi.value}
                </p>
                <p className="text-[11px] text-[var(--nav-text-muted)] uppercase tracking-wider mt-0.5 mb-3">
                  {kpi.label}
                </p>
                <Sparkline
                  data={kpi.sparkData}
                  width={200}
                  height={32}
                  accent={kpi.accent}
                  delay={0.2 + i * 0.05}
                />
              </div>
            </GlowCard>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Gauges */}
          <GlowCard accent="cyan" delay={0.3}>
            <div className="p-5">
              <h3 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-5">
                System Health
              </h3>
              <div className="flex justify-around">
                <RadialGauge
                  value={parseFloat(kpis.systemUptime) || 99.7}
                  label="Uptime"
                  accent="green"
                  delay={0.4}
                />
                <RadialGauge
                  value={72}
                  label="Capacity"
                  accent="cyan"
                  delay={0.5}
                />
                <RadialGauge
                  value={34}
                  label="Load"
                  accent="amber"
                  delay={0.6}
                />
              </div>
            </div>
          </GlowCard>

          {/* Alerts by site */}
          <GlowCard accent="amber" delay={0.35}>
            <div className="p-5">
              <h3 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-5">
                Alerts by Site (30d)
              </h3>
              <BarChart
                data={alertsBySiteData}
                delay={0.4}
              />
            </div>
          </GlowCard>

          {/* Tasks by category */}
          <GlowCard accent="green" delay={0.4}>
            <div className="p-5">
              <h3 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-5">
                Tasks by Category
              </h3>
              <BarChart
                data={[
                  { label: "Inspection", value: 42, accent: "cyan" },
                  { label: "Maintenance", value: 35, accent: "green" },
                  { label: "Repair", value: 18, accent: "amber" },
                  { label: "Safety", value: 12, accent: "magenta" },
                  { label: "Calibration", value: 8, accent: "cyan" },
                ]}
                delay={0.45}
              />
            </div>
          </GlowCard>
        </div>

        {/* Recent events */}
        <GlowCard accent="cyan" delay={0.5}>
          <div className="p-5">
            <h3 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-4">
              Recent Events
            </h3>
            <div className="space-y-3">
              {recentEvents.map((item, i) => {
                const { icon: EventIcon, color } = eventIconProps(item.severity);
                return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)] hover:bg-[var(--nav-bg-hover)] transition-colors cursor-pointer group"
                >
                  <EventIcon
                    className={cn("w-4 h-4 flex-shrink-0", color)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--nav-text-primary)]">
                      {item.event}
                    </p>
                    <p className="text-[10px] text-[var(--nav-text-muted)]">
                      {item.site}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
                    {item.time}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--nav-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
                );
              })}
            </div>
          </div>
        </GlowCard>
      </div>
    </AppShell>
  );
}
