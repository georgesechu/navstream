"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function MapSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[var(--nav-bg-primary)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-cyan animate-spin" />
        <span className="text-xs text-[var(--nav-text-muted)] font-mono">
          Loading map...
        </span>
      </div>
    </div>
  );
}

export const DynamicMap = dynamic(
  () => import("./leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);
