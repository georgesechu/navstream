"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BarData {
  label: string;
  value: number;
  accent?: "cyan" | "green" | "amber" | "magenta" | "red";
}

export function BarChart({
  data,
  maxValue,
  delay = 0,
}: {
  data: BarData[];
  maxValue?: number;
  delay?: number;
}) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  const barColors: Record<string, string> = {
    cyan: "bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.3)]",
    green: "bg-green shadow-[0_0_8px_rgba(0,230,118,0.3)]",
    amber: "bg-amber shadow-[0_0_8px_rgba(255,171,0,0.3)]",
    magenta: "bg-magenta shadow-[0_0_8px_rgba(224,64,251,0.3)]",
    red: "bg-red shadow-[0_0_8px_rgba(255,23,68,0.3)]",
  };

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((item, i) => {
        const percentage = (item.value / max) * 100;
        const accent = item.accent || "cyan";

        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + i * 0.05 }}
            className="flex items-center gap-3"
          >
            <span className="text-[11px] text-[var(--nav-text-muted)] w-20 truncate text-right">
              {item.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-[var(--nav-bg-tertiary)] overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", barColors[accent])}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{
                  delay: delay + 0.2 + i * 0.05,
                  duration: 0.8,
                  ease: "easeOut",
                }}
              />
            </div>
            <span className="text-xs font-mono text-[var(--nav-text-secondary)] w-10 text-right">
              {item.value}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
