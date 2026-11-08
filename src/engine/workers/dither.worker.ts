// True error-diffusion dithering (Floyd–Steinberg & Atkinson) off the main thread.
// Input: RGBA pixels already downscaled to one pixel per output block.
// Output: palette-quantized RGBA with error propagated through the luma channel.

interface DitherRequest {
  id: number;
  width: number;
  height: number;
  data: Uint8ClampedArray;
  algorithm: "floyd-steinberg" | "atkinson";
  palette: [number, number, number][]; // rgb 0-255
  invert: boolean;
  contrast: number;
  brightness: number;
  gamma: number;
}

const FS_KERNEL: [number, number, number][] = [
  [1, 0, 7 / 16],
  [-1, 1, 3 / 16],
  [0, 1, 5 / 16],
  [1, 1, 1 / 16],
];

const ATKINSON_KERNEL: [number, number, number][] = [
  [1, 0, 1 / 8],
  [2, 0, 1 / 8],
  [-1, 1, 1 / 8],
  [0, 1, 1 / 8],
  [1, 1, 1 / 8],
  [0, 2, 1 / 8],
];

function nearest(palette: [number, number, number][], r: number, g: number, b: number): [number, number, number] {
  let best = Infinity;
  let out = palette[0];
  for (const p of palette) {
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
    if (d < best) { best = d; out = p; }
  }
  return out;
}

self.onmessage = (e: MessageEvent<DitherRequest>) => {
  const { id, width, height, data, algorithm, palette, invert, contrast, brightness, gamma } = e.data;
  const n = width * height;
  // Working channels as floats 0-255 with preprocessing baked in.
  const cr = new Float32Array(n);
  const cg = new Float32Array(n);
  const cb = new Float32Array(n);
  const invGamma = 1 / Math.max(gamma, 0.01);
  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < 3; ch++) {
      let v = data[i * 4 + ch] / 255;
      v += brightness;
      v = (v - 0.5) * contrast + 0.5;
      v = Math.pow(Math.max(v, 0), invGamma);
      v = Math.min(1, Math.max(0, v));
      if (invert) v = 1 - v;
      if (ch === 0) cr[i] = v * 255;
      else if (ch === 1) cg[i] = v * 255;
      else cb[i] = v * 255;
    }
  }

  const kernel = algorithm === "atkinson" ? ATKINSON_KERNEL : FS_KERNEL;
  const out = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const r = Math.min(255, Math.max(0, cr[i]));
      const g = Math.min(255, Math.max(0, cg[i]));
      const b = Math.min(255, Math.max(0, cb[i]));
      const [qr, qg, qb] = nearest(palette, r, g, b);
      out[i * 4] = qr;
      out[i * 4 + 1] = qg;
      out[i * 4 + 2] = qb;
      out[i * 4 + 3] = 255;
      const er = r - qr, eg = g - qg, eb = b - qb;
      for (const [dx, dy, w] of kernel) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        cr[j] += er * w;
        cg[j] += eg * w;
        cb[j] += eb * w;
      }
    }
  }
  (self as unknown as Worker).postMessage({ id, width, height, data: out }, [out.buffer]);
};

export {};