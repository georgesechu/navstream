"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "failed";

interface WebRTCPlayerProps {
  streamId: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  onConnectionChange?: (state: ConnectionState) => void;
}

const GO2RTC_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_GO2RTC_URL || "http://localhost:1984")
    : "http://localhost:1984";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

export function WebRTCPlayer({
  streamId,
  className,
  autoPlay = true,
  muted = true,
  onConnectionChange,
}: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  const updateState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
      onConnectionChange?.(state);
    },
    [onConnectionChange],
  );

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;

    cleanup();
    updateState("connecting");

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // Receive tracks from go2rtc
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (!mountedRef.current) return;
        const state = pc.connectionState;
        if (state === "connected") {
          retryCountRef.current = 0;
          updateState("connected");
        } else if (state === "disconnected") {
          updateState("disconnected");
          scheduleRetry();
        } else if (state === "failed") {
          updateState("failed");
          scheduleRetry();
        }
      };

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete (or timeout after 2s)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
          return;
        }
        const timeout = setTimeout(resolve, 2000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === "complete") {
            clearTimeout(timeout);
            resolve();
          }
        };
      });

      // WHEP: POST SDP offer to go2rtc
      const whepUrl = `${GO2RTC_URL}/api/webrtc?src=${encodeURIComponent(streamId)}`;
      const response = await fetch(whepUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: pc.localDescription?.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHEP request failed: ${response.status}`);
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: answerSdp }),
      );
    } catch {
      if (!mountedRef.current) return;
      updateState("failed");
      scheduleRetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, cleanup, updateState]);

  const scheduleRetry = useCallback(() => {
    if (!mountedRef.current) return;
    if (retryCountRef.current >= MAX_RETRIES) return;

    const delay = BASE_BACKOFF_MS * Math.pow(2, retryCountRef.current);
    retryCountRef.current += 1;

    retryTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [connect, cleanup]);

  return (
    <div
      data-testid={`webrtc-player-${streamId}`}
      className={cn("relative w-full h-full bg-[var(--nav-bg-primary)]", className)}
    >
      {/* Video element — always present but hidden when not connected */}
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        className={cn(
          "w-full h-full object-cover",
          connectionState !== "connected" && "hidden",
        )}
      />

      {/* Connecting state */}
      {connectionState === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2
            className="w-6 h-6 text-cyan animate-spin"
            data-testid={`webrtc-player-${streamId}-connecting`}
          />
          <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
            CONNECTING
          </span>
        </div>
      )}

      {/* Disconnected state */}
      {connectionState === "disconnected" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <WifiOff className="w-6 h-6 text-amber" />
          <span className="text-[10px] font-mono text-amber">RECONNECTING</span>
        </div>
      )}

      {/* Failed state */}
      {connectionState === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Camera className="w-6 h-6 text-[var(--nav-text-muted)]" />
          <span className="text-[11px] text-[var(--nav-text-muted)]">
            Stream Unavailable
          </span>
          <span className="text-[9px] font-mono text-[var(--nav-text-muted)] opacity-60">
            {streamId}
          </span>
          <button
            onClick={handleRetry}
            data-testid={`webrtc-player-${streamId}-retry`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)] text-[var(--nav-text-muted)] text-[10px] hover:text-[var(--nav-text-secondary)] hover:border-cyan/30 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
