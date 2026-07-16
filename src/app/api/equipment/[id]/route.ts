import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  equipment,
  sensors,
  sensorReadings,
  alerts,
  workOrders,
} from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [item] = await db
      .select()
      .from(equipment)
      .where(eq(equipment.id, id));

    if (!item) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    const equipmentSensors = await db
      .select()
      .from(sensors)
      .where(eq(sensors.equipmentId, id));

    // Fetch latest 10 readings for each sensor
    const sensorsWithReadings = await Promise.all(
      equipmentSensors.map(async (sensor) => {
        const readings = await db
          .select()
          .from(sensorReadings)
          .where(eq(sensorReadings.sensorId, sensor.id))
          .orderBy(desc(sensorReadings.timestamp))
          .limit(10);

        return { ...sensor, readings };
      })
    );

    const [equipmentAlerts, equipmentWorkOrders] = await Promise.all([
      db.select().from(alerts).where(eq(alerts.equipmentId, id)),
      db.select().from(workOrders).where(eq(workOrders.equipmentId, id)),
    ]);

    return NextResponse.json({
      ...item,
      sensors: sensorsWithReadings,
      alerts: equipmentAlerts,
      workOrders: equipmentWorkOrders,
    });
  } catch (error) {
    console.error("Failed to fetch equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}
