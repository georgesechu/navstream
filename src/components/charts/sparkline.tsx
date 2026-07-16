"use client";

import { motion } from "framer-motion";
import { useId } from "react";

export function Sparkline({
  data,
  width = 160,
  height = 40,
  accent = "cyan",
  delay = 0,
}: {
  data: number[];
  width?: number;
  height?: number;
  accent?: "cyan" | "green" | "amber" | "magenta";
  delay?: number;
}) {
  const id = useId();

  const colors: Record<string, { line: string; fill: string }> = {
    cyan: { line: "#00e5ff", fill: "rgba(0,229,255,0.1)" },
    green: { line: "#00e676", fill: "rgba(0,230,118,0.1)" },
    amber: { line: "#ffab00", fill: "rgba(255,171,0,0.1)" },
    magenta: { line: "#e040fb", fill: "rgba(224,64,251,0.1)" },
  };

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`;
  const color = colors[accent];

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color.fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id}-fill)`} />
      <motion.path
        d={linePath}
        fill="none"
        stroke={color.line}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: delay + 0.1, duration: 1, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 4px ${color.fill})` }}
      />
      {/* Current value dot */}
      <motion.circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={3}
        fill={color.line}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 1, type: "spring" }}
        style={{ filter: `drop-shadow(0 0 4px ${color.line})` }}
      />
    </motion.svg>
  );
}
