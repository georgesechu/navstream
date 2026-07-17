import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fieldDevices } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;

  let deviceName = "Field Terminal";
  let shortName = "NavStream";
  let startUrl = `/field/${deviceId}`;

  try {
    const [device] = await db
      .select({ name: fieldDevices.name, token: fieldDevices.token })
      .from(fieldDevices)
      .where(eq(fieldDevices.id, deviceId));

    if (device) {
      deviceName = device.name;
      shortName = device.name.length > 12
        ? device.name.slice(0, 12).trim()
        : device.name;
      startUrl = `/field/${deviceId}?t=${device.token}`;
    }
  } catch {
    // Fall back to defaults if DB is unavailable
  }

  const manifest = {
    name: `NavStream — ${deviceName}`,
    short_name: shortName,
    description: "NavStream field terminal camera and GPS tracker",
    start_url: startUrl,
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0a0e1a",
    background_color: "#0a0e1a",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/logo.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/logo.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
