"use client";

import { create } from "zustand";
import type {
  ActiveEffect,
  AsciiParams,
  ComparisonMode,
  DitherParams,
  HalftoneParams,
  LibraryAsset,
  MediaSource,
  MeshParams,
  PlaybackState,
  PreprocessParams,
  RecipePreset,
  ViewportMode,
} from "@/types/studio";
import { getAsset } from "@/data/assetLibrary";
import { getPaletteColors, PALETTE_PRESETS } from "@/data/palettes";

export const DEFAULT_DITHER: DitherParams = {
  algorithm: "bayer8",
  pixelSize: 3,
  spread: 1.0,
  invert: false,
};

export const DEFAULT_ASCII: AsciiParams = {
  cellSize: 9,
  charset: "classic",
  colorMode: true,
  tint: "#34FF7A",
  invert: false,
};

export const DEFAULT_HALFTONE: HalftoneParams = {
  dotSize: 7,
  angle: 0,
  mode: "cmyk",
  shape: "dot",
  registrationX: 0,
  registrationY: 0,
  grain: 0.08,
  paper: "#F5EFE4",
  inkC: "#00A3E0",
  inkM: "#F43F5E",
  inkY: "#FFD23F",
  inkK: "#1A1A1E",
  duotoneA: "#F43F5E",
  duotoneB: "#4F46E5",
};

export const DEFAULT_MESH: MeshParams = {
  colorA: "#173042",
  colorB: "#2E7CB8",
  colorC: "#FED18C",
  colorD: "#FE654F",
  linkColors: true,
  scale: 2.2,
  warp: 1.5,
  speed: 0.4,
  grain: 12,
  sourceInfluence: 0.65,
};

export const DEFAULT_PREPROCESS: PreprocessParams = {
  contrast: 1.0,
  brightness: 0.0,
  gamma: 1.0,
};

interface SerializableState {
  v: 1;
  assetId: string | null;
  effect: ActiveEffect;
  paletteId: string;
  customColors: string[];
  dither: DitherParams;
  ascii: AsciiParams;
  halftone: HalftoneParams;
  mesh: MeshParams;
  preprocess: PreprocessParams;
  comparisonMode: ComparisonMode;
  splitPosition: number;
  viewportMode: ViewportMode;
}

export interface StudioState {
  media: MediaSource | null;
  selectedAssetId: string | null;
  loadWithRecipe: boolean;
  effect: ActiveEffect;
  comparisonMode: ComparisonMode;
  splitPosition: number;
  isHoldingBypass: boolean;
  viewportMode: ViewportMode;
  dither: DitherParams;
  ascii: AsciiParams;
  halftone: HalftoneParams;
  mesh: MeshParams;
  preprocess: PreprocessParams;
  paletteId: string;
  customColors: string[];
  imagePalette: string[];
  playback: PlaybackState;
  fps: number;
  exportModalOpen: boolean;
  paramsRevision: number;
  notice: string | null;

  setNotice: (notice: string | null) => void;
  setMedia: (media: MediaSource | null) => void;
  selectAsset: (asset: LibraryAsset, withRecipe?: boolean) => void;
  setLoadWithRecipe: (v: boolean) => void;
  setEffect: (e: ActiveEffect) => void;
  setComparisonMode: (m: ComparisonMode) => void;
  setSplitPosition: (v: number) => void;
  setHoldingBypass: (v: boolean) => void;
  setViewportMode: (m: ViewportMode) => void;
  setDither: (p: Partial<DitherParams>) => void;
  setAscii: (p: Partial<AsciiParams>) => void;
  setHalftone: (p: Partial<HalftoneParams>) => void;
  setMesh: (p: Partial<MeshParams>) => void;
  setPreprocess: (p: Partial<PreprocessParams>) => void;
  setPaletteId: (id: string) => void;
  setCustomColors: (colors: string[]) => void;
  setImagePalette: (colors: string[]) => void;
  setPlayback: (p: Partial<PlaybackState>) => void;
  setFps: (fps: number) => void;
  setExportModalOpen: (open: boolean) => void;
  applyRecipe: (recipe: RecipePreset) => void;
  resetParams: () => void;
  randomizeParams: () => void;
  serialize: () => string;
  hydrate: (encoded: string) => string | null;
}

function bump(state: StudioState): number {
  return state.paramsRevision + 1;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  media: null,
  selectedAssetId: null,
  loadWithRecipe: true,
  effect: "dither",
  comparisonMode: "off",
  splitPosition: 0.5,
  isHoldingBypass: false,
  viewportMode: "canvas",
  dither: { ...DEFAULT_DITHER },
  ascii: { ...DEFAULT_ASCII },
  halftone: { ...DEFAULT_HALFTONE },
  mesh: { ...DEFAULT_MESH },
  preprocess: { ...DEFAULT_PREPROCESS },
  paletteId: "image",
  customColors: ["#173042", "#FE654F", "#FED18C", "#FEFEFF"],
  imagePalette: ["#0A0A0A", "#F5F5F0"],
  playback: { playing: true, currentTime: 0, duration: 0 },
  fps: 0,
  exportModalOpen: false,
  paramsRevision: 0,
  notice: null,

  setNotice: (notice) => set({ notice }),
  setMedia: (media) => set({ media }),
  selectAsset: (asset, withRecipe = true) => {
    const media: MediaSource =
      asset.mediaType === "procedural"
        ? { kind: "procedural", generatorId: asset.generatorId, name: asset.title, assetId: asset.id }
        : {
            kind: asset.mediaType,
            url: asset.rawUrl,
            generatorId: asset.generatorId,
            name: asset.title,
            assetId: asset.id,
          };
    set({ media, selectedAssetId: asset.id });
    if (withRecipe) {
      get().applyRecipe(asset.recommendedPreset);
      set({ comparisonMode: "split-slider", splitPosition: 0.5 });
    }
  },
  setLoadWithRecipe: (v) => set({ loadWithRecipe: v }),
  setEffect: (effect) => set((s) => ({ effect, paramsRevision: bump(s) })),
  setComparisonMode: (comparisonMode) => set({ comparisonMode }),
  setSplitPosition: (v) => set({ splitPosition: Math.min(1, Math.max(0, v)) }),
  setHoldingBypass: (isHoldingBypass) => set({ isHoldingBypass }),
  setViewportMode: (viewportMode) => set({ viewportMode }),
  setDither: (p) => set((s) => ({ dither: { ...s.dither, ...p }, paramsRevision: bump(s) })),
  setAscii: (p) => set((s) => ({ ascii: { ...s.ascii, ...p }, paramsRevision: bump(s) })),
  setHalftone: (p) => set((s) => ({ halftone: { ...s.halftone, ...p }, paramsRevision: bump(s) })),
  setMesh: (p) => set((s) => ({ mesh: { ...s.mesh, ...p }, paramsRevision: bump(s) })),
  setPreprocess: (p) => set((s) => ({ preprocess: { ...s.preprocess, ...p }, paramsRevision: bump(s) })),
  setPaletteId: (paletteId) =>
    set((s) => {
      // Dither reads paletteId directly in the renderer. The other engines
      // own their colour controls, so cascade the picked palette into the
      // active effect's params to make the picker work everywhere.
      const colors = getPaletteColors(paletteId, s.customColors, s.imagePalette);
      const accent = colors[colors.length - 1] ?? "#FFFFFF";
      const spread = (k: number): string[] => {
        if (k <= 1 || colors.length === 0) return [accent];
        return Array.from({ length: k }, (_, i) => colors[Math.round((i * (colors.length - 1)) / (k - 1))]);
      };
      const patch: Partial<StudioState> = { paletteId, paramsRevision: bump(s) };
      if (s.effect === "ascii") {
        patch.ascii =
          paletteId === "image"
            ? { ...s.ascii, colorMode: true }
            : { ...s.ascii, colorMode: false, tint: accent };
      } else if (s.effect === "halftone") {
        if (s.halftone.mode === "mono") {
          patch.halftone = { ...s.halftone, inkK: accent };
        } else if (s.halftone.mode === "duotone") {
          const [a, b] = spread(2);
          patch.halftone = { ...s.halftone, duotoneA: a, duotoneB: b };
        } else {
          const [c, m, y, k] = spread(4);
          patch.halftone = { ...s.halftone, inkC: c, inkM: m, inkY: y, inkK: k };
        }
      } else if (s.effect === "mesh") {
        if (paletteId === "image") {
          patch.mesh = { ...s.mesh, linkColors: true };
        } else {
          const [a, b, c, d] = spread(4);
          patch.mesh = { ...s.mesh, linkColors: false, colorA: a, colorB: b, colorC: c, colorD: d };
        }
      }
      return patch;
    }),
  setCustomColors: (customColors) => set((s) => ({ customColors, paletteId: "custom", paramsRevision: bump(s) })),
  setImagePalette: (colors) =>
    set((s) => {
      const imagePalette = colors.slice(0, 8);
      if (imagePalette.length < 2 || imagePalette.join() === s.imagePalette.join()) return {};
      return { imagePalette, paramsRevision: bump(s) };
    }),
  setPlayback: (p) => set((s) => ({ playback: { ...s.playback, ...p } })),
  setFps: (fps) => set({ fps }),
  setExportModalOpen: (exportModalOpen) => set({ exportModalOpen }),

  applyRecipe: (recipe) =>
    set((s) => ({
      effect: recipe.effect,
      paletteId: recipe.paletteId ?? s.paletteId,
      dither: { ...DEFAULT_DITHER, ...recipe.dither },
      ascii: { ...DEFAULT_ASCII, ...recipe.ascii },
      halftone: { ...DEFAULT_HALFTONE, ...recipe.halftone },
      mesh: { ...DEFAULT_MESH, ...recipe.mesh },
      preprocess: { ...DEFAULT_PREPROCESS, ...recipe.preprocess },
      paramsRevision: bump(s),
    })),

  resetParams: () =>
    set((s) => ({
      dither: { ...DEFAULT_DITHER },
      ascii: { ...DEFAULT_ASCII },
      halftone: { ...DEFAULT_HALFTONE },
      mesh: { ...DEFAULT_MESH },
      preprocess: { ...DEFAULT_PREPROCESS },
      paletteId: "image",
      paramsRevision: bump(s),
    })),

  randomizeParams: () => {
    const s = get();
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const effects: ActiveEffect[] = ["dither", "ascii", "halftone", "mesh"];
    const effect = pick(effects);
    const paletteId = pick(PALETTE_PRESETS.filter((p) => p.id !== "custom")).id;
    set({
      effect,
      paletteId,
      dither: {
        algorithm: pick(["bayer2", "bayer4", "bayer8", "floyd-steinberg", "atkinson"] as const),
        pixelSize: Math.round(rand(2, 8)),
        spread: rand(0.6, 1.6),
        invert: Math.random() < 0.25,
      },
      ascii: {
        cellSize: Math.round(rand(6, 16)),
        charset: pick(["classic", "dense", "blocks", "binary"] as const),
        colorMode: Math.random() < 0.6,
        tint: pick(["#34FF7A", "#FAFAFA", "#FFB000", "#00F0FF", "#F43F5E"]),
        invert: Math.random() < 0.25,
      },
      halftone: {
        ...s.halftone,
        dotSize: Math.round(rand(4, 12)),
        angle: Math.round(rand(0, 90)),
        mode: pick(["cmyk", "duotone", "mono"] as const),
        shape: pick(["dot", "line", "ellipse"] as const),
        registrationX: Math.round(rand(-4, 4)),
        registrationY: Math.round(rand(-4, 4)),
        grain: rand(0, 0.3),
      },
      mesh: {
        ...s.mesh,
        linkColors: true,
        scale: rand(1.2, 4),
        warp: rand(0.6, 2.6),
        speed: rand(0.1, 1),
        grain: rand(4, 24),
        sourceInfluence: rand(0.4, 0.85),
      },
      preprocess: { contrast: rand(0.9, 1.5), brightness: rand(-0.08, 0.08), gamma: rand(0.8, 1.3) },
      paramsRevision: bump(s),
    });
  },

  serialize: () => {
    const s = get();
    const payload: SerializableState = {
      v: 1,
      assetId: s.selectedAssetId,
      effect: s.effect,
      paletteId: s.paletteId,
      customColors: s.customColors,
      dither: s.dither,
      ascii: s.ascii,
      halftone: s.halftone,
      mesh: s.mesh,
      preprocess: s.preprocess,
      comparisonMode: s.comparisonMode,
      splitPosition: s.splitPosition,
      viewportMode: s.viewportMode,
    };
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },

  hydrate: (encoded) => {
    try {
      const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(escape(atob(b64)));
      const p = JSON.parse(json) as Partial<SerializableState>;
      if (p.v !== 1) return null;
      set((s) => ({
        effect: p.effect ?? s.effect,
        paletteId: p.paletteId ?? s.paletteId,
        customColors: Array.isArray(p.customColors) ? p.customColors : s.customColors,
        dither: { ...DEFAULT_DITHER, ...p.dither },
        ascii: { ...DEFAULT_ASCII, ...p.ascii },
        halftone: { ...DEFAULT_HALFTONE, ...p.halftone },
        mesh: { ...DEFAULT_MESH, ...p.mesh },
        preprocess: { ...DEFAULT_PREPROCESS, ...p.preprocess },
        comparisonMode: p.comparisonMode ?? s.comparisonMode,
        splitPosition: typeof p.splitPosition === "number" ? p.splitPosition : s.splitPosition,
        viewportMode: p.viewportMode ?? s.viewportMode,
        paramsRevision: bump(s),
      }));
      return p.assetId && getAsset(p.assetId) ? p.assetId : null;
    } catch {
      return null;
    }
  },
}));