import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { alerts } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const siteId = searchParams.get("siteId");

    const conditions = [];
    if (status) {
      conditions.push(eq(alerts.status, status));
    }
    if (siteId) {
      conditions.push(eq(alerts.siteId, siteId));
    }

    const query = db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.createdAt));

    const result =
      conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
