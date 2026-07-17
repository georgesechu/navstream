"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Camera,
  CameraOff,
  Wifi,
  WifiOff,
  Battery,
  MapPin,
  RotateCcw,
  Loader2,
  ShieldAlert,
  Signal,
  MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceInfo {
  id: string;
  name: string;
  siteId: string;
  cameraQuality: string;
  status: string;
}

type ConnectionState = "connecting" | "connected" | "error" | "unauthorized";

const SNAPSHOT_INTERVAL = 500; // 2 fps

export default function FieldTerminalPage() {
  const rawParams = useParams();
  const searchParams = useSearchParams();
  const deviceId = rawParams.deviceId as string;
  const token = searchParams.get("t") || "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [snapshotState, setSnapshotState] = useState<
    "idle" | "sending" | "active" | "error"
  >("idle");

  // Snapshot capture: grab frames from <video> and POST to server
  useEffect(() => {
    if (!cameraActive || !videoRef.current || connectionState !== "connected")
      return;

    let sending = false;

    const captureAndSend = async () => {
      if (sending || !videoRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      sending = true;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, 320, 240);
        const jpeg = canvas.toDataURL("image/jpeg", 0.6);

        const res = await fetch(`/api/devices/${deviceId}/snapshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, snapshot: jpeg }),
        });
        if (res.ok) {
          setSnapshotState("active");
        } else {
          setSnapshotState("error");
        }
      } catch {
        setSnapshotState("error");
      } finally {
        sending = false;
      }
    };

    setSnapshotState("sending");
    snapshotIntervalRef.current = setInterval(captureAndSend, SNAPSHOT_INTERVAL);
    // Capture first frame immediately
    captureAndSend();

    return () => {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
        snapshotIntervalRef.current = null;
      }
      setSnapshotState("idle");
    };
  }, [cameraActive, connectionState, deviceId, token]);

  // Validate device and token
  useEffect(() => {
    async function validateDevice() {
      try {
        const res = await fetch(`/api/devices/${deviceId}?t=${token}`);
        if (res.status === 403) {
          setConnectionState("unauthorized");
          return;
        }
        if (!res.ok) {
          setConnectionState("error");
          return;
        }
        const data = await res.json();
        setDevice(data);
        setConnectionState("connected");

        // Mark device as online
        await fetch(`/api/devices/${deviceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, status: "online" }),
        });
      } catch {
        setConnectionState("error");
      }
    }
    validateDevice();
  }, [deviceId, token]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const qualityConstraints: Record<
        string,
        { width: number; height: number }
      > = {
        low: { width: 640, height: 360 },
        medium: { width: 1280, height: 720 },
        high: { width: 1920, height: 1080 },
      };
      const quality =
        qualityConstraints[device?.cameraQuality || "medium"] ||
        qualityConstraints.medium;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: quality.width },
          height: { ideal: quality.height },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraActive(false);
    }
  }, [facingMode, device?.cameraQuality]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  }, [stopCamera]);

  // Auto-start camera on facingMode change when device is connected
  useEffect(() => {
    if (connectionState === "connected") {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, facingMode]);

  // GPS tracking
  useEffect(() => {
    if (connectionState !== "connected") return;

    if ("geolocation" in navigator) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsAccuracy(pos.coords.accuracy);
        },
        (err) => console.warn("GPS error:", err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, [connectionState]);

  // Battery API
  useEffect(() => {
    if (connectionState !== "connected") return;

    async function getBattery() {
      try {
        // Battery API is not in all TS typings
        const nav = navigator as Navigator & {
          getBattery?: () => Promise<{
            level: number;
            addEventListener: (e: string, cb: () => void) => void;
          }>;
        };
        if (nav.getBattery) {
          const battery = await nav.getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          battery.addEventListener("levelchange", () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
        }
      } catch {
        // Battery API not available
      }
    }
    getBattery();
  }, [connectionState]);

  // Send GPS updates to server every 5 seconds (includes lastSeenAt for dashboard freshness)
  useEffect(() => {
    if (connectionState !== "connected") return;

    const sendHeartbeat = async () => {
      const payload: Record<string, unknown> = {
        token,
        status: "online",
        lastSeenAt: new Date().toISOString(),
      };
      if (gpsCoords) {
        payload.lat = gpsCoords.lat;
        payload.lng = gpsCoords.lng;
      }
      if (batteryLevel !== null) {
        payload.batteryLevel = batteryLevel;
      }

      try {
        await fetch(`/api/devices/${deviceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // Silently fail — will retry next tick
      }
    };

    sendHeartbeat(); // Immediate first heartbeat
    updateIntervalRef.current = setInterval(sendHeartbeat, 5000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [connectionState, deviceId, token, gpsCoords, batteryLevel]);

  // Mark device offline on page unload, tab close, and visibility change
  useEffect(() => {
    if (connectionState !== "connected") return;

    const markOffline = () => {
      const blob = new Blob(
        [JSON.stringify({ token, status: "offline" })],
        { type: "application/json" }
      );
      navigator.sendBeacon(`/api/devices/${deviceId}`, blob);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markOffline();
      }
    };

    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      markOffline();
    };
  }, [connectionState, deviceId, token]);

  // Error/loading states
  if (connectionState === "unauthorized") {
    return (
      <div
        data-testid="field-terminal"
        className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-6"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">Access Denied</h1>
          <p className="text-sm text-[#8b95b0] max-w-xs">
            This device link has expired or is invalid. Please scan a new QR
            code from the NavStream dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (connectionState === "error") {
    return (
      <div
        data-testid="field-terminal"
        className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-6"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <WifiOff className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">
            Connection Failed
          </h1>
          <p className="text-sm text-[#8b95b0] max-w-xs">
            Could not connect to NavStream. Check your internet connection and
            try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20 text-sm font-medium active:scale-95 transition-transform"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (connectionState === "connecting") {
    return (
      <div
        data-testid="field-terminal"
        className="min-h-screen bg-[#0a0e1a] flex items-center justify-center"
      >
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#00e5ff] animate-spin mx-auto" />
          <p className="text-sm text-[#8b95b0]">Connecting to NavStream...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="field-terminal"
      className="fixed inset-0 bg-black flex flex-col select-none"
      style={{ touchAction: "manipulation" }}
    >
      {/* Camera viewfinder — full screen */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          data-testid="field-terminal-video"
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            facingMode === "user" && "scale-x-[-1]"
          )}
        />

        {/* Corner crosshairs for viewfinder feel */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#00e5ff]/50" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#00e5ff]/50" />
        <div className="absolute bottom-20 left-4 w-8 h-8 border-l-2 border-b-2 border-[#00e5ff]/50" />
        <div className="absolute bottom-20 right-4 w-8 h-8 border-r-2 border-b-2 border-[#00e5ff]/50" />

        {/* Top status bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                cameraActive ? "bg-[#00e676] animate-pulse" : "bg-red-400"
              )}
            />
            <span className="text-xs font-mono text-white/80">
              {device?.name || "Field Terminal"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {gpsCoords && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#00e676]" />
                <span className="text-[10px] font-mono text-white/60">
                  {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                </span>
              </div>
            )}
            {batteryLevel !== null && (
              <div className="flex items-center gap-1">
                <Battery className="w-3 h-3 text-white/60" />
                <span className="text-[10px] font-mono text-white/60">
                  {batteryLevel}%
                </span>
              </div>
            )}
            <Signal
              className={cn(
                "w-3 h-3",
                connectionState === "connected"
                  ? "text-[#00e676]"
                  : "text-red-400"
              )}
            />
          </div>
        </div>

        {/* Center recording indicator + snapshot status */}
        {cameraActive && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
                Live
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 border-l border-white/20 pl-3"
              data-testid="field-terminal-snapshot-status"
            >
              <MonitorSmartphone
                className={cn(
                  "w-3 h-3",
                  snapshotState === "active"
                    ? "text-[#00e676]"
                    : snapshotState === "error"
                      ? "text-red-400"
                      : "text-amber-400"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-mono uppercase tracking-wider",
                  snapshotState === "active"
                    ? "text-[#00e676]"
                    : snapshotState === "error"
                      ? "text-red-400"
                      : "text-amber-400"
                )}
              >
                {snapshotState === "active"
                  ? "Streaming"
                  : snapshotState === "error"
                    ? "Stream Error"
                    : "Linking..."}
              </span>
            </div>
          </div>
        )}

        {/* GPS accuracy */}
        {gpsAccuracy !== null && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            <span className="text-[10px] font-mono text-white/50">
              GPS{" "}
              {gpsAccuracy < 10
                ? "High"
                : gpsAccuracy < 50
                  ? "Med"
                  : "Low"}{" "}
              Accuracy ({Math.round(gpsAccuracy)}m)
            </span>
          </div>
        )}
      </div>

      {/* Bottom controls bar */}
      <div className="flex items-center justify-center gap-6 py-5 px-4 bg-[#0a0e1a]">
        {/* Switch camera */}
        <button
          onClick={switchCamera}
          data-testid="field-terminal-switch-camera"
          aria-label="Switch camera"
          className="p-4 rounded-2xl bg-[#1e2744] text-white/80 active:scale-90 transition-transform"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        {/* Toggle camera */}
        <button
          onClick={cameraActive ? stopCamera : startCamera}
          data-testid="field-terminal-toggle-camera"
          aria-label={cameraActive ? "Stop camera" : "Start camera"}
          className={cn(
            "p-5 rounded-full transition-all active:scale-90",
            cameraActive
              ? "bg-red-500/20 border-2 border-red-500 text-red-400"
              : "bg-[#00e676]/20 border-2 border-[#00e676] text-[#00e676]"
          )}
        >
          {cameraActive ? (
            <CameraOff className="w-7 h-7" />
          ) : (
            <Camera className="w-7 h-7" />
          )}
        </button>

        {/* Connection indicator */}
        <div className="p-4 rounded-2xl bg-[#1e2744]">
          <Wifi
            className={cn(
              "w-6 h-6",
              connectionState === "connected"
                ? "text-[#00e676]"
                : "text-red-400"
            )}
          />
        </div>
      </div>
    </div>
  );
}
