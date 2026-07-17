"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  Loader2,
  MonitorSmartphone,
  WifiOff,
  Pencil,
  Circle,
  ArrowUpRight,
  Type,
  Trash2,
} from "lucide-react";
import {
  AnnotationOverlay,
  type AnnotationTool,
} from "@/components/comms/annotation-overlay";

interface VideoCallProps {
  roomId: string;
  isInitiator: boolean;
  onCallEnd: () => void;
  localName?: string;
  remoteName?: string;
  remoteInitials?: string;
  /** When true, only receives remote video — no local camera needed */
  receiveOnly?: boolean;
}

type CallState =
  | "initializing"
  | "waiting"
  | "connecting"
  | "connected"
  | "failed"
  | "ended";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const POLL_INTERVAL = 1000;

export function VideoCall({
  roomId,
  isInitiator,
  onCallEnd,
  localName = "You",
  remoteName = "Remote",
  remoteInitials = "?",
  receiveOnly = false,
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentCandidatesRef = useRef(0);

  const [callState, setCallState] = useState<CallState>("initializing");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool | null>(null);
  const [remoteAnnotations, setRemoteAnnotations] = useState<string | undefined>(undefined);
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
  const containerRef = useRef<HTMLDivElement>(null);
  const annotationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const role = isInitiator ? "caller" : "callee";

  // Send signaling data to the server
  const signal = useCallback(
    async (type: string, payload: unknown) => {
      try {
        await fetch(`/api/calls/${roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, payload, role }),
        });
      } catch (err) {
        console.error("Signaling error:", err);
      }
    },
    [roomId, role]
  );

  // Send annotation data
  const sendAnnotation = useCallback(
    (data: string) => {
      signal("annotation", data);
    },
    [signal]
  );

  // End the call
  const endCall = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (annotationPollRef.current) clearInterval(annotationPollRef.current);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    signal("end", {});
    setCallState("ended");
    onCallEnd();
  }, [signal, onCallEnd]);

  // Initialize WebRTC
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Get local media (skip in receive-only mode)
        if (!receiveOnly) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }

        // Create peer connection
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        // Add local tracks (only if we have a local stream)
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
        } else {
          // In receive-only mode, add transceivers to receive media
          pc.addTransceiver("video", { direction: "recvonly" });
          pc.addTransceiver("audio", { direction: "recvonly" });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setHasRemoteVideo(true);
          }
        };

        // Collect ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            signal("ice-candidate", event.candidate.toJSON());
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setCallState("connected");
          } else if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected"
          ) {
            setCallState("failed");
          }
        };

        if (isInitiator) {
          // Create and send offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await signal("offer", pc.localDescription);
          setCallState("waiting");
        } else {
          setCallState("waiting");
        }

        // Start polling for signaling data
        pollRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/calls/${roomId}`);
            if (!res.ok) return;
            const data = await res.json();

            if (data.status === "ended") {
              endCall();
              return;
            }

            if (!isInitiator && data.offer && !pc.remoteDescription) {
              // Callee receives offer
              await pc.setRemoteDescription(
                new RTCSessionDescription(data.offer)
              );
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await signal("answer", pc.localDescription);
              setCallState("connecting");
            }

            if (isInitiator && data.answer && !pc.remoteDescription) {
              // Caller receives answer
              await pc.setRemoteDescription(
                new RTCSessionDescription(data.answer)
              );
              setCallState("connecting");
            }

            // Add ICE candidates from the other side
            const remoteCandidates = isInitiator
              ? data.calleeCandidates
              : data.callerCandidates;
            if (remoteCandidates && remoteCandidates.length > sentCandidatesRef.current) {
              for (
                let i = sentCandidatesRef.current;
                i < remoteCandidates.length;
                i++
              ) {
                try {
                  await pc.addIceCandidate(
                    new RTCIceCandidate(remoteCandidates[i])
                  );
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
        console.error("WebRTC init error:", err);
        if (!cancelled) setCallState("failed");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isInitiator]);

  // Poll for remote annotations
  useEffect(() => {
    if (callState !== "connected" && callState !== "connecting") return;

    annotationPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();
        const remoteKey = isInitiator
          ? "calleeAnnotations"
          : "callerAnnotations";
        if (data[remoteKey]) {
          setRemoteAnnotations(data[remoteKey]);
        }
      } catch {
        // Poll error, will retry
      }
    }, 500);

    return () => {
      if (annotationPollRef.current) clearInterval(annotationPollRef.current);
    };
  }, [roomId, isInitiator, callState]);

  // Track container dimensions for annotation overlay
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setVideoDimensions({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setMicOn((v) => !v);
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setCameraOn((v) => !v);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#0a1225]"
      data-testid="video-call"
    >
      {/* Remote video (full area) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        data-testid="video-call-remote"
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
          hasRemoteVideo ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Annotation overlay */}
      {callState === "connected" && annotationTool && (
        <AnnotationOverlay
          width={videoDimensions.width}
          height={videoDimensions.height}
          tool={annotationTool}
          color="#00e5ff"
          lineWidth={3}
          onAnnotationData={sendAnnotation}
          remoteAnnotations={remoteAnnotations}
        />
      )}

      {/* Remote annotations display (when not actively annotating) */}
      {callState === "connected" && !annotationTool && remoteAnnotations && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          <AnnotationOverlay
            width={videoDimensions.width}
            height={videoDimensions.height}
            tool="pen"
            color="#00e5ff"
            lineWidth={3}
            remoteAnnotations={remoteAnnotations}
          />
        </div>
      )}

      {/* Remote placeholder when no video */}
      {!hasRemoteVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00e676]/20 to-[#00e5ff]/20 border border-[#00e676]/20 flex items-center justify-center mx-auto">
              <span className="text-3xl font-bold text-[#00e676]/60">
                {remoteInitials}
              </span>
            </div>
            <p className="text-sm text-white/70">{remoteName}</p>
            {callState === "waiting" && (
              <div className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 text-[#00e5ff] animate-spin" />
                <span className="text-xs text-[#8b95b0]">
                  {isInitiator
                    ? "Waiting for them to join..."
                    : "Connecting..."}
                </span>
              </div>
            )}
            {callState === "connecting" && (
              <div className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 text-[#00e676] animate-spin" />
                <span className="text-xs text-[#8b95b0]">
                  Establishing connection...
                </span>
              </div>
            )}
            {callState === "failed" && (
              <div className="flex items-center gap-2 justify-center">
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400">
                  Connection failed
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call state indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0e1a]/60 backdrop-blur border border-[#1e2744]">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            callState === "connected"
              ? "bg-[#00e676] animate-pulse"
              : callState === "failed"
                ? "bg-red-400"
                : "bg-amber-400 animate-pulse"
          )}
        />
        <span
          className={cn(
            "text-xs font-mono",
            callState === "connected"
              ? "text-[#00e676]"
              : callState === "failed"
                ? "text-red-400"
                : "text-amber-400"
          )}
        >
          {callState === "connected"
            ? "Connected"
            : callState === "waiting"
              ? "Waiting"
              : callState === "connecting"
                ? "Connecting"
                : callState === "failed"
                  ? "Failed"
                  : "Initializing"}
        </span>
      </div>

      {/* Room ID badge */}
      <div className="absolute top-4 right-56 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0e1a]/60 backdrop-blur border border-[#1e2744]">
        <MonitorSmartphone className="w-3 h-3 text-[#00e5ff]" />
        <span className="text-[10px] font-mono text-[#00e5ff]">
          Room: {roomId}
        </span>
      </div>

      {/* Local video PiP */}
      <div className="absolute top-4 right-4 w-48 h-36 rounded-xl bg-[#0f1424] border border-[#1e2744] overflow-hidden shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          data-testid="video-call-local"
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <div className="absolute bottom-2 left-2 text-[10px] text-white/60">
          {localName}
        </div>
      </div>

      {/* Annotation toolbar */}
      {callState === "connected" && (
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1.5 rounded-xl bg-[#0a0e1a]/70 backdrop-blur border border-[#1e2744]"
          data-testid="call-annotation-toolbar"
        >
          {(
            [
              { tool: "pen" as const, icon: Pencil, label: "Pen" },
              { tool: "circle" as const, icon: Circle, label: "Circle" },
              { tool: "arrow" as const, icon: ArrowUpRight, label: "Arrow" },
              { tool: "text" as const, icon: Type, label: "Text" },
              { tool: "clear" as const, icon: Trash2, label: "Clear annotations" },
            ] as const
          ).map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              onClick={() => {
                if (tool === "clear") {
                  setAnnotationTool("clear");
                  // Reset to null after clearing
                  setTimeout(() => setAnnotationTool(null), 50);
                } else {
                  setAnnotationTool(
                    annotationTool === tool ? null : tool
                  );
                }
              }}
              data-testid={`call-annotation-tool-${tool}`}
              aria-label={label}
              aria-pressed={annotationTool === tool}
              className={cn(
                "p-2 rounded-lg transition-all",
                annotationTool === tool
                  ? "text-[#00e5ff] bg-[#00e5ff]/10 border border-[#00e5ff]/30 shadow-[0_0_8px_rgba(0,229,255,0.2)]"
                  : "text-[#8b95b0] hover:text-white hover:bg-[#1e2744]"
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}

      {/* Call controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0a0e1a]/80 backdrop-blur border border-[#1e2744]">
        <button
          onClick={toggleMic}
          data-testid="video-call-mic-btn"
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={micOn}
          className={cn(
            "p-2.5 rounded-xl transition-all",
            micOn
              ? "text-white bg-[#1e2744]"
              : "text-red-400 bg-red-500/10 border border-red-500/20"
          )}
        >
          {micOn ? (
            <Mic className="w-4.5 h-4.5" />
          ) : (
            <MicOff className="w-4.5 h-4.5" />
          )}
        </button>
        <button
          onClick={toggleCamera}
          data-testid="video-call-camera-btn"
          aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
          aria-pressed={cameraOn}
          className={cn(
            "p-2.5 rounded-xl transition-all",
            cameraOn
              ? "text-white bg-[#1e2744]"
              : "text-red-400 bg-red-500/10 border border-red-500/20"
          )}
        >
          {cameraOn ? (
            <Camera className="w-4.5 h-4.5" />
          ) : (
            <CameraOff className="w-4.5 h-4.5" />
          )}
        </button>
        <div className="w-px h-6 bg-[#1e2744]" />
        <button
          onClick={endCall}
          data-testid="video-call-hangup-btn"
          aria-label="End call"
          className="p-2.5 rounded-xl text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_12px_rgba(255,23,68,0.3)]"
        >
          <PhoneOff className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}
