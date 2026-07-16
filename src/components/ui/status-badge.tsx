"use client";

import { cn } from "@/lib/utils";

const variants = {
  online: "bg-green/10 text-green border-green/20",
  warning: "bg-amber/10 text-amber border-amber/20",
  critical: "bg-red/10 text-red border-red/20",
  offline: "bg-[var(--nav-text-muted)]/10 text-[var(--nav-text-muted)] border-[var(--nav-text-muted)]/20",
  info: "bg-cyan/10 text-cyan border-cyan/20",
  live: "bg-green/10 text-green border-green/20",
};

export function StatusBadge({
  status,
  label,
  pulse = false,
  "data-testid": testId,
}: {
  status: keyof typeof variants;
  label?: string;
  pulse?: boolean;
  "data-testid"?: string;
}) {
  const dotColors: Record<string, string> = {
    online: "bg-green",
    warning: "bg-amber",
    critical: "bg-red",
    offline: "bg-[var(--nav-text-muted)]",
    info: "bg-cyan",
    live: "bg-green",
  };

  return (
    <span
      data-testid={testId || `status-badge-${status}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium",
        variants[status]
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          dotColors[status],
          pulse && "status-online"
        )}
      />
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
