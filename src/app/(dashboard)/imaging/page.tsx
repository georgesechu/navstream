"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { GlowCard } from "@/components/ui/glow-card";
import { ThermalOverlay, type ThermalHotspot } from "@/components/imaging/thermal-overlay";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Thermometer,
  Eye,
  Layers,
  SlidersHorizontal,
  Download,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Pencil,
  Type,
  ArrowUpRight,
  Minus,
  Wrench,
  MapPin,
} from "lucide-react";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useFetch } from "@/hooks/use-fetch";

type SpectrumMode = "visible" | "thermal" | "infrared";

const mockAnnotations = [
  { id: "a1", x: 35, y: 40, label: "Hot spot detected", type: "alert" as const },
  { id: "a2", x: 65, y: 55, label: "Bearing wear", type: "note" as const },
  { id: "a3", x: 50, y: 30, label: "Normal range", type: "ok" as const },
];

// Broken Hill pump station thermal hotspots
const pumpStationHotspots: ThermalHotspot[] = [
  { x: 35, y: 40, temp: 142, radius: 12, label: "Main Bearing Assembly" },
  { x: 58, y: 35, temp: 95, radius: 14, label: "Motor Housing" },
  { x: 25, y: 65, temp: 45, radius: 10, label: "Coolant Pipe Inlet" },
  { x: 70, y: 62, temp: 68, radius: 10, label: "Coolant Pipe Outlet" },
];

const mockTimeline = [
  { time: "Now", temp: "142°C" },
  { time: "1h ago", temp: "138°C" },
  { time: "3h ago", temp: "135°C" },
  { time: "6h ago", temp: "131°C" },
  { time: "12h ago", temp: "128°C" },
  { time: "24h ago", temp: "125°C" },
  { time: "48h ago", temp: "120°C" },
  { time: "7d ago", temp: "115°C" },
];

function SpectrumOverlay({ mode }: { mode: SpectrumMode }) {
  const gradients: Record<SpectrumMode, string> = {
    visible:
      "bg-gradient-to-br from-[#1a1a2e]/80 via-[#16213e]/60 to-[#1a1a2e]/80",
    thermal:
      "bg-gradient-to-br from-[#1a0000]/80 via-[#4a0000]/60 to-[#ff4400]/30",
    infrared:
      "bg-gradient-to-br from-[#000033]/80 via-[#003366]/60 to-[#00ffcc]/20",
  };

  return (
    <div className={cn("absolute inset-0 transition-all duration-500", gradients[mode])}>
      {/* Simulated thermal/IR patterns */}
      {mode === "thermal" && (
        <>
          <div className="absolute top-[30%] left-[25%] w-32 h-24 rounded-full bg-gradient-radial from-red/40 via-amber/20 to-transparent blur-sm" />
          <div className="absolute top-[45%] left-[55%] w-24 h-20 rounded-full bg-gradient-radial from-amber/30 via-yellow-500/15 to-transparent blur-sm" />
          <div className="absolute top-[60%] left-[40%] w-40 h-16 rounded-full bg-gradient-radial from-green/20 via-cyan/10 to-transparent blur-sm" />
          {/* Color scale */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-48 rounded-full overflow-hidden border border-[var(--nav-border)]">
            <div className="w-full h-full bg-gradient-to-b from-red via-amber via-green to-blue" />
          </div>
          <div className="absolute right-10 top-[calc(50%-96px)] text-[9px] font-mono text-red">200°C</div>
          <div className="absolute right-10 top-1/2 -translate-y-1/2 text-[9px] font-mono text-amber">100°C</div>
          <div className="absolute right-10 top-[calc(50%+80px)] text-[9px] font-mono text-blue">20°C</div>
        </>
      )}
      {mode === "infrared" && (
        <>
          <div className="absolute top-[25%] left-[30%] w-28 h-20 rounded bg-cyan/20 border border-cyan/30 blur-[1px]" />
          <div className="absolute top-[50%] left-[50%] w-20 h-16 rounded bg-green/25 border border-green/30 blur-[1px]" />
          <div className="absolute top-[35%] left-[65%] w-16 h-12 rounded bg-magenta/20 border border-magenta/30 blur-[1px]" />
          <div className="absolute inset-0 scanlines opacity-50" />
        </>
      )}
    </div>
  );
}

/** Minimal shapes for context fetches. */
interface SiteContext {
  id: string;
  name: string;
  equipment?: { id: string; name: string; category: string }[];
}

export default function ImagingPage() {
  return (
    <Suspense>
      <ImagingPageContent />
    </Suspense>
  );
}

function ImagingPageContent() {
  const searchParams = useSearchParams();
  const siteIdParam = searchParams.get("site") || null;
  const equipmentIdParam = searchParams.get("equipment") || null;

  // Fetch site context if provided
  const siteUrl = siteIdParam ? `/api/sites/${siteIdParam}` : null;
  const { data: siteData } = useFetch<SiteContext>(siteUrl ?? "/api/sites/__none__");
  const siteContext = siteIdParam && siteData && !("error" in siteData) ? siteData : null;

  // Resolve equipment name from site context
  const equipmentContext = (() => {
    if (!equipmentIdParam || !siteContext?.equipment) return null;
    return siteContext.equipment.find((e) => e.id === equipmentIdParam) ?? null;
  })();

  const [spectrumMode, setSpectrumMode] = useState<SpectrumMode>("thermal");
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [cursorTemp, setCursorTemp] = useState<number | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Track viewport size for canvas
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setViewportSize({
          width: Math.floor(width),
          height: Math.floor(height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleCursorTemp = useCallback(
    (temp: number | null) => {
      setCursorTemp(temp);
    },
    [],
  );

  const modes: { key: SpectrumMode; label: string; color: string }[] = [
    { key: "visible", label: "Visible", color: "text-[var(--nav-text-secondary)]" },
    { key: "thermal", label: "Thermal", color: "text-amber" },
    { key: "infrared", label: "Infrared", color: "text-cyan" },
  ];

  const annotationTools = [
    { key: "circle", icon: Circle, label: "Circle" },
    { key: "arrow", icon: ArrowUpRight, label: "Arrow" },
    { key: "line", icon: Minus, label: "Line" },
    { key: "text", icon: Type, label: "Text" },
    { key: "pencil", icon: Pencil, label: "Freehand" },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-6 h-[calc(100vh-3.5rem)]">
        <PageHeader
          title="Imaging & Diagnostics"
          subtitle="Multi-spectrum analysis with AI anomaly detection"
          accent="amber"
          actions={
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber/10 text-amber text-xs font-medium border border-amber/20 hover:bg-amber/20 transition-colors">
              <Download className="w-3 h-3" />
              Export
            </button>
          }
        />

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Main image viewer */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Spectrum mode tabs */}
            <div className="flex items-center gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setSpectrumMode(mode.key)}
                  data-testid={`imaging-spectrum-toggle-${mode.key}`}
                  aria-pressed={spectrumMode === mode.key}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    spectrumMode === mode.key
                      ? cn("border", mode.key === "thermal" ? "bg-amber/10 text-amber border-amber/20" : mode.key === "infrared" ? "bg-cyan/10 text-cyan border-cyan/20" : "bg-[var(--nav-bg-hover)] text-[var(--nav-text-primary)] border-[var(--nav-border)]")
                      : "text-[var(--nav-text-muted)] hover:text-[var(--nav-text-secondary)] border border-transparent"
                  )}
                >
                  {mode.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                data-testid="imaging-toggle-annotations"
                aria-label="Toggle annotations"
                aria-pressed={showAnnotations}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors border",
                  showAnnotations
                    ? "bg-amber/10 text-amber border-amber/20"
                    : "text-[var(--nav-text-muted)] border-[var(--nav-border)] hover:bg-[var(--nav-bg-hover)]"
                )}
              >
                <Layers className="w-3 h-3" />
                Annotations
              </button>
            </div>

            {/* Image viewport */}
            <div ref={viewportRef} className="flex-1 relative rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-primary)] overflow-hidden">
              {spectrumMode === "thermal" ? (
                viewportSize.width > 0 && viewportSize.height > 0 && (
                  <ThermalOverlay
                    width={viewportSize.width}
                    height={viewportSize.height}
                    hotspots={pumpStationHotspots}
                    minTemp={20}
                    maxTemp={200}
                    showColorScale
                    onCursorTemp={handleCursorTemp}
                  />
                )
              ) : (
                <>
                  <div className="absolute inset-0 grid-pattern opacity-20" />
                  <SpectrumOverlay mode={spectrumMode} />
                </>
              )}

              {/* Simulated equipment outline */}
              {spectrumMode !== "thermal" && (
                <div className="absolute top-[20%] left-[20%] right-[20%] bottom-[25%] border border-dashed border-[var(--nav-text-muted)]/20 rounded-lg" />
              )}

              {/* Annotations */}
              {showAnnotations &&
                mockAnnotations.map((ann, i) => {
                  const typeStyles = {
                    alert: "border-red bg-red/20 text-red",
                    note: "border-amber bg-amber/20 text-amber",
                    ok: "border-green bg-green/20 text-green",
                  };
                  return (
                    <motion.div
                      key={ann.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
                      className="absolute group cursor-pointer"
                      style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                    >
                      <div
                        className={cn(
                          "w-6 h-6 -ml-3 -mt-3 rounded-full border-2 flex items-center justify-center",
                          typeStyles[ann.type]
                        )}
                      >
                        {ann.type === "alert" && (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {ann.type === "note" && (
                          <Eye className="w-3 h-3" />
                        )}
                        {ann.type === "ok" && (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-[var(--nav-bg-elevated)] border border-[var(--nav-border)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                        <p className="text-[11px] text-[var(--nav-text-primary)]">
                          {ann.label}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

              {/* Mode indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)]">
                <Thermometer
                  className={cn(
                    "w-3 h-3",
                    spectrumMode === "thermal"
                      ? "text-amber"
                      : spectrumMode === "infrared"
                        ? "text-cyan"
                        : "text-[var(--nav-text-muted)]"
                  )}
                />
                <span className="text-[10px] font-mono text-[var(--nav-text-muted)] uppercase">
                  {spectrumMode}
                </span>
              </div>

              {/* Annotation toolbar */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)]">
                {annotationTools.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    title={label}
                    onClick={() =>
                      setActiveTool(activeTool === key ? null : key)
                    }
                    data-testid={`imaging-tool-${key}`}
                    aria-label={label}
                    aria-pressed={activeTool === key}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      activeTool === key
                        ? "text-amber bg-amber/10"
                        : "text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-hover)]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline slider */}
            <div data-testid="imaging-timeline" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)]">
              <Clock className="w-4 h-4 text-[var(--nav-text-muted)]" />
              <button
                onClick={() => setTimelineIndex(Math.max(0, timelineIndex - 1))}
                className="p-1 rounded hover:bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex-1 flex items-center gap-1">
                {mockTimeline.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setTimelineIndex(i)}
                    className={cn(
                      "flex-1 h-1.5 rounded-full transition-all",
                      i === timelineIndex
                        ? "bg-amber shadow-[0_0_6px_rgba(255,171,0,0.4)]"
                        : i < timelineIndex
                          ? "bg-amber/30"
                          : "bg-[var(--nav-bg-hover)]"
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setTimelineIndex(
                    Math.min(mockTimeline.length - 1, timelineIndex + 1)
                  )
                }
                className="p-1 rounded hover:bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-[var(--nav-text-secondary)] min-w-[60px] text-right">
                {mockTimeline[timelineIndex].time}
              </span>
              <span className="text-xs font-mono text-amber min-w-[50px]">
                {mockTimeline[timelineIndex].temp}
              </span>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72 flex flex-col gap-4 overflow-y-auto flex-shrink-0">
            {/* Context header */}
            {(siteContext || equipmentContext) && (
              <>
                <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1">
                  Context
                </h2>
                <div className="space-y-2">
                  {siteContext && (
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--nav-bg-tertiary)] border border-cyan/20"
                      data-testid="imaging-context-site"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--nav-text-primary)] truncate">
                          {siteContext.name}
                        </p>
                        <p className="text-[10px] text-[var(--nav-text-muted)]">
                          Active site
                        </p>
                      </div>
                    </div>
                  )}
                  {equipmentContext && (
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--nav-bg-tertiary)] border border-amber/20"
                      data-testid="imaging-context-equipment"
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--nav-text-primary)] truncate">
                          {equipmentContext.name}
                        </p>
                        <p className="text-[10px] text-[var(--nav-text-muted)]">
                          {equipmentContext.category}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1">
              AI Analysis
            </h2>

            <GlowCard accent="amber" delay={0.1}>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red" />
                  <span className="text-xs font-semibold text-red">
                    Anomaly Detected
                  </span>
                </div>
                <p className="text-[11px] text-[var(--nav-text-secondary)] leading-relaxed">
                  Temperature at {equipmentContext ? equipmentContext.name : "bearing assembly"} is 12°C above baseline.
                  Pattern suggests early-stage bearing wear. Recommend
                  lubrication and inspection within 7 days.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono text-amber">
                    Confidence: 87%
                  </span>
                </div>
              </div>
            </GlowCard>

            <GlowCard accent="amber" delay={0.15}>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-amber" />
                  <span className="text-xs font-semibold text-amber">
                    Trend Analysis
                  </span>
                </div>
                <p className="text-[11px] text-[var(--nav-text-secondary)] leading-relaxed">
                  Temperature{equipmentContext ? ` on ${equipmentContext.name}` : ""} has risen 17°C over the past 7 days. Rate of
                  increase is accelerating — 5°C in the last 24 hours versus
                  2°C/day average.
                </p>
              </div>
            </GlowCard>

            <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1 mt-2">
              Readings
            </h2>

            {/* Cursor temperature readout */}
            {spectrumMode === "thermal" && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--nav-bg-tertiary)] border border-amber/30">
                <span className="text-[11px] text-amber font-medium">
                  Cursor Temperature
                </span>
                <span
                  className={cn(
                    "text-sm font-mono font-bold",
                    cursorTemp !== null && cursorTemp >= 120
                      ? "text-red"
                      : cursorTemp !== null && cursorTemp >= 80
                        ? "text-amber"
                        : cursorTemp !== null && cursorTemp >= 50
                          ? "text-green"
                          : "text-cyan",
                  )}
                >
                  {cursorTemp !== null ? `${cursorTemp.toFixed(1)}°C` : "—"}
                </span>
              </div>
            )}

            <div className="space-y-2">
              {[
                { label: "Max Temperature", value: "142°C", status: "critical" },
                { label: "Avg Temperature", value: "98°C", status: "warning" },
                { label: "Min Temperature", value: "34°C", status: "ok" },
                { label: "Ambient", value: "28°C", status: "ok" },
                { label: "Delta (24h)", value: "+17°C", status: "warning" },
              ].map((reading, i) => (
                <motion.div
                  key={reading.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)]"
                >
                  <span className="text-[11px] text-[var(--nav-text-muted)]">
                    {reading.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono",
                      reading.status === "critical"
                        ? "text-red"
                        : reading.status === "warning"
                          ? "text-amber"
                          : "text-green"
                    )}
                  >
                    {reading.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
