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
  _height: number,
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

/** Draw text label with optional background */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  bgColor?: string
) {
  ctx.font = `bold ${fontSize}px monospace`;
  const metrics = ctx.measureText(text);
  const tw = metrics.width;
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(x - tw / 2 - 4, y - fontSize + 2, tw + 8, fontSize + 4);
  }
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.textAlign = "start";
}

/** Draw warning/hazard stripe band */
function drawHazardStripes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stripeWidth: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let sx = x - h; sx < x + w + h; sx += stripeWidth * 2) {
    ctx.fillStyle = "rgba(255, 179, 0, 0.15)";
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + h, y);
    ctx.lineTo(sx + h + stripeWidth, y);
    ctx.lineTo(sx + stripeWidth, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Draw a structural I-beam cross-section at position */
function drawBeam(
  ctx: CanvasRenderingContext2D,
  x: number,
  yTop: number,
  yBottom: number,
  beamWidth: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = beamWidth;
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.lineTo(x, yBottom);
  ctx.stroke();
  // Flanges
  ctx.lineWidth = beamWidth * 0.6;
  ctx.beginPath();
  ctx.moveTo(x - beamWidth * 2, yTop);
  ctx.lineTo(x + beamWidth * 2, yTop);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - beamWidth * 2, yBottom);
  ctx.lineTo(x + beamWidth * 2, yBottom);
  ctx.stroke();
}

/** Draw a circular gauge with needle */
function drawGauge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  value: number,
  label: string,
  faceColor: string,
  rimColor: string,
  needleColor: string
) {
  // Face
  ctx.fillStyle = faceColor;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  // Rim
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  // Tick marks
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1;
  for (let a = -Math.PI * 0.75; a <= Math.PI * 0.75; a += Math.PI / 8) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (radius - 3), cy + Math.sin(a) * (radius - 3));
    ctx.lineTo(cx + Math.cos(a) * (radius - 6), cy + Math.sin(a) * (radius - 6));
    ctx.stroke();
  }
  // Needle
  const needleAngle = -Math.PI * 0.75 + value * Math.PI * 1.5;
  ctx.strokeStyle = needleColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(needleAngle) * (radius - 5),
    cy + Math.sin(needleAngle) * (radius - 5)
  );
  ctx.stroke();
  // Center dot
  ctx.fillStyle = needleColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
  // Label
  if (label) {
    drawLabel(ctx, label, cx, cy + radius + 12, 9, rimColor);
  }
}

/** Draw a pipe with flanges */
function drawPipeHorizontal(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  diameter: number,
  color: string,
  flangeInterval: number
) {
  // Pipe body
  ctx.strokeStyle = color;
  ctx.lineWidth = diameter;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  // Highlight on top
  ctx.strokeStyle = color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 1.5})`);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y - diameter / 2 + 1);
  ctx.lineTo(x2, y - diameter / 2 + 1);
  ctx.stroke();
  // Flanges
  if (flangeInterval > 0) {
    for (let fx = x1 + flangeInterval; fx < x2; fx += flangeInterval) {
      ctx.fillStyle = color;
      ctx.fillRect(fx - 2, y - diameter / 2 - 3, 4, diameter + 6);
    }
  }
}

function drawPipeVertical(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number,
  diameter: number,
  color: string,
  flangeInterval: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = diameter;
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.strokeStyle = color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 1.5})`);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - diameter / 2 + 1, y1);
  ctx.lineTo(x - diameter / 2 + 1, y2);
  ctx.stroke();
  if (flangeInterval > 0) {
    for (let fy = y1 + flangeInterval; fy < y2; fy += flangeInterval) {
      ctx.fillStyle = color;
      ctx.fillRect(x - diameter / 2 - 3, fy - 2, diameter + 6, 4);
    }
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

  const floorY = height * 0.55;
  const ceilingY = height * 0.22;

  // Concrete floor with texture
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
  floorGrad.addColorStop(0, "rgba(80, 85, 95, 0.2)");
  floorGrad.addColorStop(0.3, "rgba(65, 70, 80, 0.15)");
  floorGrad.addColorStop(1, "rgba(50, 55, 65, 0.1)");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, width, height - floorY);

  // Floor grid (perspective-ish spacing)
  drawGrid(ctx, width, height, 80, "rgba(100, 120, 140, 0.12)", floorY, height);
  // Floor expansion joints
  for (let x = 0; x < width; x += 200) {
    ctx.strokeStyle = "rgba(60, 70, 80, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Ceiling grid
  drawGrid(ctx, width, height, 100, "rgba(80, 100, 120, 0.08)", 0, ceilingY);

  // Structural steel beams (ceiling to floor columns)
  for (let i = 0; i < 7; i++) {
    const bx = i * (width / 7) + width / 14;
    drawBeam(ctx, bx, ceilingY - 10, floorY, 4, "rgba(100, 115, 135, 0.25)");
  }

  // Ceiling trusses (horizontal)
  for (let ty = ceilingY - 20; ty > ceilingY - 50; ty -= 15) {
    ctx.strokeStyle = "rgba(90, 105, 125, 0.15)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, ty);
    ctx.lineTo(width, ty);
    ctx.stroke();
  }

  // Wall panels with rivets
  for (let i = 0; i < 10; i++) {
    const panelX = i * (width / 10) + 10;
    const panelW = width / 10 - 20;
    // Corrugated wall panel
    drawRect(
      ctx, panelX, ceilingY, panelW, floorY - ceilingY,
      "rgba(40, 50, 70, 0.3)", "rgba(60, 80, 100, 0.2)"
    );
    // Corrugation lines
    for (let cx = panelX + 8; cx < panelX + panelW; cx += 8) {
      ctx.strokeStyle = "rgba(55, 65, 85, 0.15)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, ceilingY);
      ctx.lineTo(cx, floorY);
      ctx.stroke();
    }
  }

  // Large pipe runs along ceiling (color-coded)
  drawPipeHorizontal(ctx, 0, width, height * 0.12, 18, "rgba(80, 110, 150, 0.35)", width / 5);
  drawPipeHorizontal(ctx, 0, width, height * 0.17, 12, "rgba(150, 80, 80, 0.3)", width / 4);
  drawPipeHorizontal(ctx, 0, width, height * 0.21, 8, "rgba(80, 150, 80, 0.25)", width / 6);

  // Pipe labels
  drawLabel(ctx, "COMPRESSED AIR", width * 0.25, height * 0.10, 8, "rgba(80, 110, 150, 0.5)");
  drawLabel(ctx, "FIRE WATER", width * 0.65, height * 0.15, 8, "rgba(150, 80, 80, 0.5)");

  // Large tank/vessel (left side)
  const tankX = width * 0.08;
  const tankY = ceilingY + 20;
  const tankW = 100;
  const tankH = floorY - tankY - 10;
  drawRect(ctx, tankX, tankY, tankW, tankH, "rgba(50, 60, 80, 0.5)", "rgba(0, 229, 255, 0.12)");
  // Tank ribs
  for (let ry = tankY + 20; ry < tankY + tankH; ry += 25) {
    ctx.strokeStyle = "rgba(70, 85, 105, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tankX, ry);
    ctx.lineTo(tankX + tankW, ry);
    ctx.stroke();
  }
  drawLabel(ctx, "TANK T-101", tankX + tankW / 2, tankY + 15, 10, "rgba(200, 210, 220, 0.4)", "rgba(30, 40, 55, 0.6)");
  // Level indicator
  const levelH = tankH * 0.65;
  ctx.fillStyle = "rgba(0, 180, 220, 0.08)";
  ctx.fillRect(tankX + 5, tankY + tankH - levelH, tankW - 10, levelH);

  // Control cabinet with warning label
  const cabX = width * 0.32;
  const cabY = ceilingY + 30;
  drawRect(ctx, cabX, cabY, 70, floorY - cabY - 15, "rgba(30, 40, 55, 0.7)", "rgba(255, 179, 0, 0.2)");
  drawLabel(ctx, "MCC-01", cabX + 35, cabY + 15, 10, "rgba(255, 179, 0, 0.5)", "rgba(30, 35, 45, 0.7)");
  // Cabinet doors
  ctx.strokeStyle = "rgba(255, 179, 0, 0.15)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cabX + 35, cabY + 20);
  ctx.lineTo(cabX + 35, cabY + floorY - cabY - 20);
  ctx.stroke();
  // HV warning
  drawHazardStripes(ctx, cabX, cabY + floorY - cabY - 25, 70, 10, 8);

  // Conveyor structure (angled)
  ctx.strokeStyle = "rgba(120, 140, 160, 0.3)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(width * 0.52, floorY);
  ctx.lineTo(width * 0.82, ceilingY + 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.52, floorY + 8);
  ctx.lineTo(width * 0.82, ceilingY + 28);
  ctx.stroke();
  // Conveyor supports
  for (let t = 0; t < 1; t += 0.2) {
    const sx = width * 0.52 + (width * 0.3) * t;
    const sy1 = floorY - (floorY - ceilingY - 20) * t;
    ctx.strokeStyle = "rgba(100, 115, 130, 0.2)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, floorY);
    ctx.lineTo(sx, sy1);
    ctx.stroke();
  }
  drawLabel(ctx, "CONVEYOR CV-03", width * 0.67, ceilingY + 50, 9, "rgba(200, 210, 220, 0.3)");

  // Equipment on right side
  drawRect(ctx, width * 0.72, ceilingY + 30, 110, floorY - ceilingY - 50, "rgba(45, 55, 75, 0.5)", "rgba(0, 229, 255, 0.1)");
  drawLabel(ctx, "CRUSHER CR-01", width * 0.72 + 55, ceilingY + 50, 9, "rgba(200, 210, 220, 0.35)", "rgba(30, 40, 55, 0.5)");

  // Warning stripes on floor (walkway markers)
  drawHazardStripes(ctx, 0, floorY - 4, width, 8, 10);

  // Forklift path markings
  ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(0, floorY + 30);
  ctx.lineTo(width, floorY + 30);
  ctx.stroke();
  ctx.setLineDash([]);

  // Safety signage on walls
  drawLabel(ctx, "HARD HATS REQUIRED", width * 0.15, ceilingY + 12, 9, "rgba(255, 179, 0, 0.5)", "rgba(40, 40, 20, 0.6)");
  drawLabel(ctx, "EYE PROTECTION", width * 0.55, ceilingY + 12, 9, "rgba(255, 179, 0, 0.5)", "rgba(40, 40, 20, 0.6)");
  drawLabel(ctx, "EXIT", width * 0.92, ceilingY + (floorY - ceilingY) / 2, 14, "rgba(34, 197, 94, 0.5)", "rgba(20, 40, 25, 0.6)");

  // Overhead lights with cones
  for (let i = 0; i < 8; i++) {
    const lx = i * (width / 8) + width / 16;
    const ly = ceilingY - 10;
    // Light fixture
    ctx.fillStyle = "rgba(180, 190, 200, 0.15)";
    ctx.fillRect(lx - 15, ly - 3, 30, 6);
    // Light cone
    const lightGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly + 80, 120);
    lightGrad.addColorStop(0, "rgba(220, 230, 255, 0.12)");
    lightGrad.addColorStop(0.5, "rgba(220, 230, 255, 0.04)");
    lightGrad.addColorStop(1, "rgba(220, 230, 255, 0)");
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.moveTo(lx - 15, ly);
    ctx.lineTo(lx - 80, ly + 200);
    ctx.lineTo(lx + 80, ly + 200);
    ctx.lineTo(lx + 15, ly);
    ctx.closePath();
    ctx.fill();
  }

  // Dust/atmosphere effect
  for (let i = 0; i < 150; i++) {
    const px = Math.random() * width;
    const py = ceilingY + Math.random() * (floorY - ceilingY);
    ctx.fillStyle = `rgba(180, 190, 210, ${Math.random() * 0.03})`;
    ctx.fillRect(px, py, 1 + Math.random() * 2, 1);
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

  const floorY = height * 0.58;

  // Carpet floor with subtle pattern
  ctx.fillStyle = "rgba(30, 35, 50, 0.3)";
  ctx.fillRect(0, floorY, width, height - floorY);
  drawGrid(ctx, width, height, 40, "rgba(60, 70, 90, 0.08)", floorY, height);
  // Anti-static floor tiles
  for (let x = 0; x < width; x += 80) {
    for (let y = floorY; y < height; y += 80) {
      ctx.strokeStyle = "rgba(50, 60, 80, 0.1)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, 80, 80);
    }
  }

  // Ceiling tiles with recessed lights
  drawGrid(ctx, width, height, 120, "rgba(50, 60, 80, 0.08)", 0, height * 0.25);

  // Acoustic ceiling panels
  for (let x = 0; x < width; x += 120) {
    for (let y = 0; y < height * 0.22; y += 120) {
      ctx.strokeStyle = "rgba(45, 55, 75, 0.12)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 5, y + 5, 110, 110);
    }
  }

  // Monitor wall — 3 rows of screens
  for (let row = 0; row < 3; row++) {
    const cols = row === 0 ? 8 : 6;
    for (let col = 0; col < cols; col++) {
      const mx = col * (width / cols) + 20;
      const my = height * 0.24 + row * (height * 0.1 + 5);
      const mw = width / cols - 35;
      const mh = height * 0.09;

      // Screen bezel (thin)
      drawRect(ctx, mx - 2, my - 2, mw + 4, mh + 4, "rgba(15, 18, 25, 0.9)");
      ctx.strokeStyle = "rgba(40, 50, 65, 0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - 2, my - 2, mw + 4, mh + 4);

      // Screen content
      const screenGrad = ctx.createLinearGradient(mx, my, mx, my + mh);
      screenGrad.addColorStop(0, "rgba(0, 50, 80, 0.5)");
      screenGrad.addColorStop(0.5, "rgba(0, 30, 60, 0.35)");
      screenGrad.addColorStop(1, "rgba(0, 40, 70, 0.5)");
      ctx.fillStyle = screenGrad;
      ctx.fillRect(mx, my, mw, mh);

      // Scanlines
      for (let sy = my; sy < my + mh; sy += 2) {
        ctx.fillStyle = "rgba(0, 80, 120, 0.03)";
        ctx.fillRect(mx, sy, mw, 1);
      }

      // Different screen content per position
      if (row === 0) {
        // SCADA screens — waveforms
        ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
        ctx.lineWidth = 1;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          const ly = my + mh * 0.25 + j * (mh * 0.25);
          ctx.moveTo(mx + 5, ly);
          for (let px = mx + 5; px < mx + mw - 5; px += 3) {
            ctx.lineTo(px, ly + (Math.sin(px * 0.05 + j * 2) * 4 + (Math.random() - 0.5) * 3));
          }
          ctx.stroke();
        }
      } else if (row === 1) {
        // Process diagrams — blocks and lines
        ctx.strokeStyle = "rgba(0, 200, 150, 0.2)";
        ctx.lineWidth = 1;
        const bw = mw / 5;
        for (let b = 0; b < 3; b++) {
          ctx.strokeRect(mx + 10 + b * (bw + 10), my + 10, bw - 5, mh - 20);
          if (b < 2) {
            ctx.beginPath();
            ctx.moveTo(mx + 10 + (b + 1) * (bw + 10) - 10, my + mh / 2);
            ctx.lineTo(mx + 10 + (b + 1) * (bw + 10), my + mh / 2);
            ctx.stroke();
          }
        }
      } else {
        // Camera feeds — darker with outlines
        ctx.fillStyle = "rgba(5, 10, 20, 0.4)";
        ctx.fillRect(mx + 3, my + 3, mw - 6, mh - 6);
        // REC indicator
        ctx.fillStyle = "rgba(255, 50, 50, 0.3)";
        ctx.beginPath();
        ctx.arc(mx + 10, my + 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Operator desk (curved)
  const deskY = floorY - 8;
  ctx.fillStyle = "rgba(40, 50, 65, 0.6)";
  ctx.beginPath();
  ctx.moveTo(width * 0.05, deskY + 12);
  ctx.quadraticCurveTo(width * 0.5, deskY - 5, width * 0.95, deskY + 12);
  ctx.lineTo(width * 0.95, deskY + 20);
  ctx.quadraticCurveTo(width * 0.5, deskY + 3, width * 0.05, deskY + 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(60, 75, 95, 0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Keyboard/mouse at workstations
  for (let i = 0; i < 5; i++) {
    const dx = width * 0.12 + i * (width * 0.18);
    // Keyboard
    drawRect(ctx, dx - 25, deskY + 2, 50, 12, "rgba(25, 30, 40, 0.5)", "rgba(60, 70, 85, 0.2)");
    // Mouse
    ctx.fillStyle = "rgba(35, 40, 50, 0.4)";
    ctx.beginPath();
    ctx.ellipse(dx + 35, deskY + 8, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Small monitor on desk
    drawRect(ctx, dx - 20, deskY - 20, 40, 18, "rgba(10, 15, 25, 0.7)", "rgba(40, 50, 65, 0.3)");
    ctx.fillStyle = "rgba(0, 40, 70, 0.4)";
    ctx.fillRect(dx - 18, deskY - 18, 36, 14);
  }

  // Wall labels
  drawLabel(ctx, "DISTRIBUTED CONTROL SYSTEM", width * 0.5, height * 0.22, 12, "rgba(0, 229, 255, 0.3)");
  drawLabel(ctx, "CONTROL ROOM - AUTHORIZED PERSONNEL ONLY", width * 0.5, floorY + 30, 10, "rgba(200, 210, 220, 0.15)");

  // Clock on wall
  const clockX = width * 0.88;
  const clockY = height * 0.26;
  ctx.strokeStyle = "rgba(200, 210, 220, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(clockX, clockY, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(200, 210, 220, 0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX, clockY - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX + 8, clockY + 3);
  ctx.stroke();

  // Ambient glow from screens
  for (let i = 0; i < 8; i++) {
    const gx = i * (width / 8) + width / 16;
    const glow = ctx.createRadialGradient(gx, height * 0.35, 0, gx, height * 0.35, 180);
    glow.addColorStop(0, "rgba(0, 80, 160, 0.04)");
    glow.addColorStop(1, "rgba(0, 80, 160, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(gx - 180, height * 0.15, 360, 400);
  }

  // Recessed ceiling lights
  for (let i = 0; i < 5; i++) {
    const lx = i * (width / 5) + width / 10;
    const ly = height * 0.05;
    ctx.fillStyle = "rgba(150, 160, 180, 0.08)";
    ctx.fillRect(lx - 25, ly, 50, 8);
    const lightGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 60);
    lightGrad.addColorStop(0, "rgba(180, 200, 230, 0.06)");
    lightGrad.addColorStop(1, "rgba(180, 200, 230, 0)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(lx - 60, ly - 10, 120, 120);
  }

  // Fire panel on wall
  drawRect(ctx, width * 0.04, height * 0.32, 30, 40, "rgba(50, 20, 20, 0.5)", "rgba(255, 60, 60, 0.2)");
  drawLabel(ctx, "FIRE", width * 0.04 + 15, height * 0.32 + 15, 7, "rgba(255, 60, 60, 0.4)");
}

function drawOutdoor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Sky gradient — twilight
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  skyGrad.addColorStop(0, "#0a1628");
  skyGrad.addColorStop(0.3, "#1a2a4a");
  skyGrad.addColorStop(0.6, "#2a3a5a");
  skyGrad.addColorStop(0.85, "#3a4a5a");
  skyGrad.addColorStop(1, "#4a4a45");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.5);

  // Stars with varied brightness
  for (let i = 0; i < 200; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height * 0.3;
    const size = Math.random() * 2;
    const brightness = Math.random() * 0.6 + 0.1;
    ctx.fillStyle = `rgba(200, 210, 230, ${brightness})`;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground
  const groundGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
  groundGrad.addColorStop(0, "#4a3a2a");
  groundGrad.addColorStop(0.1, "#3a3020");
  groundGrad.addColorStop(0.4, "#2a2518");
  groundGrad.addColorStop(1, "#1a1a0a");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  // Horizon glow (sunset remnant)
  const horizGlow = ctx.createLinearGradient(0, height * 0.42, 0, height * 0.55);
  horizGlow.addColorStop(0, "rgba(255, 120, 40, 0)");
  horizGlow.addColorStop(0.4, "rgba(255, 120, 40, 0.1)");
  horizGlow.addColorStop(0.6, "rgba(255, 80, 20, 0.06)");
  horizGlow.addColorStop(1, "rgba(255, 80, 20, 0)");
  ctx.fillStyle = horizGlow;
  ctx.fillRect(0, height * 0.42, width, height * 0.13);

  // Distant mountain range (layered)
  // Far mountains
  ctx.fillStyle = "rgba(25, 30, 45, 0.6)";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.5);
  for (let x = 0; x <= width; x += 15) {
    const h = Math.sin(x * 0.003) * 35 + Math.sin(x * 0.008) * 20 + Math.sin(x * 0.015) * 10;
    ctx.lineTo(x, height * 0.46 - h);
  }
  ctx.lineTo(width, height * 0.5);
  ctx.closePath();
  ctx.fill();

  // Near hills
  ctx.fillStyle = "rgba(35, 35, 50, 0.7)";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.5);
  for (let x = 0; x <= width; x += 10) {
    const h = Math.sin(x * 0.005 + 1) * 25 + Math.sin(x * 0.012 + 2) * 12;
    ctx.lineTo(x, height * 0.49 - h);
  }
  ctx.lineTo(width, height * 0.5);
  ctx.closePath();
  ctx.fill();

  // Industrial structures on horizon (more detailed)
  // Processing plant (left)
  const plantX = width * 0.12;
  drawRect(ctx, plantX, height * 0.38, 40, height * 0.12, "rgba(20, 25, 40, 0.8)", "rgba(50, 60, 80, 0.3)");
  drawRect(ctx, plantX + 10, height * 0.32, 20, height * 0.06, "rgba(20, 25, 40, 0.8)", "rgba(50, 60, 80, 0.3)");
  // Red obstruction light
  ctx.fillStyle = "rgba(255, 30, 30, 0.5)";
  ctx.beginPath();
  ctx.arc(plantX + 20, height * 0.32, 2, 0, Math.PI * 2);
  ctx.fill();

  // Headframe (center-left)
  const hfX = width * 0.32;
  ctx.strokeStyle = "rgba(60, 70, 90, 0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hfX - 15, height * 0.5);
  ctx.lineTo(hfX, height * 0.3);
  ctx.lineTo(hfX + 15, height * 0.5);
  ctx.stroke();
  // Cross braces
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hfX - 10, height * 0.42);
  ctx.lineTo(hfX + 10, height * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hfX - 7, height * 0.36);
  ctx.lineTo(hfX + 7, height * 0.36);
  ctx.stroke();
  // Red light
  ctx.fillStyle = "rgba(255, 30, 30, 0.5)";
  ctx.beginPath();
  ctx.arc(hfX, height * 0.3, 2, 0, Math.PI * 2);
  ctx.fill();

  // Conveyor (right side, angled)
  ctx.strokeStyle = "rgba(60, 70, 90, 0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width * 0.6, height * 0.5);
  ctx.lineTo(width * 0.72, height * 0.38);
  ctx.stroke();
  // Supports
  for (let t = 0; t < 1; t += 0.25) {
    const sx = width * 0.6 + (width * 0.12) * t;
    const sy = height * 0.5 - (height * 0.12) * t;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, height * 0.5);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }

  // Stockpile
  ctx.fillStyle = "rgba(60, 50, 35, 0.5)";
  ctx.beginPath();
  ctx.moveTo(width * 0.75, height * 0.5);
  ctx.quadraticCurveTo(width * 0.82, height * 0.4, width * 0.9, height * 0.5);
  ctx.closePath();
  ctx.fill();

  // Power lines (more detailed with insulators)
  for (let i = 0; i < 8; i++) {
    const px = i * (width / 7);
    // Pole
    ctx.strokeStyle = "rgba(80, 90, 100, 0.2)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, height * 0.38);
    ctx.lineTo(px, height * 0.5);
    ctx.stroke();
    // Cross arm
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 15, height * 0.39);
    ctx.lineTo(px + 15, height * 0.39);
    ctx.stroke();
  }
  // Wires (catenary curves)
  for (let wireY = height * 0.39; wireY <= height * 0.41; wireY += 3) {
    ctx.strokeStyle = "rgba(80, 90, 100, 0.1)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, wireY);
    for (let x = 0; x < width; x += width / 7) {
      ctx.quadraticCurveTo(x + width / 14, wireY + 6, x + width / 7, wireY);
    }
    ctx.stroke();
  }

  // Ground texture (red earth / gravel — more detail)
  for (let i = 0; i < 500; i++) {
    const gx = Math.random() * width;
    const gy = height * 0.52 + Math.random() * height * 0.45;
    const r = 70 + Math.random() * 50;
    const g = 55 + Math.random() * 35;
    const b = 35 + Math.random() * 25;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.04 + Math.random() * 0.08})`;
    ctx.fillRect(gx, gy, 2 + Math.random() * 5, 1 + Math.random() * 2);
  }

  // Dirt road tracks
  ctx.strokeStyle = "rgba(80, 65, 45, 0.12)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.65);
  ctx.quadraticCurveTo(width * 0.3, height * 0.63, width * 0.5, height * 0.67);
  ctx.quadraticCurveTo(width * 0.7, height * 0.7, width, height * 0.66);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, height * 0.68);
  ctx.quadraticCurveTo(width * 0.3, height * 0.66, width * 0.5, height * 0.7);
  ctx.quadraticCurveTo(width * 0.7, height * 0.73, width, height * 0.69);
  ctx.stroke();

  // Fence (chain-link)
  for (let i = 0; i < 15; i++) {
    const fx = i * (width / 14);
    ctx.strokeStyle = "rgba(100, 110, 120, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, height * 0.44);
    ctx.lineTo(fx, height * 0.54);
    ctx.stroke();
  }
  // Wire mesh suggestion
  for (let fy = height * 0.45; fy < height * 0.53; fy += 4) {
    ctx.strokeStyle = "rgba(100, 110, 120, 0.06)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(width, fy);
    ctx.stroke();
  }

  // Security lights on poles
  for (let i = 0; i < 3; i++) {
    const slx = width * 0.2 + i * (width * 0.3);
    const sly = height * 0.44;
    ctx.fillStyle = "rgba(255, 220, 150, 0.3)";
    ctx.beginPath();
    ctx.arc(slx, sly, 3, 0, Math.PI * 2);
    ctx.fill();
    const lightGrad = ctx.createRadialGradient(slx, sly, 0, slx, sly + 40, 80);
    lightGrad.addColorStop(0, "rgba(255, 220, 150, 0.08)");
    lightGrad.addColorStop(1, "rgba(255, 220, 150, 0)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(slx - 80, sly - 10, 160, 120);
  }

  // "RESTRICTED AREA" sign
  drawLabel(ctx, "RESTRICTED AREA - AUTHORIZED PERSONNEL ONLY", width * 0.5, height * 0.54, 10, "rgba(255, 179, 0, 0.4)", "rgba(40, 35, 20, 0.5)");
}

function drawPumpStation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Background — warm industrial tones
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#141a28");
  bgGrad.addColorStop(0.25, "#1a2235");
  bgGrad.addColorStop(0.5, "#18202e");
  bgGrad.addColorStop(1, "#0e1420");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const floorY = height * 0.58;
  const ceilingY = height * 0.15;

  // Concrete floor with epoxy coating
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
  floorGrad.addColorStop(0, "rgba(75, 80, 90, 0.2)");
  floorGrad.addColorStop(0.5, "rgba(60, 65, 75, 0.15)");
  floorGrad.addColorStop(1, "rgba(45, 50, 60, 0.1)");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, width, height - floorY);
  drawGrid(ctx, width, height, 60, "rgba(90, 100, 110, 0.08)", floorY, height);

  // Drain channels in floor
  ctx.strokeStyle = "rgba(0, 150, 200, 0.08)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.76);
  ctx.lineTo(width, height * 0.76);
  ctx.stroke();
  // Drain grate pattern
  for (let gx = 0; gx < width; gx += 20) {
    ctx.strokeStyle = "rgba(60, 70, 80, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, height * 0.76 - 6);
    ctx.lineTo(gx, height * 0.76 + 6);
    ctx.stroke();
  }

  // Wall with tiles (bottom half)
  for (let x = 0; x < width; x += 30) {
    for (let y = ceilingY; y < floorY; y += 20) {
      ctx.strokeStyle = "rgba(55, 65, 80, 0.1)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, 30, 20);
    }
  }

  // MAIN FEATURE: Large pipes (color-coded, labeled)
  // Supply header (blue — water in)
  drawPipeHorizontal(ctx, 0, width, ceilingY + 15, 22, "rgba(60, 100, 160, 0.4)", width / 6);
  drawLabel(ctx, "SUPPLY HEADER — 12\" CS", width * 0.3, ceilingY + 5, 8, "rgba(100, 150, 220, 0.5)");

  // Return header (red — water out)
  drawPipeHorizontal(ctx, 0, width, ceilingY + 45, 22, "rgba(160, 70, 70, 0.35)", width / 6);
  drawLabel(ctx, "RETURN HEADER — 12\" CS", width * 0.7, ceilingY + 35, 8, "rgba(200, 100, 100, 0.5)");

  // Bypass line (green — emergency)
  drawPipeHorizontal(ctx, 0, width, ceilingY + 70, 10, "rgba(70, 150, 70, 0.3)", width / 4);
  drawLabel(ctx, "BYPASS", width * 0.5, ceilingY + 63, 7, "rgba(100, 180, 100, 0.4)");

  // Vertical pipe runs (downcomers to each pump)
  const pumpCount = 4;
  const pumpSpacing = width / (pumpCount + 1);
  for (let i = 0; i < pumpCount; i++) {
    const vx = (i + 1) * pumpSpacing;
    // Supply downcomer
    drawPipeVertical(ctx, vx - 20, ceilingY + 15, floorY - 60, 12, "rgba(60, 100, 160, 0.3)", 80);
    // Return riser
    drawPipeVertical(ctx, vx + 20, ceilingY + 45, floorY - 60, 12, "rgba(160, 70, 70, 0.25)", 80);
  }

  // Pump units on floor (detailed)
  for (let i = 0; i < pumpCount; i++) {
    const px = (i + 1) * pumpSpacing - 50;
    const py = floorY - 50;
    const pumpW = 100;
    const pumpH = 45;

    // Pump base/skid
    drawRect(ctx, px - 10, py + pumpH, pumpW + 20, 8, "rgba(60, 65, 75, 0.4)", "rgba(80, 90, 100, 0.2)");

    // Pump body (volute casing)
    ctx.fillStyle = "rgba(50, 60, 80, 0.6)";
    ctx.beginPath();
    ctx.ellipse(px + 30, py + pumpH / 2, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(100, 120, 150, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px + 30, py + pumpH / 2, 25, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Impeller center
    ctx.strokeStyle = "rgba(0, 229, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px + 30, py + pumpH / 2, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Motor
    drawRect(ctx, px + 55, py + 5, 45, pumpH - 10, "rgba(40, 50, 65, 0.5)", "rgba(100, 120, 140, 0.2)");
    // Motor cooling fins
    for (let fy = py + 10; fy < py + pumpH - 5; fy += 4) {
      ctx.strokeStyle = "rgba(70, 80, 95, 0.2)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px + 57, fy);
      ctx.lineTo(px + 98, fy);
      ctx.stroke();
    }
    // Motor nameplate
    drawRect(ctx, px + 62, py + 12, 30, 12, "rgba(25, 30, 40, 0.6)", "rgba(80, 90, 100, 0.2)");
    drawLabel(ctx, `${75 + i * 15}kW`, px + 77, py + 22, 7, "rgba(200, 210, 220, 0.3)");

    // Coupling guard
    drawRect(ctx, px + 50, py + 10, 8, pumpH - 20, "rgba(255, 179, 0, 0.08)", "rgba(255, 179, 0, 0.15)");

    // Suction/discharge flanges
    ctx.fillStyle = "rgba(80, 100, 130, 0.3)";
    ctx.fillRect(px + 3, py + pumpH / 2 - 8, 6, 16);
    ctx.fillRect(px + 25, py - 5, 12, 8);

    // Status indicator
    const isWarning = i === 2;
    const statusColor = isWarning ? "rgba(255, 50, 50, 0.6)" : "rgba(0, 229, 255, 0.4)";
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(px + 77, py + 35, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pump label
    const pumpLabel = `P-${101 + i}`;
    drawLabel(ctx, pumpLabel, px + 50, py + pumpH + 18, 10, "rgba(200, 210, 220, 0.4)");
    if (isWarning) {
      drawLabel(ctx, "[HIGH VIBRATION]", px + 50, py + pumpH + 30, 8, "rgba(255, 80, 80, 0.5)");
    }
  }

  // Valve wheels on vertical pipes
  for (let i = 0; i < pumpCount; i++) {
    const vx = (i + 1) * pumpSpacing;
    const vy = ceilingY + 100;
    // Gate valve symbol
    ctx.strokeStyle = "rgba(255, 179, 0, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(vx - 20, vy, 14, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes
    for (let s = 0; s < 6; s++) {
      const angle = (s * Math.PI) / 3;
      ctx.strokeStyle = "rgba(255, 179, 0, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vx - 20, vy);
      ctx.lineTo(vx - 20 + Math.cos(angle) * 12, vy + Math.sin(angle) * 12);
      ctx.stroke();
    }
    // Valve label
    drawLabel(ctx, `V-${i + 1}`, vx - 20, vy + 20, 7, "rgba(255, 179, 0, 0.3)");
  }

  // Pressure gauges on wall between pipes and pumps
  for (let i = 0; i < pumpCount + 1; i++) {
    const gx = i * pumpSpacing + pumpSpacing / 2;
    const gy = ceilingY + 140;
    const value = 0.3 + Math.random() * 0.5;
    drawGauge(ctx, gx, gy, 18, value, `${(value * 10).toFixed(1)} bar`, "rgba(20, 25, 35, 0.5)", "rgba(200, 210, 220, 0.2)", "rgba(255, 179, 0, 0.4)");
  }

  // Flow meters (digital displays)
  for (let i = 0; i < pumpCount; i++) {
    const fx = (i + 1) * pumpSpacing;
    const fy = ceilingY + 180;
    drawRect(ctx, fx - 25, fy, 50, 20, "rgba(15, 20, 30, 0.7)", "rgba(0, 229, 255, 0.15)");
    drawLabel(ctx, `${(120 + i * 30).toFixed(0)} m³/h`, fx, fy + 14, 8, "rgba(0, 229, 255, 0.5)");
  }

  // Warning signs on wall
  // Triangle warning
  const warnX = width * 0.08;
  const warnY = ceilingY + 95;
  ctx.fillStyle = "rgba(255, 179, 0, 0.2)";
  ctx.beginPath();
  ctx.moveTo(warnX, warnY - 15);
  ctx.lineTo(warnX - 15, warnY + 10);
  ctx.lineTo(warnX + 15, warnY + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 179, 0, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawLabel(ctx, "!", warnX, warnY + 5, 12, "rgba(255, 179, 0, 0.5)");
  drawLabel(ctx, "ROTATING EQUIPMENT", warnX, warnY + 25, 8, "rgba(255, 179, 0, 0.4)");

  // Safety labels
  drawLabel(ctx, "PUMP STATION PS-01", width * 0.5, ceilingY - 5, 14, "rgba(200, 210, 220, 0.3)", "rgba(15, 20, 30, 0.5)");
  drawLabel(ctx, "LOCKOUT/TAGOUT REQUIRED", width * 0.85, ceilingY + 95, 8, "rgba(255, 60, 60, 0.4)", "rgba(40, 20, 20, 0.5)");

  // Hazard stripes on floor edges
  drawHazardStripes(ctx, 0, floorY - 4, width, 8, 10);

  // Cable trays along ceiling
  ctx.strokeStyle = "rgba(80, 90, 100, 0.15)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(0, ceilingY - 15);
  ctx.lineTo(width, ceilingY - 15);
  ctx.stroke();
  ctx.setLineDash([]);
  drawLabel(ctx, "CABLE TRAY", width * 0.15, ceilingY - 20, 7, "rgba(80, 90, 100, 0.25)");

  // Overhead lights with industrial reflectors
  for (let i = 0; i < 6; i++) {
    const lx = i * (width / 6) + width / 12;
    const ly = ceilingY - 25;
    // Light fixture (industrial pendant)
    ctx.fillStyle = "rgba(150, 160, 170, 0.12)";
    ctx.beginPath();
    ctx.moveTo(lx - 2, ly - 10);
    ctx.lineTo(lx + 2, ly - 10);
    ctx.lineTo(lx + 18, ly);
    ctx.lineTo(lx - 18, ly);
    ctx.closePath();
    ctx.fill();
    // Light cone
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly + 60, 100);
    glow.addColorStop(0, "rgba(220, 200, 160, 0.1)");
    glow.addColorStop(0.5, "rgba(220, 200, 160, 0.03)");
    glow.addColorStop(1, "rgba(220, 200, 160, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(lx - 18, ly);
    ctx.lineTo(lx - 70, ly + 200);
    ctx.lineTo(lx + 70, ly + 200);
    ctx.lineTo(lx + 18, ly);
    ctx.closePath();
    ctx.fill();
  }

  // Moisture/humidity effect (subtle)
  for (let i = 0; i < 100; i++) {
    const mx = Math.random() * width;
    const my = floorY + Math.random() * (height * 0.15);
    ctx.fillStyle = `rgba(150, 180, 210, ${Math.random() * 0.02})`;
    ctx.fillRect(mx, my, 1, 1 + Math.random() * 3);
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
