import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";

export async function GET() {
  try {
    const allSites = await db.select().from(sites);
    return NextResponse.json(allSites);
  } catch (error) {
    console.error("Failed to fetch sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch sites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, type, lat, lng, timezone, floorPlanUrl } = body;

    if (!name || !type || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, lat, lng" },
        { status: 400 }
      );
    }

    // Auto-generate ID as slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    const id = `site-${slug}`;

    const [created] = await db
      .insert(sites)
      .values({
        id,
        name,
        type,
        lat: Number(lat),
        lng: Number(lng),
        timezone: timezone || "UTC",
        floorPlanUrl: floorPlanUrl || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create site:", error);
    return NextResponse.json(
      { error: "Failed to create site" },
      { status: 500 }
    );
  }
}
