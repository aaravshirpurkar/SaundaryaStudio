import type { AsciiParams } from "@/types/studio";

export const CHARSETS: Record<AsciiParams["charset"], string> = {
  classic: " .:-=+*#%@",
  dense: " .':;^~+*iIlLoO0#%@$",
  blocks: " .:;+░▒▓█",
  binary: " 01",
};

const GLYPH = 64;

export interface Atlas {
  canvas: HTMLCanvasElement;
  count: number;
  charset: string;
}

const cache = new Map<string, Atlas>();

export function getAsciiAtlas(charset: AsciiParams["charset"]): Atlas {
  const hit = cache.get(charset);
  if (hit) return hit;
  const chars = CHARSETS[charset];
  const canvas = document.createElement("canvas");
  canvas.width = GLYPH * chars.length;
  canvas.height = GLYPH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.floor(GLYPH * 0.8)}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], i * GLYPH + GLYPH / 2, GLYPH / 2 + 2);
  }
  const atlas = { canvas, count: chars.length, charset: chars };
  cache.set(charset, atlas);
  return atlas;
}