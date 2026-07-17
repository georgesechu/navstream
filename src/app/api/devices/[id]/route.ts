import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fieldDevices } from "@/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const token = searchParams.get("t");

    const [device] = await db
      .select()
      .from(fieldDevices)
      .where(eq(fieldDevices.id, id));

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Validate token if provided
    if (token && device.token !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error("Failed to fetch device:", error);
    return NextResponse.json(
      { error: "Failed to fetch device" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const token = body.token || request.nextUrl.searchParams.get("t");
    if (token && device.token !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) updates.status = body.status;
    if (body.lat !== undefined) updates.lat = body.lat;
    if (body.lng !== undefined) updates.lng = body.lng;
    if (body.heading !== undefined) updates.heading = body.heading;
    if (body.batteryLevel !== undefined)
      updates.batteryLevel = body.batteryLevel;

    // If a periodic heartbeat arrives (has lastSeenAt) and status isn't
    // explicitly being set to offline, ensure the device is marked online.
    // This recovers from visibilitychange offline beacons when the user
    // returns to the tab.
    if (body.lastSeenAt !== undefined && body.status === undefined) {
      updates.status = "online";
    }

    if (body.lastSeenAt !== undefined) {
      updates.lastSeenAt = new Date(body.lastSeenAt);
    } else if (Object.keys(updates).length > 0) {
      updates.lastSeenAt = new Date();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(device);
    }

    const [updated] = await db
      .update(fieldDevices)
      .set(updates)
      .where(eq(fieldDevices.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update device:", error);
    return NextResponse.json(
      { error: "Failed to update device" },
      { status: 500 }
    );
  }
}

// POST handler — used by sendBeacon (which always sends POST) for offline marking
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(fieldDevices)
      .where(eq(fieldDevices.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete device:", error);
    return NextResponse.json(
      { error: "Failed to delete device" },
      { status: 500 }
    );
  }
}
