"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Plus,
  QrCode,
  Wifi,
  WifiOff,
  MapPin,
  Battery,
  Clock,
  Trash2,
  X,
  Loader2,
  Camera,
  Signal,
  Copy,
  Check,
  Video,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { VideoCall } from "@/components/comms/video-call";

interface FieldDevice {
  id: string;
  siteId: string;
  name: string;
  token: string;
  status: string;
  lastSeenAt: string | null;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  batteryLevel: number | null;
  cameraQuality: string;
  livekitRoomId: string | null;
  createdAt: string;
}

interface SiteOption {
  id: string;
  name: string;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DevicesPage() {
  const {
    data: devices,
    isLoading,
    refetch,
  } = useFetch<FieldDevice[]>("/api/devices");
  const { data: sites } = useFetch<SiteOption[]>("/api/sites");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<string | null>(null);
  const [viewFeedDevice, setViewFeedDevice] = useState<FieldDevice | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Poll for device updates every 5 seconds so online/offline status stays fresh
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(() => {
      refetch();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refetch]);

  // Force re-render every 10s to keep relative timestamps fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const onlineCount = devices?.filter((d) => d.status === "online").length ?? 0;
  const totalCount = devices?.length ?? 0;

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this field device?")) return;
      try {
        await fetch(`/api/devices/${id}`, { method: "DELETE" });
        refetch();
      } catch (err) {
        console.error("Failed to delete device:", err);
      }
    },
    [refetch]
  );

  const copyPairingUrl = useCallback(
    (device: FieldDevice) => {
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://navstream.gsechu.net";
      const url = `${baseUrl}/field/${device.id}?t=${device.token}`;
      navigator.clipboard.writeText(url);
      setCopiedId(device.id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    []
  );

  const getSiteName = useCallback(
    (siteId: string) => {
      return sites?.find((s) => s.id === siteId)?.name ?? siteId;
    },
    [sites]
  );

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-6">
        <PageHeader
          title="Field Devices"
          subtitle="QR-paired smartphones as live field cameras & GPS trackers"
          accent="green"
          actions={
            <button
              onClick={() => setShowCreateModal(true)}
              data-testid="devices-create-btn"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--nav-green)]/10 text-[var(--nav-green)] border border-[var(--nav-green)]/20 hover:bg-[var(--nav-green)]/20 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Device
            </button>
          }
        />

        {/* Stats row */}
        <div className="flex gap-3">
          <GlowCard accent="green" className="flex-1 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--nav-green)]/10 text-[var(--nav-green)]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-[var(--nav-text-primary)]">
                  {totalCount}
                </p>
                <p className="text-[10px] text-[var(--nav-text-muted)] uppercase tracking-wider">
                  Total Devices
                </p>
              </div>
            </div>
          </GlowCard>
          <GlowCard accent="green" className="flex-1 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--nav-green)]/10 text-[var(--nav-green)]">
                <Signal className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-[var(--nav-green)]">
                  {onlineCount}
                </p>
                <p className="text-[10px] text-[var(--nav-text-muted)] uppercase tracking-wider">
                  Online Now
                </p>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Devices list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[var(--nav-text-muted)] animate-spin" />
          </div>
        ) : !devices || devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)] flex items-center justify-center">
              <QrCode className="w-8 h-8 text-[var(--nav-text-muted)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--nav-text-secondary)]">
                No Field Devices
              </p>
              <p className="text-xs text-[var(--nav-text-muted)] mt-1">
                Create a device and scan the QR code with any phone to start
                streaming
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {devices.map((device, i) => {
              const isOnline = device.status === "online";
              return (
                <GlowCard
                  key={device.id}
                  accent="green"
                  delay={i * 0.05}
                  data-testid={`device-card-${device.id}`}
                >
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2.5 rounded-xl",
                          isOnline
                            ? "bg-[var(--nav-green)]/10 text-[var(--nav-green)]"
                            : "bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)]"
                        )}
                      >
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--nav-text-primary)] truncate">
                          {device.name}
                        </p>
                        <p className="text-[10px] text-[var(--nav-text-muted)]">
                          {getSiteName(device.siteId)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium",
                          isOnline
                            ? "bg-[var(--nav-green)]/10 text-[var(--nav-green)]"
                            : "bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)]"
                        )}
                      >
                        {isOnline ? (
                          <Wifi className="w-3 h-3" />
                        ) : (
                          <WifiOff className="w-3 h-3" />
                        )}
                        {isOnline ? "Online" : "Offline"}
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {device.lat !== null && device.lng !== null && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--nav-text-muted)]">
                          <MapPin className="w-3 h-3" />
                          <span className="font-mono">
                            {device.lat.toFixed(3)}, {device.lng.toFixed(3)}
                          </span>
                        </div>
                      )}
                      {device.batteryLevel !== null && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--nav-text-muted)]">
                          <Battery className="w-3 h-3" />
                          <span className="font-mono">
                            {device.batteryLevel}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--nav-text-muted)]">
                        <Camera className="w-3 h-3" />
                        <span className="capitalize">
                          {device.cameraQuality}
                        </span>
                      </div>
                      {device.lastSeenAt && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--nav-text-muted)]">
                          <Clock className="w-3 h-3" />
                          <span title={new Date(device.lastSeenAt).toLocaleString()}>
                            {formatRelativeTime(device.lastSeenAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {isOnline && device.livekitRoomId ? (
                        <button
                          onClick={() => setViewFeedDevice(device)}
                          data-testid={`device-view-feed-btn-${device.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--nav-cyan)]/10 text-[var(--nav-cyan)] border border-[var(--nav-cyan)]/20 hover:bg-[var(--nav-cyan)]/20 transition-colors text-xs font-medium"
                        >
                          <Video className="w-3.5 h-3.5" />
                          View Feed
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowQrModal(device.id)}
                          data-testid={`device-qr-btn-${device.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--nav-bg-hover)] text-[var(--nav-text-secondary)] hover:text-white hover:bg-[var(--nav-bg-tertiary)] transition-colors text-xs font-medium"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR Code
                        </button>
                      )}
                      <button
                        onClick={() => copyPairingUrl(device)}
                        data-testid={`device-copy-btn-${device.id}`}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--nav-bg-hover)] text-[var(--nav-text-secondary)] hover:text-[var(--nav-cyan)] hover:bg-[var(--nav-cyan)]/5 transition-colors text-xs font-medium"
                      >
                        {copiedId === device.id ? (
                          <Check className="w-3.5 h-3.5 text-[var(--nav-green)]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(device.id)}
                        data-testid={`device-delete-btn-${device.id}`}
                        className="flex items-center justify-center px-3 py-2 rounded-lg bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)] hover:text-red-400 hover:bg-red-500/5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Device Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDeviceModal
            sites={sites ?? []}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              refetch();
            }}
          />
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal && (
          <QrCodeModal
            deviceId={showQrModal}
            onClose={() => setShowQrModal(null)}
          />
        )}
      </AnimatePresence>

      {/* View Feed Modal */}
      <AnimatePresence>
        {viewFeedDevice && viewFeedDevice.livekitRoomId && (
          <ViewFeedModal
            device={viewFeedDevice}
            roomId={viewFeedDevice.livekitRoomId}
            onClose={() => {
              setViewFeedDevice(null);
              refetch();
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function CreateDeviceModal({
  sites,
  onClose,
  onCreated,
}: {
  sites: SiteOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [cameraQuality, setCameraQuality] = useState("medium");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !siteId) {
      setError("Please fill in all fields");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), siteId, cameraQuality }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create device");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create device");
    } finally {
      setIsCreating(false);
    }
  }, [name, siteId, cameraQuality, onCreated]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-4 rounded-2xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] shadow-[var(--nav-shadow-lg)]"
        data-testid="devices-create-modal"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--nav-border)]">
          <h2 className="text-base font-semibold text-[var(--nav-text-primary)]">
            Create Field Device
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--nav-text-secondary)] block mb-1.5">
              Device Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pump Station Helmet Cam"
              data-testid="devices-create-name"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] text-sm text-[var(--nav-text-primary)] placeholder:text-[var(--nav-text-muted)] focus:outline-none focus:border-[var(--nav-green)]/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--nav-text-secondary)] block mb-1.5">
              Assigned Site
            </label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              data-testid="devices-create-site"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] text-sm text-[var(--nav-text-primary)] focus:outline-none focus:border-[var(--nav-green)]/50"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--nav-text-secondary)] block mb-1.5">
              Camera Quality
            </label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setCameraQuality(q)}
                  data-testid={`devices-create-quality-${q}`}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors capitalize",
                    cameraQuality === q
                      ? "bg-[var(--nav-green)]/10 text-[var(--nav-green)] border border-[var(--nav-green)]/20"
                      : "bg-[var(--nav-bg-primary)] text-[var(--nav-text-muted)] border border-[var(--nav-border)] hover:text-[var(--nav-text-secondary)]"
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[var(--nav-border)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--nav-text-secondary)] bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] hover:bg-[var(--nav-bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            data-testid="devices-create-submit"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--nav-green)] hover:bg-[var(--nav-green)]/80 transition-colors disabled:opacity-50"
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Device
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QrCodeModal({
  deviceId,
  onClose,
}: {
  deviceId: string;
  onClose: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQr() {
      try {
        const res = await fetch(`/api/devices/${deviceId}/qr`);
        if (!res.ok) throw new Error("Failed to load QR");
        const blob = await res.blob();
        setQrUrl(URL.createObjectURL(blob));
      } catch {
        setQrUrl(null);
      } finally {
        setLoading(false);
      }
    }
    loadQr();
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-4 rounded-2xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] shadow-[var(--nav-shadow-lg)]"
        data-testid="devices-qr-modal"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--nav-border)]">
          <h2 className="text-base font-semibold text-[var(--nav-text-primary)]">
            Scan to Connect
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 p-6">
          {loading ? (
            <div className="w-64 h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[var(--nav-text-muted)] animate-spin" />
            </div>
          ) : qrUrl ? (
            <img
              src={qrUrl}
              alt="QR code for device pairing"
              data-testid="devices-qr-image"
              className="w-64 h-64 rounded-xl"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-[var(--nav-text-muted)] text-sm">
              Failed to generate QR code
            </div>
          )}
          <p className="text-xs text-[var(--nav-text-muted)] text-center max-w-xs">
            Point your phone camera at this code. The browser will open a field
            terminal that streams camera and GPS data back to NavStream.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ViewFeedModal({
  device,
  roomId,
  onClose,
}: {
  device: FieldDevice;
  roomId: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl mx-4 rounded-2xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] shadow-[var(--nav-shadow-lg)] overflow-hidden"
        data-testid="devices-view-feed-modal"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--nav-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--nav-cyan)]/10 text-[var(--nav-cyan)]">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--nav-text-primary)]">
                {device.name}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                {device.lat !== null && device.lng !== null && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--nav-text-muted)]">
                    <MapPin className="w-3 h-3" />
                    {device.lat.toFixed(4)}, {device.lng.toFixed(4)}
                  </span>
                )}
                {device.batteryLevel !== null && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--nav-text-muted)]">
                    <Battery className="w-3 h-3" />
                    {device.batteryLevel}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="aspect-video">
          <VideoCall
            roomId={roomId}
            isInitiator={false}
            onCallEnd={onClose}
            localName="Dashboard"
            remoteName={device.name}
            remoteInitials={device.name.charAt(0).toUpperCase()}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
