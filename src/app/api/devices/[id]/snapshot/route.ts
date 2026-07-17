import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fieldDevices } from "@/db/schema";

// In-memory snapshot store — survives hot reload in dev
const snapshotStore =
  (globalThis as Record<string, unknown>).__deviceSnapshots ??
  new Map<string, string>();
(globalThis as Record<string, unknown>).__deviceSnapshots = snapshotStore;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [device] = await db
      .select()
      .from(fieldDevices)
      .where(eq(fieldDevices.id, id));

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Validate token
    if (body.token && device.token !== body.token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    if (!body.snapshot) {
      return NextResponse.json(
        { error: "Missing snapshot data" },
        { status: 400 }
      );
    }

    // Store the latest snapshot (base64 JPEG string, may include data URI prefix)
    (snapshotStore as Map<string, string>).set(id, body.snapshot);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to store snapshot:", error);
    return NextResponse.json(
      { error: "Failed to store snapshot" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snapshot = (snapshotStore as Map<string, string>).get(id);

    if (!snapshot) {
      return NextResponse.json(
        { error: "No snapshot available" },
        { status: 404 }
      );
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Failed to get snapshot:", error);
    return NextResponse.json(
      { error: "Failed to get snapshot" },
      { status: 500 }
    );
  }
}
