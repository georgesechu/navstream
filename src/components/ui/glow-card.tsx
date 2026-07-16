"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function GlowCard({
  children,
  accent = "cyan",
  className,
  delay = 0,
  hoverable = true,
  "data-testid": testId,
}: {
  children: ReactNode;
  accent?: "cyan" | "green" | "amber" | "magenta";
  className?: string;
  delay?: number;
  hoverable?: boolean;
  "data-testid"?: string;
}) {
  const hoverGlows: Record<string, string> = {
    cyan: "hover:shadow-[0_0_24px_rgba(0,229,255,0.08)] hover:border-cyan/30",
    green: "hover:shadow-[0_0_24px_rgba(0,230,118,0.08)] hover:border-green/30",
    amber: "hover:shadow-[0_0_24px_rgba(255,171,0,0.08)] hover:border-amber/30",
    magenta: "hover:shadow-[0_0_24px_rgba(224,64,251,0.08)] hover:border-magenta/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      data-testid={testId}
      className={cn(
        "rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)]",
        "transition-all duration-300",
        hoverable && hoverGlows[accent],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
