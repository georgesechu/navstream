import { NextRequest, NextResponse } from "next/server";

interface CallRoom {
  id: string;
  callerId: string;
  calleeId: string;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  callerCandidates: RTCIceCandidateInit[];
  calleeCandidates: RTCIceCandidateInit[];
  callerAnnotations: string | null;
  calleeAnnotations: string | null;
  status: "waiting" | "connecting" | "connected" | "ended";
  createdAt: number;
}

const globalStore = globalThis as unknown as {
  __callRooms?: Map<string, CallRoom>;
};
if (!globalStore.__callRooms) {
  globalStore.__callRooms = new Map();
}
const callRooms = globalStore.__callRooms;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const room = callRooms.get(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: room.id,
      callerId: room.callerId,
      calleeId: room.calleeId,
      status: room.status,
      hasOffer: !!room.offer,
      hasAnswer: !!room.answer,
      offer: room.offer,
      answer: room.answer,
      callerCandidates: room.callerCandidates,
      calleeCandidates: room.calleeCandidates,
      callerAnnotations: room.callerAnnotations,
      calleeAnnotations: room.calleeAnnotations,
    });
  } catch (error) {
    console.error("Failed to fetch room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const room = callRooms.get(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, payload, role } = body;

    switch (type) {
      case "offer":
        room.offer = payload;
        room.status = "connecting";
        break;
      case "answer":
        room.answer = payload;
        room.status = "connected";
        break;
      case "ice-candidate":
        if (role === "caller") {
          room.callerCandidates.push(payload);
        } else {
          room.calleeCandidates.push(payload);
        }
        break;
      case "annotation":
        if (role === "caller") {
          room.callerAnnotations = typeof payload === "string" ? payload : JSON.stringify(payload);
        } else {
          room.calleeAnnotations = typeof payload === "string" ? payload : JSON.stringify(payload);
        }
        break;
      case "end":
        room.status = "ended";
        break;
      default:
        return NextResponse.json(
          { error: "Invalid type. Expected: offer, answer, ice-candidate, annotation, end" },
          { status: 400 }
        );
    }

    callRooms.set(roomId, room);

    return NextResponse.json({ success: true, status: room.status });
  } catch (error) {
    console.error("Failed to update room:", error);
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    callRooms.delete(roomId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
