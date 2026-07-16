import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// In-memory call room storage
// In production this would be Redis or a database
interface CallRoom {
  id: string;
  callerId: string;
  calleeId: string;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  callerCandidates: RTCIceCandidateInit[];
  calleeCandidates: RTCIceCandidateInit[];
  status: "waiting" | "connecting" | "connected" | "ended";
  createdAt: number;
}

// Global in-memory store (survives hot reload in dev via globalThis)
const globalStore = globalThis as unknown as {
  __callRooms?: Map<string, CallRoom>;
};
if (!globalStore.__callRooms) {
  globalStore.__callRooms = new Map();
}
const callRooms = globalStore.__callRooms;

// Clean up old rooms periodically (older than 10 minutes)
function cleanupRooms() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, room] of callRooms) {
    if (room.createdAt < cutoff) {
      callRooms.delete(id);
    }
  }
}

export async function GET() {
  cleanupRooms();
  const rooms = Array.from(callRooms.values()).map((r) => ({
    id: r.id,
    callerId: r.callerId,
    calleeId: r.calleeId,
    status: r.status,
    createdAt: r.createdAt,
  }));
  return NextResponse.json(rooms);
}

export async function POST(request: NextRequest) {
  try {
    cleanupRooms();
    const body = await request.json();
    const { callerId, calleeId } = body;

    if (!callerId || !calleeId) {
      return NextResponse.json(
        { error: "Missing required fields: callerId, calleeId" },
        { status: 400 }
      );
    }

    const roomId = randomUUID().slice(0, 8);

    const room: CallRoom = {
      id: roomId,
      callerId,
      calleeId,
      offer: null,
      answer: null,
      callerCandidates: [],
      calleeCandidates: [],
      status: "waiting",
      createdAt: Date.now(),
    };

    callRooms.set(roomId, room);

    return NextResponse.json(
      { roomId, status: room.status },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create call room:", error);
    return NextResponse.json(
      { error: "Failed to create call room" },
      { status: 500 }
    );
  }
}
