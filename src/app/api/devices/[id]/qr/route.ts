import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fieldDevices } from "@/db/schema";
import QRCode from "qrcode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [device] = await db
      .select()
      .from(fieldDevices)
      .where(eq(fieldDevices.id, id));

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://navstream.gsechu.net";
    const pairingUrl = `${baseUrl}/field/${device.id}?t=${device.token}`;

    const pngBuffer = await QRCode.toBuffer(pairingUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: {
        dark: "#e8ecf4",
        light: "#0a0e1a",
      },
      errorCorrectionLevel: "M",
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
