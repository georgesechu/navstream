import { NextResponse } from "next/server";
import { db } from "@/db";
import { cameraFeeds, sites } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const feeds = await db
      .select({
        id: cameraFeeds.id,
        siteId: cameraFeeds.siteId,
        siteName: sites.name,
        equipmentId: cameraFeeds.equipmentId,
        name: cameraFeeds.name,
        type: cameraFeeds.type,
        streamId: cameraFeeds.streamId,
        resolution: cameraFeeds.resolution,
        fps: cameraFeeds.fps,
        isLive: cameraFeeds.isLive,
        isRecording: cameraFeeds.isRecording,
      })
      .from(cameraFeeds)
      .innerJoin(sites, eq(cameraFeeds.siteId, sites.id));

    return NextResponse.json(feeds);
  } catch (error) {
    console.error("Failed to fetch cameras:", error);
    return NextResponse.json(
      { error: "Failed to fetch cameras" },
      { status: 500 },
    );
  }
}
