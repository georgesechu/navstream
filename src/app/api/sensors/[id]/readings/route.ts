import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, desc } from "drizzle-orm";
import { db } from "@/db";
import { sensors, sensorReadings } from "@/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify sensor exists
    const [sensor] = await db
      .select()
      .from(sensors)
      .where(eq(sensors.id, id));

    if (!sensor) {
      return NextResponse.json(
        { error: "Sensor not found" },
        { status: 404 }
      );
    }

    const { searchParams } = request.nextUrl;
    const hours = parseInt(searchParams.get("hours") || "48", 10);

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await db
      .select()
      .from(sensorReadings)
      .where(
        and(
          eq(sensorReadings.sensorId, id),
          gte(sensorReadings.timestamp, since)
        )
      )
      .orderBy(desc(sensorReadings.timestamp));

    return NextResponse.json({
      sensor,
      readings,
    });
  } catch (error) {
    console.error("Failed to fetch sensor readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch sensor readings" },
      { status: 500 }
    );
  }
}
