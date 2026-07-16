import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pois } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [poi] = await db.select().from(pois).where(eq(pois.id, id));

    if (!poi) {
      return NextResponse.json({ error: "POI not found" }, { status: 404 });
    }

    return NextResponse.json(poi);
  } catch (error) {
    console.error("Failed to fetch POI:", error);
    return NextResponse.json(
      { error: "Failed to fetch POI" },
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

    const [existing] = await db.select().from(pois).where(eq(pois.id, id));
    if (!existing) {
      return NextResponse.json({ error: "POI not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "label",
      "type",
      "x",
      "y",
      "status",
      "equipmentId",
      "cameraFeedId",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(pois)
      .set(updateData)
      .where(eq(pois.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update POI:", error);
    return NextResponse.json(
      { error: "Failed to update POI" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [existing] = await db.select().from(pois).where(eq(pois.id, id));
    if (!existing) {
      return NextResponse.json({ error: "POI not found" }, { status: 404 });
    }

    await db.delete(pois).where(eq(pois.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete POI:", error);
    return NextResponse.json(
      { error: "Failed to delete POI" },
      { status: 500 }
    );
  }
}
