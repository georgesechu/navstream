"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { WebRTCPlayer, type ConnectionState } from "@/components/streaming/webrtc-player";
import { useCameraFeeds, type CameraFeedData } from "@/hooks/use-camera-feeds";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Camera,
  Maximize2,
  Volume2,
  VolumeX,
  Circle,
  MoreVertical,
  Grid3x3,
  Grid2x2,
  Rows3,
  RefreshCw,
  X,
} from "lucide-react";
import { useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Fallback mock feeds for when the DB is unreachable
const mockFeeds: FeedItem[] = [
  {
    id: "feed-1",
    name: "Control Room - Cam 1",
    site: "Kalgoorlie Gold Mine",
    status: "live" as const,
    resolution: "1080p",
    fps: 30,
    type: "PTZ",
    recording: true,
    streamId: "cam-control-room",
  },
  {
    id: "feed-2",
    name: "Main Shaft Entry",
    site: "Kalgoorlie Gold Mine",
    status: "live" as const,
    resolution: "4K",
    fps: 24,
    type: "Fixed",
    recording: true,
    streamId: "cam-main-shaft",
  },
  {
    id: "feed-3",
    name: "Processing Floor",
    site: "Broken Hill Processing",
    status: "live" as const,
    resolution: "1080p",
    fps: 30,
    type: "360°",
    recording: false,
    streamId: "cam-processing",
  },
  {
    id: "feed-4",
    name: "Thermal - Furnace A",
    site: "Broken Hill Processing",
    status: "live" as const,
    resolution: "640p",
    fps: 15,
    type: "IR",
    recording: true,
    streamId: "cam-thermal-furnace",
  },
  {
    id: "feed-5",
    name: "Perimeter Gate North",
    site: "Pilbara Iron Ore",
    status: "live" as const,
    resolution: "1080p",
    fps: 24,
    type: "Fixed",
    recording: false,
    streamId: "cam-perimeter",
  },
  {
    id: "feed-6",
    name: "Server Room A",
    site: "Svalbard Data Center",
    status: "offline" as const,
    resolution: "—",
    fps: 0,
    type: "Fixed",
    recording: false,
    streamId: "",
  },
  {
    id: "feed-7",
    name: "Solar Array Block 4",
    site: "Atacama Solar Farm",
    status: "live" as const,
    resolution: "4K",
    fps: 10,
    type: "PTZ",
    recording: true,
    streamId: "cam-solar-array",
  },
  {
    id: "feed-8",
    name: "LNG Tank Farm",
    site: "Darwin LNG Terminal",
    status: "live" as const,
    resolution: "1080p",
    fps: 30,
    type: "Fixed",
    recording: true,
    streamId: "cam-lng-tank",
  },
  {
    id: "feed-9",
    name: "Drone - Aerial Survey",
    site: "Pilbara Iron Ore",
    status: "live" as const,
    resolution: "4K",
    fps: 60,
    type: "Drone",
    recording: true,
    streamId: "cam-360-pump-station",
  },
];

interface FeedItem {
  id: string;
  name: string;
  site: string;
  status: "live" | "offline";
  resolution: string;
  fps: number;
  type: string;
  recording: boolean;
  streamId: string;
}

type GridLayout = "2x2" | "3x3" | "list";

/** Map DB camera type to display label */
function mapCameraType(type: string): string {
  const typeMap: Record<string, string> = {
    fixed: "Fixed",
    ptz: "PTZ",
    "360": "360°",
    thermal: "IR",
    drone: "Drone",
  };
  return typeMap[type.toLowerCase()] || type;
}

/** Convert DB camera feed to FeedItem */
function dbFeedToFeedItem(feed: CameraFeedData): FeedItem {
  return {
    id: feed.id,
    name: feed.name,
    site: feed.siteName,
    status: feed.isLive ? "live" : "offline",
    resolution: feed.resolution || "—",
    fps: feed.fps || 0,
    type: mapCameraType(feed.type),
    recording: feed.isRecording,
    streamId: feed.streamId,
  };
}

function FeedTile({
  feed,
  index,
  layout,
}: {
  feed: FeedItem;
  index: number;
  layout: GridLayout;
}) {
  const [muted, setMuted] = useState(true);
  const [webrtcState, setWebrtcState] = useState<ConnectionState>("connecting");
  const isOffline = feed.status === "offline";
  const hasStream = !isOffline && feed.streamId;

  const handleConnectionChange = useCallback((state: ConnectionState) => {
    setWebrtcState(state);
  }, []);

  // Derive the LIVE badge status from WebRTC connection state
  const badgeStatus = isOffline
    ? "offline"
    : webrtcState === "connected"
      ? "live"
      : webrtcState === "failed"
        ? "offline"
        : "live"; // connecting/disconnected still show as live (attempting)

  const badgeLabel = isOffline
    ? "OFFLINE"
    : webrtcState === "connected"
      ? "LIVE"
      : webrtcState === "failed"
        ? "OFFLINE"
        : "LIVE";

  const badgePulse = !isOffline && webrtcState === "connected";

  const typeColors: Record<string, string> = {
    PTZ: "text-cyan",
    Fixed: "text-[var(--nav-text-muted)]",
    "360°": "text-magenta",
    IR: "text-amber",
    Drone: "text-green",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      data-testid={`feed-tile-${feed.id}`}
      className={cn(
        "group relative rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] overflow-hidden",
        "hover:border-[var(--nav-bg-hover)] transition-all duration-300",
        layout === "list" ? "flex items-center" : "flex flex-col"
      )}
    >
      {/* Video area */}
      <div
        className={cn(
          "relative bg-[var(--nav-bg-primary)] overflow-hidden",
          layout === "list"
            ? "w-48 h-28 flex-shrink-0"
            : "aspect-video w-full"
        )}
      >
        {isOffline ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-6 h-6 text-[var(--nav-text-muted)] mx-auto mb-1" />
              <span className="text-[10px] text-[var(--nav-text-muted)]">
                OFFLINE
              </span>
            </div>
          </div>
        ) : hasStream ? (
          <>
            {/* WebRTC Player */}
            <WebRTCPlayer
              streamId={feed.streamId}
              autoPlay
              muted={muted}
              onConnectionChange={handleConnectionChange}
              className="absolute inset-0"
            />

            {/* Hover expand overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-[var(--nav-bg-primary)]/60 backdrop-blur flex items-center justify-center border border-[var(--nav-border)]">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Static placeholder (no stream ID) */}
            <div className="absolute inset-0 grid-pattern opacity-30" />
            <motion.div
              className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent"
              animate={{ top: ["0%", "100%"] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-magenta/5" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-[var(--nav-bg-primary)]/60 backdrop-blur flex items-center justify-center border border-[var(--nav-border)]">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </>
        )}

        {/* Top overlays */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20">
          <StatusBadge
            status={badgeStatus === "live" ? "live" : "offline"}
            label={badgeLabel}
            pulse={badgePulse}
          />
          {feed.recording && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red/20 border border-red/30">
              <Circle className="w-2 h-2 text-red fill-red glow-pulse" />
              <span className="text-[9px] font-mono text-red">REC</span>
            </div>
          )}
        </div>

        {/* Bottom overlay */}
        {!isOffline && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <span className="text-[9px] font-mono text-[var(--nav-text-muted)] bg-[var(--nav-bg-primary)]/60 px-1.5 py-0.5 rounded">
              {feed.resolution} · {feed.fps}fps
            </span>
            <button
              onClick={() => setMuted(!muted)}
              aria-label={muted ? "Unmute" : "Mute"}
              aria-pressed={!muted}
              data-testid={`feed-tile-${feed.id}-mute-btn`}
              className="p-1 rounded bg-[var(--nav-bg-primary)]/60 text-[var(--nav-text-muted)] hover:text-white transition-colors"
            >
              {muted ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className={cn("flex-1 p-3", layout === "list" && "flex items-center justify-between")}>
        <div>
          <p className="text-sm font-medium text-[var(--nav-text-primary)] truncate">
            {feed.name}
          </p>
          <p className="text-[11px] text-[var(--nav-text-muted)] mt-0.5 flex items-center gap-1.5">
            <span>{feed.site}</span>
            <span className="text-[var(--nav-border)]">/</span>
            <span className={typeColors[feed.type]}>{feed.type}</span>
          </p>
        </div>
        {layout === "list" && (
          <div className="flex items-center gap-3">
            {!isOffline && (
              <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
                {feed.resolution} · {feed.fps}fps
              </span>
            )}
            <button className="p-1.5 rounded-lg hover:bg-[var(--nav-bg-hover)] transition-colors">
              <MoreVertical className="w-4 h-4 text-[var(--nav-text-muted)]" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function FeedsPage() {
  return (
    <Suspense>
      <FeedsPageContent />
    </Suspense>
  );
}

function FeedsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const siteFilter = searchParams.get("site");

  const [layout, setLayout] = useState<GridLayout>("3x3");
  const { feeds: dbFeeds, isLoading, error, refetch } = useCameraFeeds();

  // Convert DB feeds to FeedItems, falling back to mock data if API fails
  const feeds: FeedItem[] =
    !isLoading && (error || dbFeeds.length === 0)
      ? mockFeeds
      : dbFeeds.length > 0
        ? dbFeeds.map(dbFeedToFeedItem)
        : mockFeeds;

  // Derive the site name from DB feeds matching the siteId filter
  const filteredSiteName = useMemo(() => {
    if (!siteFilter) return null;
    const dbFeed = dbFeeds.find((f) => f.siteId === siteFilter);
    if (dbFeed) return dbFeed.siteName;
    // Fallback: check mock feeds by site name partial match
    const mockFeed = mockFeeds.find((f) =>
      f.site.toLowerCase().includes(siteFilter.toLowerCase())
    );
    return mockFeed?.site ?? null;
  }, [siteFilter, dbFeeds]);

  // Split feeds into site-specific and other when filtering
  const { siteFeeds, otherFeeds } = useMemo(() => {
    if (!siteFilter) return { siteFeeds: feeds, otherFeeds: [] };

    const site: FeedItem[] = [];
    const other: FeedItem[] = [];

    // Check against DB feed siteIds first
    const dbSiteIds = new Set(
      dbFeeds.filter((f) => f.siteId === siteFilter).map((f) => f.id)
    );

    for (const feed of feeds) {
      if (dbSiteIds.has(feed.id)) {
        site.push(feed);
      } else if (dbSiteIds.size === 0 && feed.site.toLowerCase().includes(siteFilter.toLowerCase())) {
        // Fallback for mock feeds: match by site name
        site.push(feed);
      } else {
        other.push(feed);
      }
    }

    return { siteFeeds: site, otherFeeds: other };
  }, [siteFilter, feeds, dbFeeds]);

  const liveCount = feeds.filter((f) => f.status === "live").length;

  const handleClearFilter = useCallback(() => {
    router.push("/feeds");
  }, [router]);

  const gridClasses: Record<GridLayout, string> = {
    "2x2": "grid grid-cols-1 md:grid-cols-2 gap-4",
    "3x3": "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4",
    list: "flex flex-col gap-3",
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Live Feeds"
          subtitle={`${liveCount} cameras streaming · ${feeds.length} total feeds`}
          accent="green"
          actions={
            <>
              <div className="flex items-center rounded-lg border border-[var(--nav-border)] overflow-hidden">
                {(
                  [
                    { key: "2x2", icon: Grid2x2 },
                    { key: "3x3", icon: Grid3x3 },
                    { key: "list", icon: Rows3 },
                  ] as const
                ).map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setLayout(key)}
                    data-testid={`feeds-layout-toggle-${key}`}
                    aria-label={`Switch to ${key} layout`}
                    aria-pressed={layout === key}
                    className={cn(
                      "p-2 transition-colors",
                      layout === key
                        ? "bg-cyan/10 text-cyan"
                        : "text-[var(--nav-text-muted)] hover:text-[var(--nav-text-secondary)] hover:bg-[var(--nav-bg-hover)]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <button
                onClick={refetch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)] text-[var(--nav-text-muted)] text-xs hover:text-[var(--nav-text-secondary)] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </>
          }
        />

        {/* Site context banner */}
        {siteFilter && filteredSiteName && (
          <div
            data-testid="feeds-site-context"
            className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-cyan/20 bg-cyan/5"
          >
            <p className="text-sm text-[var(--nav-text-secondary)]">
              Showing cameras for{" "}
              <span className="font-semibold text-cyan">{filteredSiteName}</span>
            </p>
            <button
              onClick={handleClearFilter}
              data-testid="feeds-site-context-clear"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-[var(--nav-text-muted)] hover:text-[var(--nav-text-secondary)] hover:bg-[var(--nav-bg-hover)] transition-colors"
            >
              <X className="w-3 h-3" />
              Show All
            </button>
          </div>
        )}

        {isLoading ? (
          <div data-testid="feeds-grid-skeleton" className={gridClasses[layout]}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] overflow-hidden"
              >
                <div className="animate-pulse bg-[var(--nav-bg-tertiary)] aspect-video w-full" />
                <div className="p-3 space-y-2">
                  <div className="animate-pulse rounded bg-[var(--nav-bg-tertiary)] h-4 w-3/4" />
                  <div className="animate-pulse rounded bg-[var(--nav-bg-tertiary)] h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : siteFilter ? (
          <>
            {/* Site-specific cameras */}
            {siteFeeds.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-3">
                  {filteredSiteName ?? "Site"} Cameras ({siteFeeds.length})
                </h2>
                <div data-testid="feeds-grid" className={gridClasses[layout]}>
                  {siteFeeds.map((feed, i) => (
                    <FeedTile key={feed.id} feed={feed} index={i} layout={layout} />
                  ))}
                </div>
              </div>
            )}

            {/* Other cameras (dimmed) */}
            {otherFeeds.length > 0 && (
              <div className="opacity-50 hover:opacity-80 transition-opacity duration-300">
                <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider mb-3">
                  Other Cameras ({otherFeeds.length})
                </h2>
                <div data-testid="feeds-grid-other" className={gridClasses[layout]}>
                  {otherFeeds.map((feed, i) => (
                    <FeedTile
                      key={feed.id}
                      feed={feed}
                      index={i}
                      layout={layout}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No cameras for this site */}
            {siteFeeds.length === 0 && (
              <div className="text-center py-12">
                <Camera className="w-8 h-8 text-[var(--nav-text-muted)] mx-auto mb-3" />
                <p className="text-sm text-[var(--nav-text-muted)]">
                  No cameras found for this site
                </p>
                <button
                  onClick={handleClearFilter}
                  className="mt-3 text-xs text-cyan hover:text-cyan/80 transition-colors"
                >
                  Show all cameras
                </button>
              </div>
            )}
          </>
        ) : (
          <div data-testid="feeds-grid" className={gridClasses[layout]}>
            {feeds.map((feed, i) => (
              <FeedTile key={feed.id} feed={feed} index={i} layout={layout} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
