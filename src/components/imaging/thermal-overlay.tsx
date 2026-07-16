"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export interface ThermalHotspot {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  temp: number; // degrees C
  radius: number; // percentage of canvas width
  label: string;
}

interface ThermalOverlayProps {
  width: number;
  height: number;
  hotspots: ThermalHotspot[];
  minTemp?: number;
  maxTemp?: number;
  showColorScale?: boolean;
  onCursorTemp?: (temp: number | null, x: number, y: number) => void;
  className?: string;
}

/**
 * Map a normalized temperature value (0–1) to an RGBA color
 * using a blue → cyan → green → yellow → orange → red gradient.
 */
function tempToColor(t: number): [number, number, number, number] {
  // Clamp
  const v = Math.max(0, Math.min(1, t));
  let r = 0,
    g = 0,
    b = 0;

  if (v < 0.2) {
    // blue → cyan
    const s = v / 0.2;
    r = 0;
    g = Math.round(s * 180);
    b = Math.round(120 + s * 80);
  } else if (v < 0.4) {
    // cyan → green
    const s = (v - 0.2) / 0.2;
    r = 0;
    g = Math.round(180 + s * 75);
    b = Math.round(200 - s * 200);
  } else if (v < 0.6) {
    // green → yellow
    const s = (v - 0.4) / 0.2;
    r = Math.round(s * 255);
    g = 255;
    b = 0;
  } else if (v < 0.8) {
    // yellow → orange
    const s = (v - 0.6) / 0.2;
    r = 255;
    g = Math.round(255 - s * 120);
    b = 0;
  } else {
    // orange → red
    const s = (v - 0.8) / 0.2;
    r = 255;
    g = Math.round(135 - s * 135);
    b = 0;
  }

  return [r, g, b, 255];
}

/**
 * Build a 2D temperature field from hotspots using Gaussian blobs,
 * returning a Float32Array of normalized temperature values (0–1).
 */
function buildTemperatureField(
  w: number,
  h: number,
  hotspots: ThermalHotspot[],
  minTemp: number,
  maxTemp: number,
  ambientNormalized: number,
): Float32Array {
  const field = new Float32Array(w * h);
  field.fill(ambientNormalized);

  const range = maxTemp - minTemp;
  if (range <= 0) return field;

  for (const hs of hotspots) {
    const cx = (hs.x / 100) * w;
    const cy = (hs.y / 100) * h;
    const r = (hs.radius / 100) * w;
    const peakNorm = (hs.temp - minTemp) / range;
    const sigma = r / 2.5;
    const sigSq2 = 2 * sigma * sigma;

    // Only iterate over bounding box of influence
    const x0 = Math.max(0, Math.floor(cx - r * 1.5));
    const x1 = Math.min(w - 1, Math.ceil(cx + r * 1.5));
    const y0 = Math.max(0, Math.floor(cy - r * 1.5));
    const y1 = Math.min(h - 1, Math.ceil(cy + r * 1.5));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        const intensity = Math.exp(-distSq / sigSq2);
        const idx = y * w + x;
        // Additive blending, clamped to peak
        field[idx] = Math.max(field[idx], ambientNormalized + (peakNorm - ambientNormalized) * intensity);
      }
    }
  }

  return field;
}

export function ThermalOverlay({
  width,
  height,
  hotspots,
  minTemp = 20,
  maxTemp = 200,
  showColorScale = true,
  onCursorTemp,
  className,
}: ThermalOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<Float32Array | null>(null);
  const animFrameRef = useRef<number>(0);
  const noisePhaseRef = useRef(0);
  const [cursorInfo, setCursorInfo] = useState<{
    temp: number;
    px: number;
    py: number;
  } | null>(null);

  const range = maxTemp - minTemp;
  const ambientNorm = range > 0 ? (Math.min(28, maxTemp) - minTemp) / range : 0;

  // Build the base thermal field whenever hotspots or dimensions change
  useEffect(() => {
    if (width <= 0 || height <= 0) return;
    fieldRef.current = buildTemperatureField(
      width,
      height,
      hotspots,
      minTemp,
      maxTemp,
      ambientNorm,
    );
  }, [width, height, hotspots, minTemp, maxTemp, ambientNorm]);

  // Animation loop: render field with shimmer noise
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    let running = true;

    function render() {
      if (!running || !ctx || !canvas) return;
      const field = fieldRef.current;
      if (!field) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      noisePhaseRef.current += 0.02;
      const phase = noisePhaseRef.current;

      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      // Simple pseudo-random noise seeded by position + phase
      for (let i = 0; i < field.length; i++) {
        const baseVal = field[i];
        // Fast noise: use sin-based pseudo-random
        const px = i % width;
        const py = (i - px) / width;
        const noise =
          Math.sin(px * 0.8 + phase * 3) *
          Math.cos(py * 0.6 + phase * 2.1) *
          0.015;
        const val = Math.max(0, Math.min(1, baseVal + noise));

        const [r, g, b, a] = tempToColor(val);
        const off = i * 4;
        data[off] = r;
        data[off + 1] = g;
        data[off + 2] = b;
        data[off + 3] = a;
      }

      ctx.putImageData(imageData, 0, 0);

      // Draw color scale
      if (showColorScale) {
        const scaleW = 16;
        const scaleH = Math.min(height - 40, 200);
        const scaleX = width - scaleW - 12;
        const scaleY = (height - scaleH) / 2;

        // Background
        ctx.fillStyle = "rgba(10, 14, 26, 0.7)";
        ctx.roundRect(scaleX - 4, scaleY - 20, scaleW + 50, scaleH + 40, 6);
        ctx.fill();

        // Gradient bar
        for (let row = 0; row < scaleH; row++) {
          const t = 1 - row / scaleH;
          const [r, g, b] = tempToColor(t);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(scaleX, scaleY + row, scaleW, 1);
        }

        // Border
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(scaleX, scaleY, scaleW, scaleH);

        // Labels
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        const labelX = scaleX + scaleW + 4;

        ctx.fillStyle = "#ff4444";
        ctx.fillText(`${maxTemp}°C`, labelX, scaleY + 4);

        ctx.fillStyle = "#ffaa00";
        ctx.fillText(
          `${Math.round((maxTemp + minTemp) / 2)}°C`,
          labelX,
          scaleY + scaleH / 2 + 3,
        );

        ctx.fillStyle = "#4488ff";
        ctx.fillText(`${minTemp}°C`, labelX, scaleY + scaleH);
      }

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [width, height, showColorScale, minTemp, maxTemp]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const field = fieldRef.current;
      if (!canvas || !field || width <= 0 || height <= 0) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const px = Math.floor((e.clientX - rect.left) * scaleX);
      const py = Math.floor((e.clientY - rect.top) * scaleY);

      if (px < 0 || px >= width || py < 0 || py >= height) {
        setCursorInfo(null);
        onCursorTemp?.(null, 0, 0);
        return;
      }

      const normTemp = field[py * width + px];
      const temp = Math.round((minTemp + normTemp * range) * 10) / 10;

      setCursorInfo({
        temp,
        px: e.clientX - rect.left,
        py: e.clientY - rect.top,
      });
      onCursorTemp?.(temp, px / width, py / height);
    },
    [width, height, minTemp, range, onCursorTemp],
  );

  const handleMouseLeave = useCallback(() => {
    setCursorInfo(null);
    onCursorTemp?.(null, 0, 0);
  }, [onCursorTemp]);

  return (
    <div
      data-testid="thermal-overlay"
      className={cn("relative w-full h-full", className)}
      style={{ cursor: "crosshair" }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {/* Cursor temperature tooltip */}
      {cursorInfo && (
        <div
          className="pointer-events-none absolute z-30 px-2 py-1 rounded bg-[#0a0e1a]/90 border border-[rgba(255,255,255,0.15)] backdrop-blur-sm"
          style={{
            left: cursorInfo.px + 14,
            top: cursorInfo.py - 10,
          }}
        >
          <span
            className={cn(
              "text-xs font-mono font-semibold",
              cursorInfo.temp >= 120
                ? "text-[#ff4444]"
                : cursorInfo.temp >= 80
                  ? "text-[#ffaa00]"
                  : cursorInfo.temp >= 50
                    ? "text-[#44ff44]"
                    : "text-[#4488ff]",
            )}
          >
            {cursorInfo.temp.toFixed(1)}°C
          </span>
        </div>
      )}
    </div>
  );
}
