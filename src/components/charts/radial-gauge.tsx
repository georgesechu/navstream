"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function RadialGauge({
  value,
  max = 100,
  label,
  unit = "%",
  size = 120,
  accent = "cyan",
  delay = 0,
}: {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  size?: number;
  accent?: "cyan" | "green" | "amber" | "magenta" | "red";
  delay?: number;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors: Record<string, { stroke: string; glow: string }> = {
    cyan: { stroke: "#00e5ff", glow: "drop-shadow(0 0 6px rgba(0,229,255,0.4))" },
    green: { stroke: "#00e676", glow: "drop-shadow(0 0 6px rgba(0,230,118,0.4))" },
    amber: { stroke: "#ffab00", glow: "drop-shadow(0 0 6px rgba(255,171,0,0.4))" },
    magenta: { stroke: "#e040fb", glow: "drop-shadow(0 0 6px rgba(224,64,251,0.4))" },
    red: { stroke: "#ff1744", glow: "drop-shadow(0 0 6px rgba(255,23,68,0.4))" },
  };

  const color = colors[accent];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--nav-border)"
            strokeWidth={strokeWidth}
          />
          {/* Value arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ delay: delay + 0.2, duration: 1, ease: "easeOut" }}
            style={{ filter: color.glow }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono text-[var(--nav-text-primary)]">
            {value}
          </span>
          <span className="text-[10px] text-[var(--nav-text-muted)]">
            {unit}
          </span>
        </div>
      </div>
      <span className="text-[11px] text-[var(--nav-text-secondary)] font-medium">
        {label}
      </span>
    </motion.div>
  );
}
