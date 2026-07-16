import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  sites,
  equipment,
  sensors,
  sensorReadings,
  alerts,
  pois,
  cameraFeeds,
  teamMembers,
  workOrders,
} from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [site] = await db.select().from(sites).where(eq(sites.id, id));

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const [
      siteEquipment,
      siteSensors,
      siteAlerts,
      sitePois,
      siteCameras,
      siteTeam,
    ] = await Promise.all([
      db.select().from(equipment).where(eq(equipment.siteId, id)),
      db.select().from(sensors).where(eq(sensors.siteId, id)),
      db.select().from(alerts).where(eq(alerts.siteId, id)),
      db.select().from(pois).where(eq(pois.siteId, id)),
      db.select().from(cameraFeeds).where(eq(cameraFeeds.siteId, id)),
      db.select().from(teamMembers).where(eq(teamMembers.siteId, id)),
    ]);

    return NextResponse.json({
      ...site,
      equipment: siteEquipment,
      sensors: siteSensors,
      alerts: siteAlerts,
      pois: sitePois,
      cameraFeeds: siteCameras,
      teamMembers: siteTeam,
    });
  } catch (error) {
    console.error("Failed to fetch site:", error);
    return NextResponse.json(
      { error: "Failed to fetch site" },
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

    const [existing] = await db.select().from(sites).where(eq(sites.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Build update object from allowed fields
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "type",
      "lat",
      "lng",
      "status",
      "timezone",
      "personnelCount",
      "activeAlerts",
      "uptime",
      "floorPlanUrl",
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

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(sites)
      .set(updateData)
      .where(eq(sites.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update site:", error);
    return NextResponse.json(
      { error: "Failed to update site" },
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

    const [existing] = await db.select().from(sites).where(eq(sites.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Cascade delete in order to avoid FK violations:
    // 1. Sensor readings (reference sensors)
    const siteSensors = await db
      .select({ id: sensors.id })
      .from(sensors)
      .where(eq(sensors.siteId, id));
    const sensorIds = siteSensors.map((s) => s.id);
    if (sensorIds.length > 0) {
      await db
        .delete(sensorReadings)
        .where(inArray(sensorReadings.sensorId, sensorIds));
    }

    // 2. Sensors (reference equipment + sites)
    await db.delete(sensors).where(eq(sensors.siteId, id));

    // 3. Alerts (reference equipment + sites + sensors + team members)
    await db.delete(alerts).where(eq(alerts.siteId, id));

    // 4. Work orders (reference equipment + sites + alerts + team members)
    await db.delete(workOrders).where(eq(workOrders.siteId, id));

    // 5. POIs (reference sites + equipment + cameras)
    await db.delete(pois).where(eq(pois.siteId, id));

    // 6. Camera feeds (reference sites + equipment)
    await db.delete(cameraFeeds).where(eq(cameraFeeds.siteId, id));

    // 7. Equipment (reference sites)
    await db.delete(equipment).where(eq(equipment.siteId, id));

    // 8. Team members (reference sites)
    await db.delete(teamMembers).where(eq(teamMembers.siteId, id));

    // 9. The site itself
    await db.delete(sites).where(eq(sites.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete site:", error);
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 }
    );
  }
}
