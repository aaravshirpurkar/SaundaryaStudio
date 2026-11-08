import type { MeshParams, PalettePreset } from "@/types/studio";

export const PALETTE_PRESETS: PalettePreset[] = [
  { id: "image", name: "Source Palette", colors: [] },
  { id: "sunrise", name: "Coral Sunrise", colors: ["#FEFEFF", "#D6EFFF", "#FED18C", "#FED99B", "#FE654F"] },
  { id: "1bit-mac", name: "1-Bit Mac", colors: ["#0A0A0A", "#F5F5F0"] },
  { id: "phosphor", name: "Terminal Phosphor", colors: ["#031207", "#34FF7A"] },
  { id: "riso", name: "Risograph Pink/Indigo", colors: ["#F5EFE4", "#F43F5E", "#4F46E5"] },
  { id: "cyberpunk", name: "Cyberpunk", colors: ["#0B0B14", "#00F0FF", "#FF2E88", "#FFE600"] },
  { id: "amber", name: "Amber CRT", colors: ["#140B00", "#FFB000"] },
  { id: "gameboy", name: "Game Boy", colors: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"] },
  { id: "custom", name: "Custom Hex", colors: ["#173042", "#FE654F", "#FED18C", "#FEFEFF"] },
];

export function getPaletteColors(id: string, custom: string[], imageColors: string[] = []): string[] {
  if (id === "image") return imageColors.length >= 2 ? imageColors.slice(0, 8) : ["#0A0A0A", "#F5F5F0"];
  if (id === "custom") return custom.length >= 2 ? custom : ["#09090B", "#FAFAFA"];
  const p = PALETTE_PRESETS.find((p) => p.id === id);
  return p && p.colors.length >= 2 ? p.colors : ["#0A0A0A", "#F5F5F0"];
}

export function resolveMeshColors(mp: MeshParams, imagePalette: string[]): [string, string, string, string] {
  if (mp.linkColors && imagePalette.length >= 2) {
    const n = imagePalette.length;
    const at = (f: number) => imagePalette[Math.min(n - 1, Math.floor((n - 1) * f))];
    return [at(0), at(0.33), at(0.66), at(1)];
  }
  return [mp.colorA, mp.colorB, mp.colorC, mp.colorD];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function hexToRgb255(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}