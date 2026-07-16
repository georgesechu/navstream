import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fieldDevices } from "@/db/schema";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const devices = await db.select().from(fieldDevices);
    return NextResponse.json(devices);
  } catch (error) {
    console.error("Failed to fetch devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, siteId, cameraQuality } = body;

    if (!name || !siteId) {
      return NextResponse.json(
        { error: "Missing required fields: name, siteId" },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    const id = `device-${slug}-${Date.now().toString(36)}`;
    const token = randomUUID();
    const quality = cameraQuality || "medium";

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://navstream.gsechu.net";
    const pairingUrl = `${baseUrl}/field/${id}?t=${token}`;

    const [created] = await db
      .insert(fieldDevices)
      .values({
        id,
        siteId,
        name,
        token,
        status: "offline",
        cameraQuality: quality,
      })
      .returning();

    return NextResponse.json({ ...created, pairingUrl }, { status: 201 });
  } catch (error) {
    console.error("Failed to create device:", error);
    return NextResponse.json(
      { error: "Failed to create device" },
      { status: 500 }
    );
  }
}
