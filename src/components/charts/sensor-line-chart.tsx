"use client";

import { useState, useId, useMemo } from "react";
import { motion } from "framer-motion";

interface DataPoint {
  timestamp: string;
  value: number;
}

interface SensorLineChartProps {
  data: DataPoint[];
  unit: string;
  label: string;
  sensorId?: string;
  thresholds?: {
    warningHigh?: number;
    criticalHigh?: number;
  };
  width?: number;
  height?: number;
  accent?: string;
}

const ACCENT_COLORS: Record<string, { line: string; fill: string; glow: string }> = {
  cyan: { line: "#00e5ff", fill: "rgba(0,229,255,0.15)", glow: "rgba(0,229,255,0.6)" },
  green: { line: "#00e676", fill: "rgba(0,230,118,0.15)", glow: "rgba(0,230,118,0.6)" },
  amber: { line: "#ffab00", fill: "rgba(255,171,0,0.15)", glow: "rgba(255,171,0,0.6)" },
  magenta: { line: "#e040fb", fill: "rgba(224,64,251,0.15)", glow: "rgba(224,64,251,0.6)" },
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function niceAxisValues(min: number, max: number, ticks: number): number[] {
  const range = max - min || 1;
  const step = range / (ticks - 1);
  const values: number[] = [];
  for (let i = 0; i < ticks; i++) {
    values.push(min + step * i);
  }
  return values;
}

export function SensorLineChart({
  data,
  unit,
  label,
  sensorId,
  thresholds,
  width = 340,
  height = 180,
  accent = "cyan",
}: SensorLineChartProps) {
  const id = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const colors = ACCENT_COLORS[accent] || ACCENT_COLORS.cyan;

  const margin = { top: 16, right: 12, bottom: 28, left: 44 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  const { points, linePath, areaPath, yMin, yMax, yTicks, xLabels } = useMemo(() => {
    if (data.length < 2) {
      return { points: [], linePath: "", areaPath: "", yMin: 0, yMax: 1, yTicks: [], xLabels: [] };
    }

    const values = data.map((d) => d.value);
    let rawMin = Math.min(...values);
    let rawMax = Math.max(...values);

    // Extend range to include thresholds if they exist
    if (thresholds?.warningHigh !== undefined) {
      rawMax = Math.max(rawMax, thresholds.warningHigh);
    }
    if (thresholds?.criticalHigh !== undefined) {
      rawMax = Math.max(rawMax, thresholds.criticalHigh);
    }

    // Add 10% padding
    const rangePad = (rawMax - rawMin) * 0.1 || 1;
    const computedYMin = rawMin - rangePad;
    const computedYMax = rawMax + rangePad;
    const computedYTicks = niceAxisValues(computedYMin, computedYMax, 5);

    const computedPoints = data.map((d, i) => {
      const x = (i / (data.length - 1)) * chartW;
      const y = chartH - ((d.value - computedYMin) / (computedYMax - computedYMin)) * chartH;
      return { x, y, value: d.value, timestamp: d.timestamp };
    });

    const linePathStr = computedPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
      .join(" ");

    const areaPathStr = `${linePathStr} L ${computedPoints[computedPoints.length - 1].x},${chartH} L ${computedPoints[0].x},${chartH} Z`;

    // X-axis labels: pick ~5 evenly spaced
    const labelCount = Math.min(5, data.length);
    const computedXLabels: { x: number; label: string }[] = [];
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      computedXLabels.push({
        x: computedPoints[idx].x,
        label: formatTime(data[idx].timestamp),
      });
    }

    return {
      points: computedPoints,
      linePath: linePathStr,
      areaPath: areaPathStr,
      yMin: computedYMin,
      yMax: computedYMax,
      yTicks: computedYTicks,
      xLabels: computedXLabels,
    };
  }, [data, chartW, chartH, thresholds]);

  if (data.length < 2) return null;

  const thresholdY = (val: number) =>
    chartH - ((val - yMin) / (yMax - yMin)) * chartH;

  const lastPoint = points[points.length - 1];
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div
      data-testid={sensorId ? `sensor-chart-${sensorId}` : undefined}
      className="relative"
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[var(--nav-text-muted)] uppercase tracking-wider font-semibold">
          {label}
        </span>
        {lastPoint && (
          <span
            className="text-xs font-mono font-semibold"
            style={{ color: colors.line }}
          >
            {lastPoint.value.toFixed(1)}{unit}
          </span>
        )}
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="select-none"
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.fill} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y-axis grid lines and labels */}
          {yTicks.map((tick, i) => {
            const y = thresholdY(tick);
            return (
              <g key={i}>
                <line
                  x1={0}
                  y1={y}
                  x2={chartW}
                  y2={y}
                  stroke="var(--nav-border-subtle)"
                  strokeWidth={0.5}
                  strokeDasharray="2,3"
                />
                <text
                  x={-6}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--nav-text-muted)"
                  fontSize={9}
                  fontFamily="var(--font-mono, monospace)"
                >
                  {tick.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Warning threshold line */}
          {thresholds?.warningHigh !== undefined && (
            <line
              x1={0}
              y1={thresholdY(thresholds.warningHigh)}
              x2={chartW}
              y2={thresholdY(thresholds.warningHigh)}
              stroke="#ffab00"
              strokeWidth={1}
              strokeDasharray="4,3"
              opacity={0.6}
            />
          )}

          {/* Critical threshold line */}
          {thresholds?.criticalHigh !== undefined && (
            <line
              x1={0}
              y1={thresholdY(thresholds.criticalHigh)}
              x2={chartW}
              y2={thresholdY(thresholds.criticalHigh)}
              stroke="#ff1744"
              strokeWidth={1}
              strokeDasharray="4,3"
              opacity={0.6}
            />
          )}

          {/* Area fill */}
          <path d={areaPath} fill={`url(#${id}-fill)`} />

          {/* Animated line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={colors.line}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 3px ${colors.fill})` }}
          />

          {/* Current value dot with glow */}
          {lastPoint && (
            <motion.circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={4}
              fill={colors.line}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
              style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
            />
          )}

          {/* Hover crosshair + tooltip */}
          {hoverPoint && (
            <>
              <line
                x1={hoverPoint.x}
                y1={0}
                x2={hoverPoint.x}
                y2={chartH}
                stroke={colors.line}
                strokeWidth={0.5}
                opacity={0.4}
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r={3.5}
                fill={colors.line}
                stroke="var(--nav-bg-secondary)"
                strokeWidth={1.5}
              />
            </>
          )}

          {/* X-axis labels */}
          {xLabels.map((xl, i) => (
            <text
              key={i}
              x={xl.x}
              y={chartH + 16}
              textAnchor="middle"
              fill="var(--nav-text-muted)"
              fontSize={9}
              fontFamily="var(--font-mono, monospace)"
            >
              {xl.label}
            </text>
          ))}

          {/* Invisible hover rects */}
          {points.map((p, i) => {
            const rectW = chartW / points.length;
            return (
              <rect
                key={i}
                x={p.x - rectW / 2}
                y={0}
                width={rectW}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoverPoint && (
        <div
          className="absolute pointer-events-none px-2 py-1 rounded bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] shadow-lg"
          style={{
            left: margin.left + hoverPoint.x + 8,
            top: margin.top + hoverPoint.y - 28,
            transform: hoverPoint.x > chartW * 0.7 ? "translateX(-110%)" : undefined,
          }}
        >
          <div className="text-[10px] font-mono text-[var(--nav-text-primary)]">
            {hoverPoint.value.toFixed(1)}{unit}
          </div>
          <div className="text-[9px] text-[var(--nav-text-muted)]">
            {formatTime(hoverPoint.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
}
