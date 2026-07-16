"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  accent = "cyan",
  actions,
}: {
  title: string;
  subtitle: string;
  accent?: "cyan" | "green" | "amber" | "magenta";
  actions?: React.ReactNode;
}) {
  const accentColors = {
    cyan: "bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.4)]",
    green: "bg-green shadow-[0_0_8px_rgba(0,230,118,0.4)]",
    amber: "bg-amber shadow-[0_0_8px_rgba(255,171,0,0.4)]",
    magenta: "bg-magenta shadow-[0_0_8px_rgba(224,64,251,0.4)]",
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-[var(--nav-text-primary)] flex items-center gap-2">
          <span
            className={cn("w-1.5 h-5 rounded-full", accentColors[accent])}
          />
          {title}
        </h1>
        <p className="text-sm text-[var(--nav-text-muted)] mt-1">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
