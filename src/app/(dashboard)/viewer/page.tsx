"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Camera,
  Eye,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Layers,
  MapPin,
  X,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { PanoramaHotspot } from "@/components/viewer/panorama-viewer";
import type { PanoramaScene } from "@/lib/generate-panorama";

const PanoramaViewer = dynamic(
  () =>
    import("@/components/viewer/panorama-viewer").then(
      (mod) => mod.PanoramaViewer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[var(--nav-bg-primary)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-magenta/30 border-t-magenta rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--nav-text-muted)]">
            Loading 360 viewer...
          </p>
        </div>
      </div>
    ),
  }
);

interface SceneConfig {
  id: string;
  name: string;
  site: string;
  siteId: string;
  panoramaType: PanoramaScene;
  /** Optional real equirectangular image URL — overrides procedural panorama */
  imageUrl?: string;
  hotspots: PanoramaHotspot[];
  captured: string;
}

const scenes: SceneConfig[] = [
  {
    id: "scene-1",
    name: "Control Room",
    site: "Kalgoorlie Gold Mine",
    siteId: "site-kalgoorlie",
    panoramaType: "control-room",
    imageUrl: "/panoramas/office-hall.jpg",
    captured: "2 hours ago",
    hotspots: [
      {
        id: "hs-1",
        label: "Generator Panel",
        lat: -5,
        lng: -60,
        type: "info",
      },
      {
        id: "hs-2",
        label: "Exit Door",
        lat: 0,
        lng: 120,
        type: "navigation",
      },
      {
        id: "hs-3",
        label: "HVAC Unit",
        lat: 25,
        lng: 30,
        type: "info",
      },
      {
        id: "hs-4",
        label: "Next: Corridor B",
        lat: -3,
        lng: -150,
        type: "navigation",
      },
    ],
  },
  {
    id: "scene-2",
    name: "Main Shaft Entry",
    site: "Kalgoorlie Gold Mine",
    siteId: "site-kalgoorlie",
    panoramaType: "industrial",
    imageUrl: "/panoramas/abandoned-plant.jpg",
    captured: "1 day ago",
    hotspots: [
      {
        id: "hs-5",
        label: "Ventilation Intake",
        lat: 30,
        lng: 45,
        type: "info",
      },
      {
        id: "hs-6",
        label: "Shaft Elevator",
        lat: -10,
        lng: -90,
        type: "navigation",
      },
    ],
  },
  {
    id: "scene-3",
    name: "Processing Floor",
    site: "Broken Hill Processing",
    siteId: "site-broken-hill",
    panoramaType: "industrial",
    imageUrl: "/panoramas/printing-facility.jpg",
    captured: "3 hours ago",
    hotspots: [
      {
        id: "hs-7",
        label: "Crusher Unit A",
        lat: -5,
        lng: -45,
        type: "info",
      },
      {
        id: "hs-8",
        label: "Conveyor Belt B",
        lat: 10,
        lng: 60,
        type: "info",
      },
      {
        id: "hs-9",
        label: "Control Room",
        lat: 0,
        lng: 170,
        type: "navigation",
      },
      {
        id: "hs-10",
        label: "Overheating Warning",
        lat: -15,
        lng: -120,
        type: "alert",
      },
      {
        id: "hs-11",
        label: "Pump Station",
        lat: -5,
        lng: 130,
        type: "navigation",
      },
      {
        id: "hs-12",
        label: "Safety Shower",
        lat: -10,
        lng: -10,
        type: "info",
      },
    ],
  },
  {
    id: "scene-4",
    name: "Tank Farm",
    site: "Darwin LNG Terminal",
    siteId: "site-darwin",
    panoramaType: "outdoor",
    imageUrl: "/panoramas/dolomites.jpg",
    captured: "5 hours ago",
    hotspots: [
      {
        id: "hs-13",
        label: "Tank 1 - Level Sensor",
        lat: -10,
        lng: -50,
        type: "info",
      },
      {
        id: "hs-14",
        label: "Valve Station",
        lat: -5,
        lng: 80,
        type: "info",
      },
      {
        id: "hs-15",
        label: "Leak Alert Zone",
        lat: -15,
        lng: 160,
        type: "alert",
      },
    ],
  },
  {
    id: "scene-5",
    name: "Pump Station",
    site: "Broken Hill Processing",
    siteId: "site-broken-hill",
    panoramaType: "pump-station",
    imageUrl: "/panoramas/machinery-room.jpg",
    captured: "12 hours ago",
    hotspots: [
      {
        id: "hs-16",
        label: "Pump Unit 1",
        lat: -10,
        lng: -60,
        type: "info",
      },
      {
        id: "hs-17",
        label: "Bearing Failure",
        lat: -8,
        lng: 30,
        type: "alert",
      },
    ],
  },
];

export default function ViewerPage() {
  return (
    <Suspense>
      <ViewerPageContent />
    </Suspense>
  );
}

function ViewerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const siteFilter = searchParams.get("site");

  // Filter scenes to those matching the site param, or show all
  const { filteredScenes, hasMatchedFilter } = useMemo(() => {
    if (!siteFilter) return { filteredScenes: scenes, hasMatchedFilter: false };
    // Match by siteId first (e.g., "site-broken-hill"), then fall back to site name
    const matched = scenes.filter(
      (s) =>
        s.siteId === siteFilter ||
        s.site.toLowerCase().includes(siteFilter.toLowerCase())
    );
    return matched.length > 0
      ? { filteredScenes: matched, hasMatchedFilter: true }
      : { filteredScenes: scenes, hasMatchedFilter: false };
  }, [siteFilter]);

  const [activeScene, setActiveScene] = useState(0);
  const [showHotspots, setShowHotspots] = useState(true);
  const [panoramaUrls, setPanoramaUrls] = useState<Record<string, string>>({});
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const scene = filteredScenes[activeScene] ?? filteredScenes[0];

  // Reset active scene when filter changes
  useEffect(() => {
    setActiveScene(0);
  }, [siteFilter]);

  // Generate panorama images on mount (client-side only)
  useEffect(() => {
    import("@/lib/generate-panorama").then(({ generatePanoramaDataUrl }) => {
      const urls: Record<string, string> = {};
      const uniqueTypes = new Set(scenes.map((s) => s.panoramaType));
      uniqueTypes.forEach((type) => {
        urls[type] = generatePanoramaDataUrl(type);
      });
      setPanoramaUrls(urls);
    });
  }, []);

  // Prefer real image URL over procedural panorama
  const currentImageUrl = scene.imageUrl || panoramaUrls[scene.panoramaType];

  const currentHotspots = useMemo(
    () => (showHotspots ? scene.hotspots : []),
    [showHotspots, scene.hotspots]
  );

  const handleHotspotClick = useCallback(
    (id: string) => {
      // Find the hotspot across filtered scenes
      for (let i = 0; i < filteredScenes.length; i++) {
        const hs = filteredScenes[i].hotspots.find((h) => h.id === id);
        if (hs && hs.type === "navigation") {
          // Navigate to a different scene — find the next one or loop
          const targetIndex = (i + 1) % filteredScenes.length;
          setActiveScene(targetIndex !== activeScene ? targetIndex : 0);
          return;
        }
      }
    },
    [activeScene]
  );

  const handlePrevScene = useCallback(() => {
    setActiveScene((prev) => (prev === 0 ? filteredScenes.length - 1 : prev - 1));
  }, [filteredScenes.length]);

  const handleNextScene = useCallback(() => {
    setActiveScene((prev) => (prev === filteredScenes.length - 1 ? 0 : prev + 1));
  }, [filteredScenes.length]);

  const handleZoomIn = useCallback(() => {
    const el = viewerContainerRef.current?.querySelector(
      '[data-testid="panorama-viewer"]'
    ) as HTMLElement | null;
    const controls = el
      ? (el as unknown as Record<string, unknown>).__panoramaControls
      : null;
    if (controls && typeof (controls as Record<string, unknown>).zoomIn === "function") {
      (controls as { zoomIn: () => void }).zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const el = viewerContainerRef.current?.querySelector(
      '[data-testid="panorama-viewer"]'
    ) as HTMLElement | null;
    const controls = el
      ? (el as unknown as Record<string, unknown>).__panoramaControls
      : null;
    if (controls && typeof (controls as Record<string, unknown>).zoomOut === "function") {
      (controls as { zoomOut: () => void }).zoomOut();
    }
  }, []);

  const handleResetView = useCallback(() => {
    const el = viewerContainerRef.current?.querySelector(
      '[data-testid="panorama-viewer"]'
    ) as HTMLElement | null;
    const controls = el
      ? (el as unknown as Record<string, unknown>).__panoramaControls
      : null;
    if (controls && typeof (controls as Record<string, unknown>).resetView === "function") {
      (controls as { resetView: () => void }).resetView();
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = viewerContainerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen().catch(() => {
        // Fullscreen not supported
      });
    }
  }, []);

  const toolbarButtons = useMemo(
    () => [
      { icon: ZoomIn, label: "Zoom In", action: handleZoomIn },
      { icon: ZoomOut, label: "Zoom Out", action: handleZoomOut },
      { icon: RotateCcw, label: "Reset View", action: handleResetView },
      { icon: Crosshair, label: "Center", action: handleResetView },
      { icon: Maximize2, label: "Fullscreen", action: handleFullscreen },
    ],
    [handleZoomIn, handleZoomOut, handleResetView, handleFullscreen]
  );

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-6 h-[calc(100vh-3.5rem)]">
        <PageHeader
          title="360° Viewer"
          subtitle="Immersive panorama walkthrough"
          accent="magenta"
          actions={
            <StatusBadge status="info" label={`${filteredScenes.length} Scenes`} />
          }
        />

        {/* Site context banner */}
        {siteFilter && hasMatchedFilter && (
          <div
            data-testid="viewer-site-context"
            className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-magenta/20 bg-magenta/5"
          >
            <p className="text-sm text-[var(--nav-text-secondary)]">
              Showing scenes for{" "}
              <span className="font-semibold text-magenta">
                {filteredScenes[0]?.site}
              </span>
            </p>
            <button
              onClick={() => router.push("/viewer")}
              data-testid="viewer-site-context-clear"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-[var(--nav-text-muted)] hover:text-[var(--nav-text-secondary)] hover:bg-[var(--nav-bg-hover)] transition-colors"
            >
              <X className="w-3 h-3" />
              Show All
            </button>
          </div>
        )}

        {/* Fallback when site filter matches no scenes */}
        {siteFilter && !hasMatchedFilter && (
          <div
            data-testid="viewer-no-scenes"
            className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-amber/20 bg-amber/5"
          >
            <p className="text-sm text-[var(--nav-text-secondary)]">
              No 360° scenes available for this site. Showing all scenes.
            </p>
            <button
              onClick={() => router.push("/viewer")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-[var(--nav-text-muted)] hover:text-[var(--nav-text-secondary)] hover:bg-[var(--nav-bg-hover)] transition-colors"
            >
              <X className="w-3 h-3" />
              Dismiss
            </button>
          </div>
        )}

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Main viewer */}
          <div
            ref={viewerContainerRef}
            data-testid="viewer-360"
            className="flex-1 relative rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-primary)] overflow-hidden"
          >
            {/* Three.js panorama viewer */}
            <div className="absolute inset-0">
              <PanoramaViewer
                imageUrl={currentImageUrl}
                hotspots={currentHotspots}
                onHotspotClick={handleHotspotClick}
                autoRotate
              />
            </div>

            {/* Viewer controls overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)] pointer-events-none">
              <Eye className="w-3 h-3 text-magenta" />
              <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
                360° VIEW
              </span>
            </div>

            {/* Scene info */}
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)] pointer-events-none">
              <p className="text-xs font-medium text-[var(--nav-text-primary)]">
                {scene.name}
              </p>
              <p className="text-[10px] text-[var(--nav-text-muted)]">
                {scene.site} · {scene.captured}
              </p>
            </div>

            {/* Navigation arrows */}
            <button
              data-testid="viewer-nav-prev"
              aria-label="Previous view"
              onClick={handlePrevScene}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[var(--nav-bg-primary)]/60 backdrop-blur border border-[var(--nav-border)] text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-primary)]/80 transition-all z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              data-testid="viewer-nav-next"
              aria-label="Next view"
              onClick={handleNextScene}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[var(--nav-bg-primary)]/60 backdrop-blur border border-[var(--nav-border)] text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-primary)]/80 transition-all z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Bottom toolbar */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[var(--nav-bg-primary)]/80 backdrop-blur-sm border border-[var(--nav-border)] z-10">
              {toolbarButtons.map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  title={label}
                  onClick={action}
                  className="p-2 rounded-lg text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-hover)] transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
              <div className="w-px h-5 bg-[var(--nav-border)] mx-1" />
              <button
                onClick={() => setShowHotspots(!showHotspots)}
                data-testid="viewer-toggle-hotspots"
                aria-label="Toggle hotspots"
                aria-pressed={showHotspots}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showHotspots
                    ? "text-magenta bg-magenta/10"
                    : "text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-hover)]"
                )}
                title="Toggle Hotspots"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scene list sidebar */}
          <div className="w-64 flex flex-col gap-3 overflow-y-auto flex-shrink-0">
            <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1">
              Scenes ({filteredScenes.length})
            </h2>
            {filteredScenes.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveScene(i)}
                data-testid={`viewer-scene-${s.id}`}
                aria-pressed={i === activeScene}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                  i === activeScene
                    ? "border-magenta/30 bg-magenta/5 shadow-[0_0_16px_rgba(224,64,251,0.08)]"
                    : "border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] hover:bg-[var(--nav-bg-tertiary)] hover:border-[var(--nav-bg-hover)]"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    i === activeScene
                      ? "bg-magenta/10 text-magenta"
                      : "bg-[var(--nav-bg-tertiary)] text-[var(--nav-text-muted)]"
                  )}
                >
                  <Camera className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      i === activeScene
                        ? "text-magenta"
                        : "text-[var(--nav-text-primary)]"
                    )}
                  >
                    {s.name}
                  </p>
                  <p className="text-[10px] text-[var(--nav-text-muted)] mt-0.5 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    {s.site}
                  </p>
                  <p className="text-[10px] text-[var(--nav-text-muted)]">
                    {s.hotspots.length} hotspots · {s.captured}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
