/**
 * Generates procedural equirectangular panorama images using the Canvas API.
 * These provide placeholder 360° environments for the demo without needing real photos.
 */

export type PanoramaScene =
  | "industrial"
  | "control-room"
  | "outdoor"
  | "pump-station";

function createCanvas(
  width: number,
  height: number
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

function drawVerticalLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spacing: number,
  color: string,
  yStart: number,
  yEnd: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, yStart);
    ctx.lineTo(x, yEnd);
    ctx.stroke();
  }
}

function drawHorizontalLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  spacing: number,
  color: string,
  yStart: number,
  yEnd: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let y = yStart; y < yEnd; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spacing: number,
  color: string,
  yStart: number,
  yEnd: number
) {
  drawVerticalLines(ctx, width, height, spacing, color, yStart, yEnd);
  drawHorizontalLines(ctx, width, height, spacing, color, yStart, yEnd);
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  strokeColor?: string
) {
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, w, h);
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
}

function drawIndustrial(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Background — dark industrial gray
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#1a1a2e");
  bgGrad.addColorStop(0.3, "#16213e");
  bgGrad.addColorStop(0.5, "#1a1a2e");
  bgGrad.addColorStop(1, "#0f0f1a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Floor grid
  const floorY = height * 0.55;
  drawGrid(ctx, width, height, 80, "rgba(100, 120, 140, 0.15)", floorY, height);

  // Ceiling grid
  drawGrid(
    ctx,
    width,
    height,
    100,
    "rgba(80, 100, 120, 0.08)",
    0,
    height * 0.3
  );

  // Wall panels (repeating around the panorama)
  for (let i = 0; i < 8; i++) {
    const panelX = i * (width / 8) + 20;
    const panelW = width / 8 - 40;
    // Wall section
    drawRect(
      ctx,
      panelX,
      height * 0.3,
      panelW,
      height * 0.25,
      "rgba(40, 50, 70, 0.4)",
      "rgba(60, 80, 100, 0.3)"
    );
  }

  // Pipes along ceiling
  for (let i = 0; i < 4; i++) {
    const pipeY = height * 0.15 + i * 25;
    ctx.strokeStyle = `rgba(100, 130, 160, ${0.3 - i * 0.05})`;
    ctx.lineWidth = 8 - i * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, pipeY);
    ctx.lineTo(width, pipeY);
    ctx.stroke();
  }

  // Equipment shapes
  // Large tank
  drawRect(
    ctx,
    width * 0.1,
    height * 0.35,
    80,
    height * 0.2,
    "rgba(50, 60, 80, 0.6)",
    "rgba(0, 229, 255, 0.15)"
  );

  // Control cabinet
  drawRect(
    ctx,
    width * 0.35,
    height * 0.38,
    60,
    height * 0.17,
    "rgba(30, 40, 55, 0.7)",
    "rgba(255, 179, 0, 0.2)"
  );

  // Conveyor structure
  ctx.strokeStyle = "rgba(120, 140, 160, 0.3)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(width * 0.55, height * 0.55);
  ctx.lineTo(width * 0.85, height * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.55, height * 0.58);
  ctx.lineTo(width * 0.85, height * 0.43);
  ctx.stroke();

  // More equipment on right side
  drawRect(
    ctx,
    width * 0.7,
    height * 0.36,
    100,
    height * 0.19,
    "rgba(45, 55, 75, 0.5)",
    "rgba(0, 229, 255, 0.1)"
  );

  // Warning stripes on floor
  for (let i = 0; i < width; i += 300) {
    ctx.fillStyle = "rgba(255, 179, 0, 0.08)";
    ctx.fillRect(i, height * 0.55 - 3, 150, 6);
  }

  // Overhead lights
  for (let i = 0; i < 6; i++) {
    const lx = i * (width / 6) + width / 12;
    const ly = height * 0.08;
    const lightGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 80);
    lightGrad.addColorStop(0, "rgba(200, 220, 255, 0.15)");
    lightGrad.addColorStop(1, "rgba(200, 220, 255, 0)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(lx - 80, ly - 80, 160, 160);
  }
}

function drawControlRoom(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Background — darker, more blue-tinted
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#0d1117");
  bgGrad.addColorStop(0.4, "#161b22");
  bgGrad.addColorStop(0.6, "#0d1117");
  bgGrad.addColorStop(1, "#0a0e14");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Carpet floor
  drawGrid(
    ctx,
    width,
    height,
    40,
    "rgba(60, 70, 90, 0.1)",
    height * 0.58,
    height
  );

  // Ceiling tiles
  drawGrid(ctx, width, height, 120, "rgba(50, 60, 80, 0.08)", 0, height * 0.25);

  // Monitor wall — multiple screens
  for (let i = 0; i < 12; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const mx = col * (width / 6) + 30;
    const my = height * 0.28 + row * (height * 0.12 + 10);
    const mw = width / 6 - 50;
    const mh = height * 0.11;

    // Screen bezel
    drawRect(ctx, mx - 3, my - 3, mw + 6, mh + 6, "rgba(20, 25, 35, 0.8)");

    // Screen glow
    const screenGrad = ctx.createLinearGradient(mx, my, mx, my + mh);
    screenGrad.addColorStop(0, "rgba(0, 50, 80, 0.5)");
    screenGrad.addColorStop(0.5, "rgba(0, 30, 60, 0.4)");
    screenGrad.addColorStop(1, "rgba(0, 40, 70, 0.5)");
    ctx.fillStyle = screenGrad;
    ctx.fillRect(mx, my, mw, mh);

    // Scanlines on screen
    for (let sy = my; sy < my + mh; sy += 3) {
      ctx.fillStyle = "rgba(0, 100, 150, 0.05)";
      ctx.fillRect(mx, sy, mw, 1);
    }

    // Data lines on screen
    ctx.strokeStyle = "rgba(0, 229, 255, 0.2)";
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      const ly = my + mh * 0.3 + j * (mh * 0.2);
      ctx.moveTo(mx + 10, ly);
      for (let px = mx + 10; px < mx + mw - 10; px += 5) {
        ctx.lineTo(px, ly + (Math.random() - 0.5) * 8);
      }
      ctx.stroke();
    }
  }

  // Desk
  drawRect(
    ctx,
    0,
    height * 0.54,
    width,
    height * 0.04,
    "rgba(40, 50, 65, 0.6)",
    "rgba(60, 70, 85, 0.3)"
  );

  // Keyboard/mouse on desk at intervals
  for (let i = 0; i < 4; i++) {
    const dx = i * (width / 4) + width / 8;
    drawRect(
      ctx,
      dx - 30,
      height * 0.56,
      60,
      15,
      "rgba(30, 35, 45, 0.5)",
      "rgba(80, 90, 100, 0.2)"
    );
  }

  // Ambient glow from screens
  for (let i = 0; i < 6; i++) {
    const gx = i * (width / 6) + width / 12;
    const glow = ctx.createRadialGradient(
      gx,
      height * 0.35,
      0,
      gx,
      height * 0.35,
      150
    );
    glow.addColorStop(0, "rgba(0, 100, 200, 0.06)");
    glow.addColorStop(1, "rgba(0, 100, 200, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(gx - 150, height * 0.2, 300, 300);
  }
}

function drawOutdoor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  skyGrad.addColorStop(0, "#0a1628");
  skyGrad.addColorStop(0.4, "#1a2a4a");
  skyGrad.addColorStop(0.7, "#2a3a5a");
  skyGrad.addColorStop(1, "#3a4a5a");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.5);

  // Stars
  for (let i = 0; i < 100; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height * 0.35;
    const size = Math.random() * 2;
    ctx.fillStyle = `rgba(200, 210, 230, ${Math.random() * 0.5 + 0.2})`;
    ctx.fillRect(sx, sy, size, size);
  }

  // Ground
  const groundGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
  groundGrad.addColorStop(0, "#3a3a2a");
  groundGrad.addColorStop(0.3, "#2a2a1a");
  groundGrad.addColorStop(1, "#1a1a0a");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  // Horizon glow
  const horizGlow = ctx.createLinearGradient(
    0,
    height * 0.45,
    0,
    height * 0.55
  );
  horizGlow.addColorStop(0, "rgba(255, 140, 50, 0)");
  horizGlow.addColorStop(0.5, "rgba(255, 140, 50, 0.08)");
  horizGlow.addColorStop(1, "rgba(255, 140, 50, 0)");
  ctx.fillStyle = horizGlow;
  ctx.fillRect(0, height * 0.45, width, height * 0.1);

  // Distant mountains/hills
  ctx.fillStyle = "rgba(30, 35, 50, 0.7)";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.5);
  for (let x = 0; x <= width; x += 20) {
    const hillHeight =
      Math.sin(x * 0.005) * 30 +
      Math.sin(x * 0.012) * 15 +
      Math.sin(x * 0.003) * 20;
    ctx.lineTo(x, height * 0.48 - hillHeight);
  }
  ctx.lineTo(width, height * 0.5);
  ctx.closePath();
  ctx.fill();

  // Industrial structures on horizon
  for (let i = 0; i < 4; i++) {
    const bx = i * (width / 4) + width / 8 + (i % 2 === 0 ? -30 : 30);
    const bh = 40 + Math.random() * 60;
    drawRect(
      ctx,
      bx,
      height * 0.47 - bh,
      20 + Math.random() * 30,
      bh,
      "rgba(20, 25, 40, 0.8)",
      "rgba(50, 60, 80, 0.3)"
    );
  }

  // Power lines
  ctx.strokeStyle = "rgba(80, 90, 100, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.42);
  for (let x = 0; x < width; x += width / 6) {
    ctx.quadraticCurveTo(x + width / 12, height * 0.44, x + width / 6, height * 0.42);
  }
  ctx.stroke();

  // Ground texture (gravel/dirt)
  for (let i = 0; i < 300; i++) {
    const gx = Math.random() * width;
    const gy = height * 0.55 + Math.random() * height * 0.4;
    ctx.fillStyle = `rgba(${80 + Math.random() * 40}, ${70 + Math.random() * 30}, ${50 + Math.random() * 20}, ${0.05 + Math.random() * 0.1})`;
    ctx.fillRect(gx, gy, 2 + Math.random() * 4, 1 + Math.random() * 2);
  }

  // Fence posts
  for (let i = 0; i < 10; i++) {
    const fx = i * (width / 10) + 20;
    ctx.strokeStyle = "rgba(100, 110, 120, 0.2)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx, height * 0.45);
    ctx.lineTo(fx, height * 0.55);
    ctx.stroke();
  }
  // Fence wire
  ctx.strokeStyle = "rgba(100, 110, 120, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.48);
  ctx.lineTo(width, height * 0.48);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, height * 0.52);
  ctx.lineTo(width, height * 0.52);
  ctx.stroke();
}

function drawPumpStation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#141a28");
  bgGrad.addColorStop(0.35, "#1a2235");
  bgGrad.addColorStop(0.5, "#18202e");
  bgGrad.addColorStop(1, "#0e1420");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Concrete floor
  const floorY = height * 0.58;
  ctx.fillStyle = "rgba(70, 75, 85, 0.15)";
  ctx.fillRect(0, floorY, width, height - floorY);
  drawGrid(ctx, width, height, 60, "rgba(90, 100, 110, 0.1)", floorY, height);

  // Drain channel on floor
  ctx.strokeStyle = "rgba(0, 150, 200, 0.1)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.75);
  ctx.lineTo(width, height * 0.75);
  ctx.stroke();

  // Large pipes (horizontal, multiple levels)
  const pipeColors = [
    "rgba(80, 100, 130, 0.4)",
    "rgba(120, 80, 80, 0.3)",
    "rgba(80, 120, 80, 0.3)",
  ];
  for (let p = 0; p < 3; p++) {
    const py = height * (0.15 + p * 0.08);
    ctx.strokeStyle = pipeColors[p];
    ctx.lineWidth = 20 - p * 4;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();

    // Pipe supports/flanges
    for (let f = 0; f < width; f += width / 5) {
      ctx.fillStyle = pipeColors[p];
      ctx.fillRect(f, py - 15, 10, 30);
    }
  }

  // Vertical pipe runs
  for (let i = 0; i < 5; i++) {
    const vx = i * (width / 5) + width / 10;
    ctx.strokeStyle = "rgba(80, 100, 130, 0.25)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(vx, height * 0.1);
    ctx.lineTo(vx, height * 0.58);
    ctx.stroke();

    // Valve wheels
    const vy = height * 0.35;
    ctx.strokeStyle = "rgba(255, 179, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(vx, vy, 12, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes
    for (let s = 0; s < 4; s++) {
      const angle = (s * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + Math.cos(angle) * 12, vy + Math.sin(angle) * 12);
      ctx.stroke();
    }
  }

  // Pump units on floor
  for (let i = 0; i < 3; i++) {
    const px = i * (width / 3) + width / 6 - 40;
    const py = height * 0.45;
    // Pump body
    drawRect(
      ctx,
      px,
      py,
      80,
      height * 0.13,
      "rgba(50, 60, 75, 0.6)",
      "rgba(0, 229, 255, 0.15)"
    );
    // Motor
    drawRect(
      ctx,
      px + 20,
      py - 15,
      40,
      15,
      "rgba(40, 50, 65, 0.5)",
      "rgba(100, 120, 140, 0.2)"
    );
    // Status indicator
    const statusColor =
      i === 1 ? "rgba(255, 23, 68, 0.6)" : "rgba(0, 229, 255, 0.4)";
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(px + 40, py + height * 0.065, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pressure gauges on wall
  for (let i = 0; i < 4; i++) {
    const gx = i * (width / 4) + width / 8;
    const gy = height * 0.38;
    ctx.strokeStyle = "rgba(200, 210, 220, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx, gy, 15, 0, Math.PI * 2);
    ctx.stroke();
    // Needle
    const needleAngle = -Math.PI / 4 + Math.random() * (Math.PI / 2);
    ctx.strokeStyle = "rgba(255, 179, 0, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(
      gx + Math.cos(needleAngle) * 12,
      gy + Math.sin(needleAngle) * 12
    );
    ctx.stroke();
  }

  // Warning sign
  ctx.fillStyle = "rgba(255, 179, 0, 0.2)";
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height * 0.3);
  ctx.lineTo(width * 0.5 - 15, height * 0.35);
  ctx.lineTo(width * 0.5 + 15, height * 0.35);
  ctx.closePath();
  ctx.fill();

  // Overhead lights
  for (let i = 0; i < 5; i++) {
    const lx = i * (width / 5) + width / 10;
    const glow = ctx.createRadialGradient(lx, height * 0.05, 0, lx, height * 0.05, 100);
    glow.addColorStop(0, "rgba(200, 180, 140, 0.1)");
    glow.addColorStop(1, "rgba(200, 180, 140, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 100, 0, 200, 200);
  }
}

/**
 * Generates a procedural equirectangular panorama image as a data URL.
 * The image is 2048x1024 pixels — a standard equirectangular aspect ratio (2:1).
 */
export function generatePanoramaDataUrl(scene: PanoramaScene): string {
  const width = 2048;
  const height = 1024;
  const [canvas, ctx] = createCanvas(width, height);

  switch (scene) {
    case "industrial":
      drawIndustrial(ctx, width, height);
      break;
    case "control-room":
      drawControlRoom(ctx, width, height);
      break;
    case "outdoor":
      drawOutdoor(ctx, width, height);
      break;
    case "pump-station":
      drawPumpStation(ctx, width, height);
      break;
  }

  return canvas.toDataURL("image/jpeg", 0.85);
}
