import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { alerts } from "@/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify alert exists
    const [existing] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, notes } = body as {
      status?: "acknowledged" | "resolved";
      notes?: string;
    };

    if (!status || !["acknowledged", "resolved"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'acknowledged' or 'resolved'." },
        { status: 400 }
      );
    }

    // Validate transitions: active -> acknowledged -> resolved
    if (status === "acknowledged" && existing.status !== "active") {
      return NextResponse.json(
        { error: "Only active alerts can be acknowledged." },
        { status: 400 }
      );
    }

    if (status === "resolved" && existing.status !== "active" && existing.status !== "acknowledged") {
      return NextResponse.json(
        { error: "Only active or acknowledged alerts can be resolved." },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (status === "acknowledged") {
      updateData.acknowledgedAt = now;
    }

    if (status === "resolved") {
      updateData.resolvedAt = now;
      if (!existing.acknowledgedAt) {
        updateData.acknowledgedAt = now;
      }
      if (notes) {
        updateData.resolutionNotes = notes;
      }
    }

    const [updated] = await db
      .update(alerts)
      .set(updateData)
      .where(eq(alerts.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
