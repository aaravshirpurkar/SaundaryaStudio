export type ActiveEffect = "dither" | "ascii" | "halftone" | "mesh";

export type ComparisonMode =
  | "off"
  | "split-slider"
  | "xray-loupe"
  | "side-by-side"
  | "hold-bypass";

export type ViewportMode = "canvas" | "saas-hero" | "bento-grid";

export type AssetCategory = "sculptures" | "retro-tech" | "primitives" | "video-loops";

export type ProceduralId =
  | "torus-knot"
  | "wireframe-globe"
  | "topo-waves"
  | "mandala"
  | "fluid-loop"
  | "walk-cycle"
  | "chrome-artifact"
  | "crt-static"
  | "sculpture-fallback"
  | "brutalist-fallback"
  | "retro-fallback"
  | "abstract-fallback";

export interface MediaSource {
  kind: "image" | "video" | "procedural" | "webcam";
  url?: string;
  generatorId?: ProceduralId;
  name: string;
  assetId?: string;
}

export interface DitherParams {
  algorithm: "bayer2" | "bayer4" | "bayer8" | "floyd-steinberg" | "atkinson";
  pixelSize: number;
  spread: number;
  invert: boolean;
}

export interface AsciiParams {
  cellSize: number;
  charset: "classic" | "dense" | "blocks" | "binary";
  colorMode: boolean;
  tint: string;
  invert: boolean;
}

export interface HalftoneParams {
  dotSize: number;
  angle: number;
  mode: "cmyk" | "duotone" | "mono";
  shape: "dot" | "line" | "ellipse";
  registrationX: number;
  registrationY: number;
  grain: number;
  paper: string;
  inkC: string;
  inkM: string;
  inkY: string;
  inkK: string;
  duotoneA: string;
  duotoneB: string;
}

export interface MeshParams {
  colorA: string;
  colorB: string;
  colorC: string;
  colorD: string;
  linkColors: boolean;
  scale: number;
  warp: number;
  speed: number;
  grain: number;
  sourceInfluence: number;
}

export interface PreprocessParams {
  contrast: number;
  brightness: number;
  gamma: number;
}

export type ExportFormat = "react-tsx" | "glsl" | "ascii-html" | "png" | "svg" | "webm";

export interface RecipePreset {
  effect: ActiveEffect;
  paletteId?: string;
  dither?: Partial<DitherParams>;
  ascii?: Partial<AsciiParams>;
  halftone?: Partial<HalftoneParams>;
  mesh?: Partial<MeshParams>;
  preprocess?: Partial<PreprocessParams>;
}

export interface LibraryAsset {
  id: string;
  title: string;
  category: AssetCategory;
  rawUrl: string;
  mediaType: "image" | "video" | "procedural";
  generatorId?: ProceduralId;
  recommendedPreset: RecipePreset;
  description: string;
  tags: string[];
}

export interface PalettePreset {
  id: string;
  name: string;
  colors: string[];
}

export interface PlaybackState {
  playing: boolean;
  currentTime: number;
  duration: number;
}

export const EFFECT_LABELS: Record<ActiveEffect, string> = {
  dither: "DITHER",
  ascii: "ASCII",
  halftone: "HALFTONE / RISO",
  mesh: "NOISY MESH",
};

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  sculptures: "Sculptures & Brutalist",
  "retro-tech": "Retro Tech & Hardware",
  primitives: "3D Primitives & Wireframes",
  "video-loops": "Seamless Video Loops",
};