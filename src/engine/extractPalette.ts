"use client";

type Px = [number, number, number];

const luma = (c: Px) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function toHex(c: Px): string {
  return "#" + c.map((v) => clamp255(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Median-cut quantization: split the color box with the widest channel range
// at its median until maxColors boxes remain, then average each box.
export function extractPalette(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  maxColors = 8,
): string[] {
  if (!sw || !sh) return [];
  const scale = Math.min(1, 96 / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pixels: Px[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (pixels.length === 0) return [];

  const boxes: Px[][] = [pixels];
  while (boxes.length < maxColors) {
    let bi = -1;
    let bch = 0;
    let bestRange = 0;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let min = 255;
        let max = 0;
        for (const p of box) {
          if (p[ch] < min) min = p[ch];
          if (p[ch] > max) max = p[ch];
        }
        if (max - min > bestRange) {
          bestRange = max - min;
          bi = i;
          bch = ch;
        }
      }
    }
    if (bi < 0 || bestRange < 4) break;
    const box = boxes[bi];
    box.sort((a, b) => a[bch] - b[bch]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }

  const colors: Px[] = boxes.map((box) => {
    const sum: Px = [0, 0, 0];
    for (const p of box) {
      sum[0] += p[0];
      sum[1] += p[1];
      sum[2] += p[2];
    }
    return [sum[0] / box.length, sum[1] / box.length, sum[2] / box.length];
  });
  colors.sort((a, b) => luma(a) - luma(b));

  const hexes: string[] = [];
  for (const col of colors) {
    const hex = toHex(col);
    if (!hexes.includes(hex)) hexes.push(hex);
  }
  if (hexes.length === 1) {
    const base = colors[0];
    const partner: Px = luma(base) > 127
      ? [base[0] * 0.35, base[1] * 0.35, base[2] * 0.35]
      : [base[0] + (255 - base[0]) * 0.65, base[1] + (255 - base[1]) * 0.65, base[2] + (255 - base[2]) * 0.65];
    hexes.push(toHex(partner));
    hexes.sort((a, b) => {
      const pa = parseInt(a.slice(1), 16);
      const pb = parseInt(b.slice(1), 16);
      const la = ((pa >> 16) & 255) * 0.299 + ((pa >> 8) & 255) * 0.587 + (pa & 255) * 0.114;
      const lb = ((pb >> 16) & 255) * 0.299 + ((pb >> 8) & 255) * 0.587 + (pb & 255) * 0.114;
      return la - lb;
    });
  }
  return hexes.slice(0, maxColors);
}