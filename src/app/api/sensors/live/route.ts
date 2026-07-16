import { NextRequest } from "next/server";
import { sensorSimulator } from "@/lib/sensor-simulator";
import type { SensorEvent, AlertEvent } from "@/lib/sensor-simulator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteIdFilter = searchParams.get("siteId");

  // Start the simulator lazily on first SSE connection
  if (!sensorSimulator.isRunning) {
    sensorSimulator.start();
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial "connected" event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"status":"connected"}\n\n`)
      );

      const onSensor = (event: SensorEvent) => {
        if (closed) return;
        if (siteIdFilter && event.siteId !== siteIdFilter) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream closed
          cleanup();
        }
      };

      const onAlert = (event: AlertEvent) => {
        if (closed) return;
        if (siteIdFilter && event.siteId !== siteIdFilter) return;
        try {
          controller.enqueue(
            encoder.encode(`event: alert\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          cleanup();
        }
      };

      sensorSimulator.on("sensor", onSensor);
      sensorSimulator.on("alert", onAlert);

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      }, 30_000);

      function cleanup() {
        if (closed) return;
        closed = true;
        sensorSimulator.off("sensor", onSensor);
        sensorSimulator.off("alert", onAlert);
        clearInterval(heartbeat);
      }

      // Handle client disconnect via abort signal
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
