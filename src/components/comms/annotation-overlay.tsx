"use client";

import { useRef, useEffect, useCallback, useState } from "react";

export type AnnotationTool = "pen" | "circle" | "arrow" | "text" | "clear";

export interface AnnotationAction {
  type: "pen" | "circle" | "arrow" | "text";
  color: string;
  lineWidth?: number;
  fontSize?: number;
  // Pen
  points?: { x: number; y: number }[];
  // Circle
  cx?: number;
  cy?: number;
  radius?: number;
  // Arrow
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // Text
  x?: number;
  y?: number;
  text?: string;
}

interface AnnotationOverlayProps {
  width: number;
  height: number;
  onAnnotationData?: (data: string) => void;
  remoteAnnotations?: string;
  tool: AnnotationTool;
  color?: string;
  lineWidth?: number;
}

function percentToPixel(
  pct: number,
  size: number
): number {
  return (pct / 100) * size;
}

function pixelToPercent(
  px: number,
  size: number
): number {
  return (px / size) * 100;
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  action: AnnotationAction,
  width: number,
  height: number
) {
  ctx.strokeStyle = action.color;
  ctx.fillStyle = action.color;
  ctx.lineWidth = action.lineWidth ?? 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Neon glow effect
  ctx.shadowColor = action.color;
  ctx.shadowBlur = 8;

  switch (action.type) {
    case "pen": {
      if (!action.points || action.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(
        percentToPixel(action.points[0].x, width),
        percentToPixel(action.points[0].y, height)
      );
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(
          percentToPixel(action.points[i].x, width),
          percentToPixel(action.points[i].y, height)
        );
      }
      ctx.stroke();
      break;
    }
    case "circle": {
      if (
        action.cx === undefined ||
        action.cy === undefined ||
        action.radius === undefined
      )
        return;
      ctx.beginPath();
      const rx = percentToPixel(action.radius, width);
      const ry = percentToPixel(action.radius, height);
      const r = Math.max(rx, ry);
      ctx.arc(
        percentToPixel(action.cx, width),
        percentToPixel(action.cy, height),
        r,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      break;
    }
    case "arrow": {
      if (
        action.x1 === undefined ||
        action.y1 === undefined ||
        action.x2 === undefined ||
        action.y2 === undefined
      )
        return;
      const sx = percentToPixel(action.x1, width);
      const sy = percentToPixel(action.y1, height);
      const ex = percentToPixel(action.x2, width);
      const ey = percentToPixel(action.y2, height);

      // Line
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(ey - sy, ex - sx);
      const headLen = 14;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - headLen * Math.cos(angle - Math.PI / 6),
        ey - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - headLen * Math.cos(angle + Math.PI / 6),
        ey - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      break;
    }
    case "text": {
      if (
        action.x === undefined ||
        action.y === undefined ||
        !action.text
      )
        return;
      const fontSize = action.fontSize ?? 16;
      ctx.font = `${fontSize}px 'Inter', sans-serif`;
      ctx.shadowBlur = 12;
      ctx.fillText(
        action.text,
        percentToPixel(action.x, width),
        percentToPixel(action.y, height)
      );
      break;
    }
  }

  // Reset shadow
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

export function AnnotationOverlay({
  width,
  height,
  onAnnotationData,
  remoteAnnotations,
  tool,
  color = "#00e5ff",
  lineWidth = 3,
}: AnnotationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localActionsRef = useRef<AnnotationAction[]>([]);
  const drawingRef = useRef(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);
  const remoteActionsRef = useRef<AnnotationAction[]>([]);

  // Parse remote annotations
  useEffect(() => {
    if (!remoteAnnotations) {
      remoteActionsRef.current = [];
      return;
    }
    try {
      const parsed = JSON.parse(remoteAnnotations);
      if (Array.isArray(parsed)) {
        remoteActionsRef.current = parsed as AnnotationAction[];
      }
    } catch {
      // Invalid JSON, ignore
    }
  }, [remoteAnnotations]);

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw remote annotations
    for (const action of remoteActionsRef.current) {
      drawAnnotation(ctx, action, width, height);
    }

    // Draw local annotations
    for (const action of localActionsRef.current) {
      drawAnnotation(ctx, action, width, height);
    }
  }, [width, height]);

  // Redraw when remote annotations or size changes
  useEffect(() => {
    redraw();
  }, [redraw, remoteAnnotations, width, height]);

  // Handle clear tool
  useEffect(() => {
    if (tool === "clear") {
      localActionsRef.current = [];
      redraw();
      onAnnotationData?.(JSON.stringify([]));
    }
  }, [tool, redraw, onAnnotationData]);

  const getPosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: pixelToPercent(e.clientX - rect.left, width),
        y: pixelToPercent(e.clientY - rect.top, height),
      };
    },
    [width, height]
  );

  const commitAction = useCallback(
    (action: AnnotationAction) => {
      localActionsRef.current.push(action);
      redraw();
      onAnnotationData?.(JSON.stringify(localActionsRef.current));
    },
    [redraw, onAnnotationData]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === "clear" || tool === "text") {
        if (tool === "text") {
          const pos = getPosition(e);
          setTextInput({ x: pos.x, y: pos.y, value: "" });
        }
        return;
      }

      drawingRef.current = true;
      const pos = getPosition(e);

      if (tool === "pen") {
        currentPointsRef.current = [pos];
      } else {
        startPosRef.current = pos;
      }
    },
    [tool, getPosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const pos = getPosition(e);

      if (tool === "pen") {
        currentPointsRef.current.push(pos);
        // Draw in-progress stroke
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Full redraw + current stroke
        redraw();
        drawAnnotation(
          ctx,
          {
            type: "pen",
            points: [...currentPointsRef.current],
            color,
            lineWidth,
          },
          width,
          height
        );
      } else if (tool === "circle" && startPosRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dx = pos.x - startPosRef.current.x;
        const dy = pos.y - startPosRef.current.y;
        const radius = Math.sqrt(dx * dx + dy * dy);

        redraw();
        drawAnnotation(
          ctx,
          {
            type: "circle",
            cx: startPosRef.current.x,
            cy: startPosRef.current.y,
            radius,
            color,
            lineWidth,
          },
          width,
          height
        );
      } else if (tool === "arrow" && startPosRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        redraw();
        drawAnnotation(
          ctx,
          {
            type: "arrow",
            x1: startPosRef.current.x,
            y1: startPosRef.current.y,
            x2: pos.x,
            y2: pos.y,
            color,
            lineWidth,
          },
          width,
          height
        );
      }
    },
    [tool, getPosition, redraw, color, lineWidth, width, height]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      const pos = getPosition(e);

      if (tool === "pen" && currentPointsRef.current.length >= 2) {
        commitAction({
          type: "pen",
          points: [...currentPointsRef.current],
          color,
          lineWidth,
        });
        currentPointsRef.current = [];
      } else if (tool === "circle" && startPosRef.current) {
        const dx = pos.x - startPosRef.current.x;
        const dy = pos.y - startPosRef.current.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        if (radius > 0.5) {
          commitAction({
            type: "circle",
            cx: startPosRef.current.x,
            cy: startPosRef.current.y,
            radius,
            color,
            lineWidth,
          });
        }
        startPosRef.current = null;
      } else if (tool === "arrow" && startPosRef.current) {
        const dx = pos.x - startPosRef.current.x;
        const dy = pos.y - startPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 0.5) {
          commitAction({
            type: "arrow",
            x1: startPosRef.current.x,
            y1: startPosRef.current.y,
            x2: pos.x,
            y2: pos.y,
            color,
            lineWidth,
          });
        }
        startPosRef.current = null;
      }
    },
    [tool, getPosition, commitAction, color, lineWidth]
  );

  const handleTextSubmit = useCallback(() => {
    if (textInput && textInput.value.trim()) {
      commitAction({
        type: "text",
        x: textInput.x,
        y: textInput.y,
        text: textInput.value.trim(),
        color,
        fontSize: 16,
      });
    }
    setTextInput(null);
  }, [textInput, commitAction, color]);

  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleTextSubmit();
      } else if (e.key === "Escape") {
        setTextInput(null);
      }
    },
    [handleTextSubmit]
  );

  const cursorStyle =
    tool === "pen"
      ? "crosshair"
      : tool === "circle"
        ? "crosshair"
        : tool === "arrow"
          ? "crosshair"
          : tool === "text"
            ? "text"
            : "default";

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: 10 }}
      data-testid="call-annotation-overlay"
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: cursorStyle }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (drawingRef.current) {
            drawingRef.current = false;
            currentPointsRef.current = [];
            startPosRef.current = null;
            redraw();
          }
        }}
      />
      {textInput && (
        <input
          type="text"
          value={textInput.value}
          onChange={(e) =>
            setTextInput((prev) =>
              prev ? { ...prev, value: e.target.value } : null
            )
          }
          onKeyDown={handleTextKeyDown}
          onBlur={handleTextSubmit}
          autoFocus
          data-testid="call-annotation-text-input"
          className="absolute bg-transparent border border-current outline-none px-1 text-sm font-sans"
          style={{
            left: `${textInput.x}%`,
            top: `${textInput.y}%`,
            color,
            textShadow: `0 0 8px ${color}`,
            minWidth: "60px",
          }}
        />
      )}
    </div>
  );
}
