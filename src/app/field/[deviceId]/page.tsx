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

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free TURN relays for NAT traversal
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const POLL_INTERVAL = 1000;

export default function FieldTerminalPage() {
  const rawParams = useParams();
  const searchParams = useSearchParams();
  const deviceId = rawParams.deviceId as string;
  const token = searchParams.get("t") || "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // WebRTC state for streaming to dashboard
  const [roomId, setRoomId] = useState<string | null>(null);
  const [webrtcState, setWebrtcState] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentCandidatesRef = useRef(0);
  const roomIdRef = useRef<string | null>(null);

  // Signaling helper
  const signal = useCallback(
    async (currentRoomId: string, type: string, payload: unknown) => {
      try {
        await fetch(`/api/calls/${currentRoomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, payload, role: "caller" }),
        });
      } catch (err) {
        console.error("Signaling error:", err);
      }
    },
    []
  );

  // Create call room and start WebRTC when camera is active
  useEffect(() => {
    if (!cameraActive || !streamRef.current || !device || connectionState !== "connected") return;

    let cancelled = false;

    async function startWebRTC() {
      try {
        setWebrtcState("connecting");

        // Create a call room
        const createRes = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callerId: deviceId, calleeId: "dashboard" }),
        });
        if (!createRes.ok) {
          console.error("Failed to create call room");
          setWebrtcState("failed");
          return;
        }
        const { roomId: newRoomId } = await createRes.json();
        if (cancelled) return;

        setRoomId(newRoomId);
        roomIdRef.current = newRoomId;

        // Store room ID on device record
        await fetch(`/api/devices/${deviceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, livekitRoomId: newRoomId }),
        });
        if (cancelled) return;

        // Create peer connection
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        // Add camera tracks to peer connection
        const stream = streamRef.current!;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Collect ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && roomIdRef.current) {
            signal(roomIdRef.current, "ice-candidate", event.candidate.toJSON());
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setWebrtcState("connected");
          } else if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected"
          ) {
            setWebrtcState("failed");
          }
        };

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await signal(newRoomId, "offer", pc.localDescription);

        // Poll for answer and ICE candidates from dashboard
        pollRef.current = setInterval(async () => {
          if (!roomIdRef.current) return;
          try {
            const res = await fetch(`/api/calls/${roomIdRef.current}`);
            if (!res.ok) return;
            const data = await res.json();

            if (data.status === "ended") {
              // Dashboard ended the call — clean up
              if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
              }
              if (pollRef.current) clearInterval(pollRef.current);
              setWebrtcState("idle");
              return;
            }

            // Receive answer from dashboard (callee)
            if (data.answer && pc.remoteDescription === null) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }

            // Add ICE candidates from dashboard (callee)
            const remoteCandidates = data.calleeCandidates;
            if (remoteCandidates && remoteCandidates.length > sentCandidatesRef.current) {
              for (let i = sentCandidatesRef.current; i < remoteCandidates.length; i++) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(remoteCandidates[i]));
                } catch {
                  // Candidate may already be added
                }
              }
              sentCandidatesRef.current = remoteCandidates.length;
            }
          } catch {
            // Poll error, will retry
          }
        }, POLL_INTERVAL);
      } catch (err) {
        console.error("WebRTC setup error:", err);
        if (!cancelled) setWebrtcState("failed");
      }
    }

    startWebRTC();

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      sentCandidatesRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, device, connectionState]);

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
        audio: true,
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
            addEventListener: (
              e: string,
              cb: () => void
            ) => void;
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

  // Send GPS updates to server every 2 seconds (includes lastSeenAt for dashboard freshness)
  useEffect(() => {
    if (connectionState !== "connected") return;

    // Send heartbeat immediately, then every 5 seconds
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
      if (roomIdRef.current) {
        payload.livekitRoomId = roomIdRef.current;
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
      // Clean up WebRTC call room
      if (roomIdRef.current) {
        // Signal end to the call room
        const endBlob = new Blob(
          [JSON.stringify({ type: "end", payload: {}, role: "caller" })],
          { type: "application/json" }
        );
        navigator.sendBeacon(`/api/calls/${roomIdRef.current}`, endBlob);
      }
      // sendBeacon with Blob to set correct Content-Type so the API can parse JSON
      // Clear livekitRoomId on the device
      const blob = new Blob(
        [JSON.stringify({ token, status: "offline", livekitRoomId: null })],
        { type: "application/json" }
      );
      navigator.sendBeacon(`/api/devices/${deviceId}`, blob);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // On mobile, backgrounding the tab often precedes the page being killed.
        // Send an offline beacon proactively; if the user comes back quickly the
        // next periodic update will set status back to online via lastSeenAt.
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

        {/* Center recording indicator + WebRTC status */}
        {cameraActive && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
                Live
              </span>
            </div>
            {roomId && (
              <div className="flex items-center gap-1.5 border-l border-white/20 pl-3" data-testid="field-terminal-room-id">
                <MonitorSmartphone className={cn(
                  "w-3 h-3",
                  webrtcState === "connected" ? "text-[#00e676]" :
                  webrtcState === "failed" ? "text-red-400" : "text-amber-400"
                )} />
                <span className={cn(
                  "text-[10px] font-mono uppercase tracking-wider",
                  webrtcState === "connected" ? "text-[#00e676]" :
                  webrtcState === "failed" ? "text-red-400" : "text-amber-400"
                )}>
                  {webrtcState === "connected" ? "Streaming" :
                   webrtcState === "failed" ? "Stream Failed" : "Linking..."}
                </span>
              </div>
            )}
          </div>
        )}

        {/* GPS accuracy */}
        {gpsAccuracy !== null && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            <span className="text-[10px] font-mono text-white/50">
              GPS {gpsAccuracy < 10 ? "High" : gpsAccuracy < 50 ? "Med" : "Low"}{" "}
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
