"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Minimize2 } from "lucide-react";

interface WorldMapSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "warning" | "critical" | "offline";
  type: string;
  activeAlerts: number;
}

interface WorldMapProps {
  sites: WorldMapSite[];
  className?: string;
  onSiteClick?: (siteId: string) => void;
}

const statusColors: Record<string, { fill: string; glow: string; text: string }> = {
  online: { fill: "#00e676", glow: "rgba(0,230,118,0.5)", text: "Online" },
  warning: { fill: "#ffab00", glow: "rgba(255,171,0,0.5)", text: "Warning" },
  critical: { fill: "#ff1744", glow: "rgba(255,23,68,0.5)", text: "Critical" },
  offline: { fill: "#5a6580", glow: "rgba(90,101,128,0.3)", text: "Offline" },
};

// Mercator projection: lat/lng -> SVG coordinates
function mercatorX(lng: number, width: number): number {
  return ((lng + 180) / 360) * width;
}

function mercatorY(lat: number, height: number): number {
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  // Clamp to avoid extreme values near poles
  const clampedMercN = Math.max(-Math.PI, Math.min(Math.PI, mercN));
  return ((1 - clampedMercN / Math.PI) / 2) * height;
}

// Simplified continent outlines as SVG paths (approximate, recognizable shapes)
// Coordinates are in a 1000x500 SVG viewBox (equirectangular-ish mapping for path authoring,
// then we use actual Mercator for marker placement)
const CONTINENT_PATHS = [
  // North America
  "M 120,85 L 140,75 160,70 180,68 195,72 210,78 225,90 235,95 250,105 260,108 270,120 275,130 270,140 265,150 255,155 248,165 240,170 230,178 218,182 210,185 205,190 195,200 185,198 175,195 170,188 165,178 155,170 148,165 140,160 135,155 125,148 118,140 112,132 108,125 105,118 108,110 112,100 115,92 Z",
  // Central America + Caribbean
  "M 195,200 L 200,205 205,210 210,215 212,220 210,225 208,228 205,230 200,228 L 195,200 Z",
  // South America
  "M 210,225 L 218,228 225,235 232,245 238,260 240,275 242,290 240,305 238,318 234,330 228,340 220,348 212,350 205,345 198,335 195,320 192,305 190,290 188,275 190,260 195,248 200,238 205,230 Z",
  // Europe
  "M 460,75 L 470,70 485,72 500,75 510,80 515,88 520,95 518,102 512,108 505,112 498,115 492,118 488,122 482,118 475,112 468,108 462,102 458,95 455,88 458,82 Z",
  // Africa
  "M 465,155 L 478,150 490,148 502,150 515,155 525,162 530,172 535,185 538,200 540,218 538,235 535,250 530,265 525,278 518,288 510,298 500,305 490,308 480,305 472,298 465,288 460,275 455,260 452,245 450,228 452,212 455,198 458,185 460,172 462,162 Z",
  // Asia (simplified)
  "M 520,95 L 535,88 555,82 575,78 595,75 620,72 645,70 665,68 685,72 700,78 720,82 740,88 755,95 765,105 770,115 772,125 768,135 762,145 755,152 745,158 735,162 725,168 715,172 705,178 695,182 685,185 675,180 665,175 655,170 645,168 635,170 625,172 615,168 605,162 595,158 585,155 575,150 565,145 555,140 545,135 535,128 528,120 522,112 520,105 Z",
  // India
  "M 635,170 L 640,178 645,188 648,200 650,212 648,222 642,228 635,230 628,225 625,215 622,205 620,195 622,185 625,178 630,172 Z",
  // Southeast Asia / Indonesia (simplified)
  "M 700,195 L 710,192 720,195 730,200 740,205 738,212 730,215 720,218 712,220 705,222 698,218 695,210 698,202 Z",
  // Australia
  "M 720,280 L 735,272 752,268 770,265 788,268 802,275 810,285 815,298 812,312 805,322 795,328 782,332 768,334 752,332 738,328 728,320 722,310 718,298 720,288 Z",
  // Greenland (small)
  "M 320,42 L 335,38 348,40 355,45 358,52 355,58 348,62 338,60 330,55 325,48 Z",
  // UK/Ireland
  "M 452,78 L 458,75 462,78 460,84 455,86 450,82 Z",
  // Japan
  "M 775,110 L 780,105 785,108 788,115 786,122 782,128 778,125 775,118 Z",
  // New Zealand
  "M 835,325 L 840,320 845,325 842,332 838,335 835,330 Z",
  // Madagascar
  "M 548,280 L 552,275 556,278 555,288 552,292 548,288 Z",
];

// Grid lines for the map
function GridLines({ width, height }: { width: number; height: number }) {
  const lines = [];
  // Longitude lines every 30 degrees
  for (let lng = -150; lng <= 180; lng += 30) {
    const x = mercatorX(lng, width);
    lines.push(
      <line
        key={`lng-${lng}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="var(--nav-border-subtle)"
        strokeWidth={0.5}
        opacity={0.4}
      />
    );
  }
  // Latitude lines every 20 degrees (avoid extreme poles)
  for (let lat = -60; lat <= 80; lat += 20) {
    const y = mercatorY(lat, height);
    lines.push(
      <line
        key={`lat-${lat}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="var(--nav-border-subtle)"
        strokeWidth={0.5}
        opacity={0.4}
      />
    );
  }
  return <g>{lines}</g>;
}

// Scale continent paths from their 1000x500 authoring space to actual SVG space
function ContinentPaths({ width, height }: { width: number; height: number }) {
  const scaleX = width / 1000;
  const scaleY = height / 500;
  return (
    <g>
      {CONTINENT_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="#141a2e"
          stroke="#1e2744"
          strokeWidth={0.8}
          opacity={0.9}
          transform={`scale(${scaleX}, ${scaleY})`}
        />
      ))}
    </g>
  );
}

function SiteMarker({
  site,
  x,
  y,
  index,
  isHovered,
  isZoomed,
  onHover,
  onLeave,
  onClick,
}: {
  site: WorldMapSite;
  x: number;
  y: number;
  index: number;
  isHovered: boolean;
  isZoomed: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const colors = statusColors[site.status];
  const isActive = site.status !== "offline";
  const markerRadius = isHovered ? 8 : 6;

  return (
    <motion.g
      data-testid={`world-map-marker-${site.id}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        delay: 0.3 + index * 0.12,
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      style={{ cursor: "pointer", transformOrigin: `${x}px ${y}px` }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Outer glow ring — animated pulse for active sites */}
      {isActive && (
        <>
          <circle cx={x} cy={y} r={16} fill={colors.glow} opacity={0.15}>
            <animate
              attributeName="r"
              values="14;22;14"
              dur="2.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.2;0.04;0.2"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={x} cy={y} r={10} fill="none" stroke={colors.fill} strokeWidth={1} opacity={0.25}>
            <animate
              attributeName="r"
              values="10;16;10"
              dur="2.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0.06;0.3"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Third outer glow ring for stronger pulse effect */}
          <circle cx={x} cy={y} r={22} fill="none" stroke={colors.fill} strokeWidth={0.5} opacity={0.1}>
            <animate
              attributeName="r"
              values="18;28;18"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.12;0.01;0.12"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}

      {/* Main marker dot */}
      <circle
        cx={x}
        cy={y}
        r={markerRadius}
        fill={colors.fill}
        stroke="#0a0e1a"
        strokeWidth={2}
        style={{
          filter: isActive ? `drop-shadow(0 0 8px ${colors.glow}) drop-shadow(0 0 3px ${colors.fill})` : undefined,
          transition: "r 0.2s ease",
        }}
      />

      {/* Site name label — visible when zoomed in */}
      {isZoomed && (
        <g>
          {/* Background pill for label */}
          <rect
            x={x + 12}
            y={y - 7}
            width={site.name.length * 4.5 + 12}
            height={14}
            rx={3}
            fill="#0a0e1a"
            fillOpacity={0.85}
            stroke={colors.fill}
            strokeWidth={0.5}
            strokeOpacity={0.4}
          />
          <text
            x={x + 18}
            y={y + 3}
            fill="var(--nav-text-primary, #e0e6f0)"
            fontSize={7}
            fontWeight={600}
            fontFamily="var(--font-sans), system-ui, sans-serif"
          >
            {site.name}
          </text>
        </g>
      )}

      {/* Alert count badge */}
      {site.activeAlerts > 0 && (
        <g>
          <circle cx={x + 9} cy={y - 9} r={7} fill="#0a0e1a" />
          <circle cx={x + 9} cy={y - 9} r={5.5} fill={site.status === "critical" ? "#ff1744" : "#ffab00"} />
          <text
            x={x + 9}
            y={y - 5.5}
            textAnchor="middle"
            fill="#0a0e1a"
            fontSize={7}
            fontWeight={700}
            fontFamily="var(--font-mono), monospace"
          >
            {site.activeAlerts > 9 ? "9+" : site.activeAlerts}
          </text>
        </g>
      )}
    </motion.g>
  );
}

function SiteTooltip({
  site,
  x,
  y,
  containerWidth,
}: {
  site: WorldMapSite;
  x: number;
  y: number;
  containerWidth: number;
}) {
  const colors = statusColors[site.status];
  const tooltipWidth = 160;
  const tooltipHeight = 52;
  // Flip tooltip to left side if too close to right edge
  const flipX = x + tooltipWidth + 20 > containerWidth;
  const tx = flipX ? x - tooltipWidth - 14 : x + 14;
  const ty = y - tooltipHeight / 2;

  return (
    <AnimatePresence>
      <motion.foreignObject
        x={tx}
        y={ty}
        width={tooltipWidth}
        height={tooltipHeight}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        style={{ pointerEvents: "none", overflow: "visible" }}
      >
        <div
          className={cn(
            "rounded-lg border border-[var(--nav-border)] bg-[var(--nav-bg-elevated)] px-3 py-2",
            "shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          )}
        >
          <p className="text-[11px] font-semibold text-[var(--nav-text-primary)] leading-tight truncate">
            {site.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: colors.fill }}
            />
            <span className="text-[10px]" style={{ color: colors.fill }}>
              {colors.text}
            </span>
            <span className="text-[10px] text-[var(--nav-text-muted)] ml-1">
              {site.type}
            </span>
          </div>
          {site.activeAlerts > 0 && (
            <p className="text-[10px] text-amber mt-0.5">
              {site.activeAlerts} active alert{site.activeAlerts > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </motion.foreignObject>
    </AnimatePresence>
  );
}

// Internal SVG dimensions
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 500;

// Zoom level constant
const ZOOM_FACTOR = 2.5;

export function WorldMap({ sites, className, onSiteClick }: WorldMapProps) {
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
  const [zoomedSiteId, setZoomedSiteId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated viewBox values
  const vbX = useMotionValue(0);
  const vbY = useMotionValue(0);
  const vbW = useMotionValue(SVG_WIDTH);
  const vbH = useMotionValue(SVG_HEIGHT);

  // Compose viewBox string from animated values
  const viewBoxStr = useTransform(
    [vbX, vbY, vbW, vbH],
    ([x, y, w, h]: number[]) => `${x} ${y} ${w} ${h}`
  );

  // Compute marker positions using Mercator projection
  const markerPositions = useMemo(() => {
    return sites.map((site) => ({
      site,
      x: mercatorX(site.lng, SVG_WIDTH),
      y: mercatorY(site.lat, SVG_HEIGHT),
    }));
  }, [sites]);

  // Compute the default (overview) viewBox that fits all markers with padding
  const overviewViewBox = useMemo(() => {
    if (markerPositions.length === 0) {
      return { x: 0, y: 0, w: SVG_WIDTH, h: SVG_HEIGHT };
    }

    const xs = markerPositions.map((m) => m.x);
    const ys = markerPositions.map((m) => m.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Add generous padding (20% of range on each side, minimum 60px)
    const rangeX = maxX - minX || SVG_WIDTH;
    const rangeY = maxY - minY || SVG_HEIGHT;
    const padX = Math.max(rangeX * 0.25, 60);
    const padY = Math.max(rangeY * 0.25, 60);

    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padY);
    const w = Math.min(SVG_WIDTH - x, rangeX + padX * 2);
    const h = Math.min(SVG_HEIGHT - y, rangeY + padY * 2);

    return { x, y, w, h };
  }, [markerPositions]);

  // Initialize viewBox motion values from overview
  useEffect(() => {
    vbX.set(overviewViewBox.x);
    vbY.set(overviewViewBox.y);
    vbW.set(overviewViewBox.w);
    vbH.set(overviewViewBox.h);
    // Only run on mount / when overviewViewBox changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewViewBox]);

  // Animate viewBox to target
  const animateViewBox = useCallback(
    (target: { x: number; y: number; w: number; h: number }, duration = 0.5) => {
      const springConfig = { duration, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] };
      animate(vbX, target.x, springConfig);
      animate(vbY, target.y, springConfig);
      animate(vbW, target.w, springConfig);
      animate(vbH, target.h, springConfig);
    },
    [vbX, vbY, vbW, vbH]
  );

  // Zoom into a marker
  const zoomToSite = useCallback(
    (siteId: string) => {
      const marker = markerPositions.find((m) => m.site.id === siteId);
      if (!marker) return;

      // Compute zoomed viewBox centered on marker
      const zoomedW = overviewViewBox.w / ZOOM_FACTOR;
      const zoomedH = overviewViewBox.h / ZOOM_FACTOR;
      const zoomedX = Math.max(0, Math.min(SVG_WIDTH - zoomedW, marker.x - zoomedW / 2));
      const zoomedY = Math.max(0, Math.min(SVG_HEIGHT - zoomedH, marker.y - zoomedH / 2));

      setZoomedSiteId(siteId);
      animateViewBox({ x: zoomedX, y: zoomedY, w: zoomedW, h: zoomedH }, 0.5);
    },
    [markerPositions, overviewViewBox, animateViewBox]
  );

  // Zoom back to overview
  const zoomOut = useCallback(() => {
    setZoomedSiteId(null);
    animateViewBox(overviewViewBox, 0.4);
  }, [overviewViewBox, animateViewBox]);

  // Cleanup navigation timer on unmount
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  const handleSiteClick = useCallback(
    (siteId: string) => {
      // Clear any pending navigation
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }

      if (zoomedSiteId === siteId) {
        // Already zoomed in on this site — navigate immediately
        onSiteClick?.(siteId);
        return;
      }

      // Zoom in first, then navigate after a brief pause
      zoomToSite(siteId);
      navigationTimerRef.current = setTimeout(() => {
        onSiteClick?.(siteId);
      }, 600);
    },
    [onSiteClick, zoomToSite, zoomedSiteId]
  );

  // Double-click on background to zoom out
  const handleBackgroundDoubleClick = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      // Only if zoomed in
      if (zoomedSiteId) {
        e.preventDefault();
        e.stopPropagation();
        zoomOut();
      }
    },
    [zoomedSiteId, zoomOut]
  );

  const hoveredMarker = markerPositions.find(
    (m) => m.site.id === hoveredSiteId
  );

  // Current zoom level for indicator
  const currentZoom = zoomedSiteId ? ZOOM_FACTOR : 1;

  // Subscribe to viewBoxStr for rendering
  const [currentViewBox, setCurrentViewBox] = useState(
    `${overviewViewBox.x} ${overviewViewBox.y} ${overviewViewBox.w} ${overviewViewBox.h}`
  );

  useEffect(() => {
    const unsubscribe = viewBoxStr.on("change", (v) => {
      setCurrentViewBox(v);
    });
    return unsubscribe;
  }, [viewBoxStr]);

  return (
    <div data-testid="world-map" className={cn("w-full h-full relative", className)}>
      <svg
        ref={svgRef}
        viewBox={currentViewBox}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ backgroundColor: "var(--nav-bg-primary)" }}
      >
        <defs>
          {/* Ocean gradient */}
          <radialGradient id="ocean-gradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0f1424" />
            <stop offset="100%" stopColor="#0a0e1a" />
          </radialGradient>
        </defs>

        {/* Ocean background — double-click to zoom out */}
        <rect
          x={0}
          y={0}
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          fill="url(#ocean-gradient)"
          onDoubleClick={handleBackgroundDoubleClick}
        />

        {/* Grid lines */}
        <GridLines width={SVG_WIDTH} height={SVG_HEIGHT} />

        {/* Continents */}
        <ContinentPaths width={SVG_WIDTH} height={SVG_HEIGHT} />

        {/* Site markers */}
        {markerPositions.map((mp, index) => (
          <SiteMarker
            key={mp.site.id}
            site={mp.site}
            x={mp.x}
            y={mp.y}
            index={index}
            isHovered={hoveredSiteId === mp.site.id}
            isZoomed={zoomedSiteId !== null}
            onHover={() => setHoveredSiteId(mp.site.id)}
            onLeave={() => setHoveredSiteId(null)}
            onClick={() => handleSiteClick(mp.site.id)}
          />
        ))}

        {/* Tooltip for hovered site */}
        {hoveredMarker && (
          <SiteTooltip
            site={hoveredMarker.site}
            x={hoveredMarker.x}
            y={hoveredMarker.y}
            containerWidth={SVG_WIDTH}
          />
        )}
      </svg>

      {/* Zoom controls overlay */}
      <AnimatePresence>
        {zoomedSiteId && (
          <>
            {/* Zoom level indicator */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="absolute top-3 right-3 flex items-center gap-2 z-10"
            >
              <span
                data-testid="world-map-zoom-level"
                className="px-2 py-1 rounded bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-cyan/30 text-[11px] font-mono text-cyan"
              >
                x{currentZoom.toFixed(1)}
              </span>
              <button
                data-testid="world-map-zoom-reset"
                onClick={zoomOut}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded",
                  "bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm",
                  "border border-[var(--nav-border)] hover:border-cyan/40",
                  "text-[11px] font-mono text-[var(--nav-text-muted)] hover:text-cyan",
                  "transition-colors cursor-pointer"
                )}
                title="Reset zoom (or double-click map)"
              >
                <Minimize2 className="w-3 h-3" />
                Reset
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
