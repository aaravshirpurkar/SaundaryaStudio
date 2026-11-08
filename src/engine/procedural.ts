import type { ProceduralId } from "@/types/studio";

export type GeneratorFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

const TAU = Math.PI * 2;
const LOOP = 8; // every generator is periodic over 8 seconds

function bg(ctx: CanvasRenderingContext2D, w: number, h: number, color = "#07070C") {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

type V3 = [number, number, number];

function rotateY(v: V3, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}
function rotateX(v: V3, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}
function project(v: V3, w: number, h: number, dist = 4.5): [number, number, number] {
  const s = dist / (dist + v[2]);
  return [w / 2 + v[0] * s * h * 0.32, h / 2 + v[1] * s * h * 0.32, s];
}

// ── Torus Knot ─────────────────────────────────────────────────────────────
const torusKnot: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h);
  const ay = (t / LOOP) * TAU;
  const N = 240;
  const pts: V3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * TAU;
    const r = 2 + Math.cos(3 * u);
    let v: V3 = [r * Math.cos(2 * u), r * Math.sin(2 * u), Math.sin(3 * u) * 1.2];
    v = rotateX(v, 0.6);
    v = rotateY(v, ay);
    pts.push(v);
  }
  ctx.lineWidth = Math.max(1, h / 360);
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const v = pts[i];
      const off = pass === 0 ? 0 : 0.16;
      const [x, y, s] = project([v[0], v[1] + off, v[2]], w, h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      void s;
    }
    ctx.strokeStyle = pass === 0 ? "rgba(250,250,250,0.95)" : "rgba(16,185,129,0.55)";
    ctx.stroke();
  }
  // wireframe rungs
  ctx.strokeStyle = "rgba(250,250,250,0.28)";
  ctx.beginPath();
  for (let i = 0; i < N; i += 6) {
    const a = project(pts[i], w, h);
    const b = project([pts[i][0], pts[i][1] + 0.16, pts[i][2]], w, h);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
};

// ── Wireframe Globe ────────────────────────────────────────────────────────
const wireframeGlobe: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h);
  const ay = (t / LOOP) * TAU;
  const R = 1.5;
  ctx.lineWidth = Math.max(1, h / 420);
  const drawLine = (pts: V3[]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = project(pts[i], w, h, 5);
      const b = project(pts[i + 1], w, h, 5);
      const front = pts[i][2] < 0.2;
      ctx.strokeStyle = front ? "rgba(52,255,122,0.9)" : "rgba(52,255,122,0.16)";
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  };
  for (let lat = -60; lat <= 60; lat += 30) {
    const phi = (lat * Math.PI) / 180;
    const pts: V3[] = [];
    for (let i = 0; i <= 72; i++) {
      const th = (i / 72) * TAU;
      pts.push(rotateY([R * Math.cos(phi) * Math.cos(th), R * Math.sin(phi), R * Math.cos(phi) * Math.sin(th)], ay));
    }
    drawLine(pts);
  }
  for (let lon = 0; lon < 180; lon += 15) {
    const th0 = (lon * Math.PI) / 180;
    const pts: V3[] = [];
    for (let i = 0; i <= 72; i++) {
      const phi = (i / 72) * TAU;
      pts.push(rotateY([R * Math.cos(phi) * Math.cos(th0), R * Math.sin(phi), R * Math.cos(phi) * Math.sin(th0)], ay));
    }
    drawLine(pts);
  }
};

// ── Topographic Waves (ridgeline) ──────────────────────────────────────────
function ridgeNoise(x: number, row: number, t: number): number {
  const p = (t / LOOP) * TAU;
  return (
    Math.sin(x * 0.012 + row * 0.55 + Math.cos(p) * 1.4) * 0.5 +
    Math.sin(x * 0.027 - row * 0.31 + Math.sin(p) * 1.8) * 0.3 +
    Math.sin(x * 0.061 + row * 1.13 + p) * 0.2
  );
}
const topoWaves: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h, "#0A0A0E");
  const rows = 26;
  const cx = w * 0.5;
  const sigma = w * 0.22;
  for (let r = rows; r >= 0; r--) {
    const baseY = h * 0.18 + (r / rows) * h * 0.7;
    ctx.beginPath();
    ctx.moveTo(-10, baseY);
    for (let x = 0; x <= w + 10; x += 5) {
      const bump = Math.exp(-((x - cx) ** 2) / (2 * sigma * sigma));
      const y = baseY - Math.abs(ridgeNoise(x, r, t)) * h * 0.16 * bump - bump * h * 0.05;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w + 10, h + 10);
    ctx.lineTo(-10, h + 10);
    ctx.closePath();
    ctx.fillStyle = "#0A0A0E";
    ctx.fill();
    ctx.strokeStyle = `rgba(250,250,250,${0.25 + (r / rows) * 0.65})`;
    ctx.lineWidth = Math.max(1, h / 480);
    ctx.stroke();
  }
};

// ── Sacred Geometry Mandala ────────────────────────────────────────────────
const mandala: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h, "#0B0710");
  const cx = w / 2, cy = h / 2;
  const unit = h * 0.085;
  const p = (t / LOOP) * TAU;
  ctx.lineWidth = Math.max(1, h / 500);
  // flower-of-life rings
  for (let ring = 1; ring <= 4; ring++) {
    const n = ring * 6;
    const rr = unit * ring;
    const rot = p * (ring % 2 === 0 ? 1 : -1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rot;
      ctx.strokeStyle = `rgba(244,63,94,${0.16 + ring * 0.1})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, unit, 0, TAU);
      ctx.stroke();
    }
  }
  // rotating polygons
  for (let k = 0; k < 3; k++) {
    const sides = 6 + k * 2;
    const rr = unit * (2.2 + k * 1.15);
    const rot = p * (k % 2 === 0 ? 0.5 : -0.5) + k;
    ctx.strokeStyle = `rgba(250,250,250,${0.7 - k * 0.18})`;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * TAU + rot;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(16,185,129,0.8)";
  ctx.beginPath();
  ctx.arc(cx, cy, unit * 0.5, 0, TAU);
  ctx.stroke();
};

// ── Abstract Fluid Motion ──────────────────────────────────────────────────
const fluidLoop: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h, "#0B0B14");
  const p = (t / LOOP) * TAU;
  ctx.globalCompositeOperation = "lighter";
  const blobs = [
    { c: "79,70,229", rx: 0.32, ry: 0.24, sp: 1, ph: 0, r: 0.42 },
    { c: "244,63,94", rx: 0.26, ry: 0.3, sp: 1, ph: 2.1, r: 0.38 },
    { c: "16,185,129", rx: 0.36, ry: 0.2, sp: 1, ph: 4.2, r: 0.34 },
    { c: "0,240,255", rx: 0.2, ry: 0.34, sp: 1, ph: 5.6, r: 0.3 },
  ];
  for (const b of blobs) {
    const x = w / 2 + Math.cos(p * b.sp + b.ph) * w * b.rx + Math.sin(p * 2 + b.ph) * w * 0.06;
    const y = h / 2 + Math.sin(p * b.sp + b.ph * 1.3) * h * b.ry;
    const rad = Math.min(w, h) * b.r * (1 + 0.12 * Math.sin(p * 2 + b.ph));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${b.c},0.55)`);
    g.addColorStop(1, `rgba(${b.c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";
};

// ── Cybernetic Walk Cycle ──────────────────────────────────────────────────
const walkCycle: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h, "#050810");
  const p = (t / 2) * TAU; // 2s stride, divides 8s loop
  const cx = w / 2;
  const groundY = h * 0.82;
  const hipY = groundY - h * 0.34 + Math.abs(Math.sin(p)) * h * 0.018;
  const L1 = h * 0.17, L2 = h * 0.17;

  // scrolling floor grid
  ctx.strokeStyle = "rgba(0,240,255,0.14)";
  ctx.lineWidth = 1;
  const scroll = ((t / 2) % 1) * w * 0.1;
  for (let i = -1; i < 12; i++) {
    const x = ((i * w * 0.1 - scroll) % (w * 1.2)) - w * 0.1;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x - w * 0.06, h);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.strokeStyle = "rgba(0,240,255,0.4)";
  ctx.stroke();

  const limb = (hipX: number, phase: number, arm: boolean) => {
    const swing = Math.sin(phase) * (arm ? 0.5 : 0.62);
    const lift = Math.max(0, Math.sin(phase + Math.PI / 2)) * (arm ? 0.1 : 0.55);
    const a1 = swing + (arm ? Math.PI : 0);
    const kneeX = hipX + Math.sin(a1) * (arm ? L1 * 0.8 : L1);
    const kneeY = hipY + Math.cos(a1) * (arm ? L1 * 0.8 : L1) * (arm ? 1 : 1) - (arm ? 0 : lift * h * 0.02);
    const a2 = a1 + (arm ? 0.35 : lift * 1.1);
    const endX = kneeX + Math.sin(a2) * (arm ? L2 * 0.8 : L2);
    const endY = kneeY + Math.cos(a2) * (arm ? L2 * 0.8 : L2);
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(endX, arm ? endY : Math.min(endY, groundY));
    ctx.stroke();
    for (const [jx, jy] of [[hipX, hipY], [kneeX, kneeY], [endX, arm ? endY : Math.min(endY, groundY)]]) {
      ctx.beginPath();
      ctx.arc(jx, jy, h * 0.008, 0, TAU);
      ctx.fillStyle = "#00F0FF";
      ctx.fill();
    }
  };

  ctx.lineWidth = Math.max(2, h * 0.012);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,240,255,0.45)";
  limb(cx, p + Math.PI, false);
  limb(cx, p + Math.PI, true);
  // torso + head
  ctx.strokeStyle = "#00F0FF";
  ctx.beginPath();
  ctx.moveTo(cx, hipY);
  ctx.lineTo(cx, hipY - h * 0.2);
  ctx.stroke();
  ctx.strokeRect(cx - h * 0.045, hipY - h * 0.31, h * 0.09, h * 0.1);
  ctx.fillStyle = "rgba(0,240,255,0.9)";
  ctx.fillRect(cx - h * 0.02, hipY - h * 0.28, h * 0.04, h * 0.02);
  ctx.strokeStyle = "rgba(250,250,250,0.95)";
  limb(cx, p, false);
  limb(cx, p, true);
};

// ── Spinning Chrome Artifact ───────────────────────────────────────────────
const chromeArtifact: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h, "#08080C");
  const g = (1 + Math.sqrt(5)) / 2;
  const verts: V3[] = [
    [-1, g, 0], [1, g, 0], [-1, -g, 0], [1, -g, 0],
    [0, -1, g], [0, 1, g], [0, -1, -g], [0, 1, -g],
    [g, 0, -1], [g, 0, 1], [-g, 0, -1], [-g, 0, 1],
  ];
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const ay = (t / LOOP) * TAU;
  const ax = 0.4 + Math.sin((t / LOOP) * TAU) * 0.3;
  const rv = verts.map((v) => rotateX(rotateY(v, ay), ax));
  const sorted = faces
    .map((f) => ({ f, z: (rv[f[0]][2] + rv[f[1]][2] + rv[f[2]][2]) / 3 }))
    .sort((a, b) => b.z - a.z);
  const light: V3 = [0.5, -0.8, -0.6];
  for (const { f } of sorted) {
    const [a, b, c] = [rv[f[0]], rv[f[1]], rv[f[2]]];
    const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const nl = Math.hypot(...n) || 1;
    const dot = Math.max(0, (n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / nl);
    const shade = Math.round(30 + dot * 200);
    const pa = project(a, w, h, 6), pb = project(b, w, h, 6), pc = project(c, w, h, 6);
    const grad = ctx.createLinearGradient(pa[0], pa[1], pc[0], pc[1]);
    grad.addColorStop(0, `rgb(${shade},${shade},${Math.min(255, shade + 14)})`);
    grad.addColorStop(1, `rgb(${Math.round(shade * 0.4)},${Math.round(shade * 0.4)},${Math.round(shade * 0.45)})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.lineTo(pc[0], pc[1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(250,250,250,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};

// ── CRT Static / fallbacks ─────────────────────────────────────────────────
const crtStatic: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h, "#020604");
  const cell = Math.max(4, Math.floor(h / 90));
  const frame = Math.floor(t * 24);
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const n = Math.abs(Math.sin(x * 12.9898 + y * 78.233 + frame * 3.7) * 43758.5453) % 1;
      const v = Math.floor(n * 90);
      ctx.fillStyle = `rgb(${Math.floor(v * 0.2)},${v},${Math.floor(v * 0.4)})`;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  const barY = ((t / LOOP) * h * 2) % (h * 1.4) - h * 0.2;
  ctx.fillStyle = "rgba(52,255,122,0.12)";
  ctx.fillRect(0, barY, w, h * 0.12);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
};

const sculptureFallback: GeneratorFn = (ctx, w, h, t) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#2A2A30");
  g.addColorStop(1, "#0C0C10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.42;
  const rg = ctx.createRadialGradient(cx - w * 0.08, cy - h * 0.1, 10, cx, cy, h * 0.34);
  rg.addColorStop(0, "#E8E6E0");
  rg.addColorStop(0.6, "#9A9890");
  rg.addColorStop(1, "#3C3A38");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.13, h * 0.17, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.05, cy + h * 0.13);
  ctx.lineTo(cx + w * 0.05, cy + h * 0.13);
  ctx.lineTo(cx + w * 0.22, h * 0.86);
  ctx.lineTo(cx - w * 0.22, h * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#17171C";
  ctx.fillRect(cx - w * 0.26, h * 0.86, w * 0.52, h * 0.05);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  const off = Math.sin((t / LOOP) * TAU) * 4;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97.13) % 1) * w;
    const y = ((i * 57.7 + off) % 1) * h;
    ctx.fillRect(x, y, 2, 2);
  }
};

const brutalistFallback: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h, "#101014");
  const p = (t / LOOP) * TAU;
  for (let b = 0; b < 5; b++) {
    const bw = w * (0.16 + ((b * 37) % 10) / 60);
    const bx = ((b * 0.23 + 0.05) % 1) * w;
    const bh = h * (0.45 + ((b * 53) % 10) / 22);
    const shade = 60 + ((b * 29) % 5) * 30;
    ctx.fillStyle = `rgb(${shade},${shade},${shade + 4})`;
    ctx.fillRect(bx, h - bh, bw, bh);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    const cols = Math.max(2, Math.floor(bw / 26));
    const rows = Math.max(3, Math.floor(bh / 30));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 13 + b) % 3 === 0) continue;
        ctx.fillRect(bx + 6 + i * (bw - 12) / cols, h - bh + 8 + j * (bh - 16) / rows, (bw - 12) / cols * 0.55, (bh - 16) / rows * 0.5);
      }
    }
  }
  ctx.fillStyle = `rgba(250,250,250,${0.04 + 0.02 * Math.sin(p)})`;
  ctx.fillRect(0, 0, w, h);
};

const retroFallback: GeneratorFn = (ctx, w, h, t) => {
  bg(ctx, w, h, "#020804");
  ctx.font = `${Math.max(10, h / 28)}px monospace`;
  const chars = "01アイウエオカキクケコサシスセソ$#%&";
  const cols = Math.floor(w / (h / 28 * 0.62));
  const rows = Math.floor(h / (h / 26));
  const frame = Math.floor(t * 6);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = Math.abs(Math.sin(c * 12.9 + r * 78.2 + frame * 0.7) * 43758.5) % 1;
      if (n < 0.55) continue;
      ctx.fillStyle = `rgba(52,255,122,${0.15 + n * 0.6})`;
      ctx.fillText(chars[Math.floor(n * chars.length) % chars.length], c * (w / cols), (r + 1) * (h / rows));
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
};

const abstractFallback: GeneratorFn = (ctx, w, h, t) => {
  const p = (t / LOOP) * TAU;
  const g = ctx.createLinearGradient(0, 0, w * (1 + 0.2 * Math.sin(p)), h);
  g.addColorStop(0, "#1A1A2E");
  g.addColorStop(0.5, "#4F46E5");
  g.addColorStop(1, "#F43F5E");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

const GENERATORS: Record<ProceduralId, GeneratorFn> = {
  "torus-knot": torusKnot,
  "wireframe-globe": wireframeGlobe,
  "topo-waves": topoWaves,
  mandala,
  "fluid-loop": fluidLoop,
  "walk-cycle": walkCycle,
  "chrome-artifact": chromeArtifact,
  "crt-static": crtStatic,
  "sculpture-fallback": sculptureFallback,
  "brutalist-fallback": brutalistFallback,
  "retro-fallback": retroFallback,
  "abstract-fallback": abstractFallback,
};

export function getGenerator(id: ProceduralId): GeneratorFn {
  return GENERATORS[id] ?? abstractFallback;
}