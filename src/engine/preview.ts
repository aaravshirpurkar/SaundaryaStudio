"use client";

import type { ActiveEffect } from "@/types/studio";
import { hexToRgb255 } from "@/data/palettes";

// Lightweight CPU renderings of each engine used for library hover previews.
// Same mathematics as the GPU shaders, at thumbnail resolution.
export function renderPreview(
  out: HTMLCanvasElement,
  source: HTMLCanvasElement | HTMLImageElement,
  effect: ActiveEffect,
  palette: string[],
  sourceColor = false,
) {
  const w = out.width, h = out.height;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
  const sw = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const sh = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!sw || !sh) return;
  const scale = Math.max(w / sw, h / sh);
  tctx.drawImage(source, (w - sw * scale) / 2, (h - sh * scale) / 2, sw * scale, sh * scale);
  let data: Uint8ClampedArray;
  try {
    data = tctx.getImageData(0, 0, w, h).data;
  } catch {
    return; // tainted canvas — leave raw thumbnail
  }
  const ctx = out.getContext("2d")!;
  const cols = palette.map(hexToRgb255);
  const lumaAt = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  };

  if (effect === "mesh") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    const stops = cols.length >= 4 ? cols : [...cols, ...cols, ...cols].slice(0, 4);
    stops.forEach((c, i) => g.addColorStop(i / 3, `rgb(${c[0]},${c[1]},${c[2]})`));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 300; i++) {
      ctx.fillRect((i * 97.13 % 1) * w, (i * 57.77 % 1) * h, 1, 1);
    }
    return;
  }

  const ink = cols[cols.length - 1];
  const paper = cols[0];

  if (effect === "dither") {
    const img = ctx.createImageData(w, h);
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const off = (bayer[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 255 * 0.9;
        const r = data[i] + off, g = data[i + 1] + off, b = data[i + 2] + off;
        let best = cols[0], bd = Infinity;
        for (const c of cols) {
          const dd = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
          if (dd < bd) { bd = dd; best = c; }
        }
        img.data[i] = best[0]; img.data[i + 1] = best[1]; img.data[i + 2] = best[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return;
  }

  if (effect === "ascii") {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);
    const chars = " .:-=+*#%@";
    const cell = 6;
    ctx.font = `${cell}px monospace`;
    if (!sourceColor) ctx.fillStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const cx = Math.min(x + cell / 2, w - 1) | 0;
        const cy = Math.min(y + cell / 2, h - 1) | 0;
        const l = lumaAt(cx, cy);
        const ch = chars[Math.min(chars.length - 1, Math.floor(l * chars.length))];
        if (sourceColor) {
          const ci = (cy * w + cx) * 4;
          ctx.fillStyle = `rgb(${Math.max(20, data[ci])},${Math.max(20, data[ci + 1])},${Math.max(20, data[ci + 2])})`;
        }
        ctx.fillText(ch, x, y + cell);
      }
    }
    return;
  }

  // halftone
  ctx.fillStyle = `rgb(${paper[0]},${paper[1]},${paper[2]})`;
  ctx.fillRect(0, 0, w, h);
  const cell = 6;
  ctx.fillStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`;
  for (let y = cell / 2; y < h; y += cell) {
    for (let x = cell / 2; x < w; x += cell) {
      const l = lumaAt(x | 0, y | 0);
      const r = Math.sqrt(1 - l) * cell * 0.62;
      if (r < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}