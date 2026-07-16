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
} from "lucide-react";

interface VideoCallProps {
  roomId: string;
  isInitiator: boolean;
  onCallEnd: () => void;
  localName?: string;
  remoteName?: string;
  remoteInitials?: string;
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

  // End the call
  const endCall = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
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
        // Get local media
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

        // Create peer connection
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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
