import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pois } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { siteId, label, type, x, y, equipmentId, cameraFeedId, status } =
      body;

    if (!siteId || !label || !type || x === undefined || y === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: siteId, label, type, x, y" },
        { status: 400 }
      );
    }

    // Generate ID from label
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    const id = `poi-${slug}-${Date.now()}`;

    const [created] = await db
      .insert(pois)
      .values({
        id,
        siteId,
        label,
        type,
        x: Number(x),
        y: Number(y),
        equipmentId: equipmentId || null,
        cameraFeedId: cameraFeedId || null,
        status: status || "online",
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create POI:", error);
    return NextResponse.json(
      { error: "Failed to create POI" },
      { status: 500 }
    );
  }
}
