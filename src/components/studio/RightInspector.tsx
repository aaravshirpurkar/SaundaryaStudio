"use client";

import { LayoutGrid, Type, CircleDot, Blend, RotateCcw, Dices, RefreshCw } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";
import { PALETTE_PRESETS, resolveMeshColors } from "@/data/palettes";
import { EFFECT_LABELS, type ActiveEffect } from "@/types/studio";
import { Section, Slider, Toggle, Select, ColorField } from "@/components/ui/controls";
import { getRendererHandle } from "@/engine/StudioRenderer";

const EFFECTS: { id: ActiveEffect; icon: typeof LayoutGrid }[] = [
  { id: "dither", icon: LayoutGrid },
  { id: "ascii", icon: Type },
  { id: "halftone", icon: CircleDot },
  { id: "mesh", icon: Blend },
];

function DitherControls() {
  const d = useStudioStore((s) => s.dither);
  const set = useStudioStore((s) => s.setDither);
  return (
    <Section title="Dither Engine" accent>
      <Select
        label="Algorithm"
        value={d.algorithm}
        onChange={(algorithm) => set({ algorithm })}
        options={[
          { value: "bayer2", label: "Bayer 2×2 · ordered" },
          { value: "bayer4", label: "Bayer 4×4 · ordered" },
          { value: "bayer8", label: "Bayer 8×8 · ordered" },
          { value: "floyd-steinberg", label: "Floyd–Steinberg · worker" },
          { value: "atkinson", label: "Atkinson · worker" },
        ]}
      />
      <Slider label="Pixel size" value={d.pixelSize} min={1} max={12} onChange={(pixelSize) => set({ pixelSize })} unit="px" />
      <Slider label="Threshold spread" value={d.spread} min={0} max={2} step={0.05} onChange={(spread) => set({ spread })} />
      <Toggle label="Invert luminance" checked={d.invert} onChange={(invert) => set({ invert })} />
    </Section>
  );
}

function AsciiControls() {
  const a = useStudioStore((s) => s.ascii);
  const set = useStudioStore((s) => s.setAscii);
  return (
    <Section title="ASCII Engine" accent>
      <Slider label="Cell size" value={a.cellSize} min={4} max={24} onChange={(cellSize) => set({ cellSize })} unit="px" />
      <Select
        label="Character set"
        value={a.charset}
        onChange={(charset) => set({ charset })}
        options={[
          { value: "classic", label: "Classic  .:-=+*#%@" },
          { value: "dense", label: "Dense  18 glyphs" },
          { value: "blocks", label: "Blocks  ░▒▓█" },
          { value: "binary", label: "Binary  0 1" },
        ]}
      />
      <Toggle label="Sample source color" checked={a.colorMode} onChange={(colorMode) => set({ colorMode })} />
      {!a.colorMode && <ColorField label="Phosphor tint" value={a.tint} onChange={(tint) => set({ tint })} />}
      <Toggle label="Invert luminance" checked={a.invert} onChange={(invert) => set({ invert })} />
    </Section>
  );
}

function HalftoneControls() {
  const h = useStudioStore((s) => s.halftone);
  const set = useStudioStore((s) => s.setHalftone);
  return (
    <Section title="Halftone / Riso Engine" accent>
      <Select
        label="Ink mode"
        value={h.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "cmyk", label: "CMYK · 4 separations" },
          { value: "duotone", label: "Duotone · 2 inks" },
          { value: "mono", label: "Monochrome · 1 ink" },
        ]}
      />
      <Select
        label="Dot shape"
        value={h.shape}
        onChange={(shape) => set({ shape })}
        options={[
          { value: "dot", label: "Round dot" },
          { value: "line", label: "Line screen" },
          { value: "ellipse", label: "Ellipse" },
        ]}
      />
      <Slider label="Dot pitch" value={h.dotSize} min={3} max={20} onChange={(dotSize) => set({ dotSize })} unit="px" />
      <Slider label="Screen angle" value={h.angle} min={0} max={90} onChange={(angle) => set({ angle })} unit="°" />
      <Slider label="Registration X" value={h.registrationX} min={-8} max={8} step={0.5} onChange={(registrationX) => set({ registrationX })} unit="px" />
      <Slider label="Registration Y" value={h.registrationY} min={-8} max={8} step={0.5} onChange={(registrationY) => set({ registrationY })} unit="px" />
      <Slider label="Ink grain" value={h.grain} min={0} max={0.5} step={0.01} onChange={(grain) => set({ grain })} />
      <ColorField label="Paper" value={h.paper} onChange={(paper) => set({ paper })} />
      {h.mode === "cmyk" && (
        <>
          <ColorField label="Cyan ink" value={h.inkC} onChange={(inkC) => set({ inkC })} />
          <ColorField label="Magenta ink" value={h.inkM} onChange={(inkM) => set({ inkM })} />
          <ColorField label="Yellow ink" value={h.inkY} onChange={(inkY) => set({ inkY })} />
          <ColorField label="Key (black) ink" value={h.inkK} onChange={(inkK) => set({ inkK })} />
        </>
      )}
      {h.mode === "duotone" && (
        <>
          <ColorField label="Ink A · midtones" value={h.duotoneA} onChange={(duotoneA) => set({ duotoneA })} />
          <ColorField label="Ink B · shadows" value={h.duotoneB} onChange={(duotoneB) => set({ duotoneB })} />
        </>
      )}
      {h.mode === "mono" && <ColorField label="Ink" value={h.inkK} onChange={(inkK) => set({ inkK })} />}
    </Section>
  );
}

function MeshControls() {
  const m = useStudioStore((s) => s.mesh);
  const set = useStudioStore((s) => s.setMesh);
  const imagePalette = useStudioStore((s) => s.imagePalette);
  const linked = resolveMeshColors(m, imagePalette);
  return (
    <Section title="Noisy Mesh Engine" accent>
      <Toggle label="Link colors to source" checked={m.linkColors} onChange={(linkColors) => set({ linkColors })} />
      {m.linkColors ? (
        <div className="rounded-md border border-line bg-paper p-2">
          <div className="mb-1.5 font-mono text-[9px] text-faint">sampled from source · dark → light</div>
          <div className="flex gap-1.5">
            {linked.map((c, i) => (
              <div key={i} className="min-w-0 flex-1">
                <div className="h-6 rounded border border-white/15" style={{ backgroundColor: c }} />
                <div className="mt-1 truncate text-center font-mono text-[8px] uppercase text-faint">{c}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <ColorField label="Color A · base" value={m.colorA} onChange={(colorA) => set({ colorA })} />
          <ColorField label="Color B · body" value={m.colorB} onChange={(colorB) => set({ colorB })} />
          <ColorField label="Color C · highlight" value={m.colorC} onChange={(colorC) => set({ colorC })} />
          <ColorField label="Color D · accent" value={m.colorD} onChange={(colorD) => set({ colorD })} />
        </>
      )}
      <Slider label="Source influence" value={m.sourceInfluence} min={0} max={1} step={0.02} onChange={(sourceInfluence) => set({ sourceInfluence })} />
      <Slider label="Noise scale" value={m.scale} min={0.5} max={6} step={0.1} onChange={(scale) => set({ scale })} />
      <Slider label="Domain warp" value={m.warp} min={0} max={3} step={0.05} onChange={(warp) => set({ warp })} />
      <Slider label="Flow speed" value={m.speed} min={0} max={2} step={0.05} onChange={(speed) => set({ speed })} />
      <Slider label="Anti-band grain" value={m.grain} min={0} max={32} onChange={(grain) => set({ grain })} unit="/255" />
    </Section>
  );
}

function PalettePicker() {
  const paletteId = useStudioStore((s) => s.paletteId);
  const setPaletteId = useStudioStore((s) => s.setPaletteId);
  const customColors = useStudioStore((s) => s.customColors);
  const setCustomColors = useStudioStore((s) => s.setCustomColors);
  const imagePalette = useStudioStore((s) => s.imagePalette);
  return (
    <Section title="Palette">
      <div className="grid grid-cols-1 gap-1">
        {PALETTE_PRESETS.map((p) => {
          const swatches = p.id === "image" ? imagePalette : p.colors;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaletteId(p.id)}
              className={`flex items-center justify-between rounded-md border px-2 py-1.5 transition-colors ${
                paletteId === p.id ? "border-coral/50 bg-coral/10" : "border-line hover:border-faint"
              }`}
            >
              <span className={`text-[11px] ${paletteId === p.id ? "text-coral-ink" : "text-muted"}`}>{p.name}</span>
              <span className="flex gap-1">
                {swatches.slice(0, p.id === "image" ? 8 : 4).map((c, i) => (
                  <span key={i} className="h-3 w-3 rounded-sm border border-white/15" style={{ backgroundColor: c }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {paletteId === "image" && (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper px-2 py-1.5">
          <span className="font-mono text-[9px] text-faint">auto-extracted · {imagePalette.length} colors</span>
          <button
            type="button"
            onClick={() => getRendererHandle()?.resamplePalette()}
            className="flex items-center gap-1 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] text-muted transition-colors hover:border-coral/50 hover:text-coral-ink"
          >
            <RefreshCw size={9} /> Resample
          </button>
        </div>
      )}
      {paletteId === "custom" && (
        <div className="space-y-2 rounded-md border border-line bg-paper p-2">
          {customColors.slice(0, 4).map((c, i) => (
            <ColorField
              key={i}
              label={`Stop ${i + 1}`}
              value={c}
              onChange={(v) => {
                const next = [...customColors];
                next[i] = v;
                setCustomColors(next);
              }}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

export function RightInspector() {
  const effect = useStudioStore((s) => s.effect);
  const setEffect = useStudioStore((s) => s.setEffect);
  const pre = useStudioStore((s) => s.preprocess);
  const setPre = useStudioStore((s) => s.setPreprocess);
  const resetParams = useStudioStore((s) => s.resetParams);
  const randomizeParams = useStudioStore((s) => s.randomizeParams);

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-line bg-panel">
      <div className="border-b border-line p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Effect engine</div>
        <div className="grid grid-cols-4 gap-1">
          {EFFECTS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setEffect(id)}
              title={EFFECT_LABELS[id]}
              className={`flex flex-col items-center gap-1 rounded-md border py-2 transition-all ${
                effect === id
                  ? "border-coral/50 bg-coral/15 text-coral-ink"
                  : "border-line text-faint hover:border-faint hover:text-muted"
              }`}
            >
              <Icon size={15} />
              <span className="font-mono text-[8px] uppercase">{id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {effect === "dither" && <DitherControls />}
        {effect === "ascii" && <AsciiControls />}
        {effect === "halftone" && <HalftoneControls />}
        {effect === "mesh" && <MeshControls />}

        <Section title="Color Pre-processing">
          <Slider label="Contrast" value={pre.contrast} min={0.2} max={2.5} step={0.02} onChange={(contrast) => setPre({ contrast })} />
          <Slider label="Brightness" value={pre.brightness} min={-0.3} max={0.3} step={0.01} onChange={(brightness) => setPre({ brightness })} />
          <Slider label="Gamma" value={pre.gamma} min={0.4} max={2.2} step={0.02} onChange={(gamma) => setPre({ gamma })} />
        </Section>

        <PalettePicker />
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <button
          type="button"
          onClick={resetParams}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-paper py-2 text-xs text-muted transition-colors hover:border-faint hover:text-ink"
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          type="button"
          onClick={randomizeParams}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-peach/40 bg-peach/10 py-2 text-xs text-peach-ink transition-colors hover:bg-peach/20"
        >
          <Dices size={12} /> Randomize
        </button>
      </div>
    </aside>
  );
}