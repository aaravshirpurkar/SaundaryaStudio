"use client";

import { useEffect, useRef, useState } from "react";
import { Library, Upload, UploadCloud, Camera, Search, Sparkles, Film, Box, ImageIcon } from "lucide-react";
import { ASSET_LIBRARY } from "@/data/assetLibrary";
import { getPaletteColors, resolveMeshColors } from "@/data/palettes";
import { useStudioStore, DEFAULT_MESH } from "@/store/useStudioStore";
import { EFFECT_LABELS, type AssetCategory, type LibraryAsset } from "@/types/studio";
import { getGenerator } from "@/engine/procedural";
import { renderPreview } from "@/engine/preview";
import { extractPalette } from "@/engine/extractPalette";
import { Toggle } from "@/components/ui/controls";

const FILTERS: { id: AssetCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sculptures", label: "Sculptures" },
  { id: "retro-tech", label: "Retro Tech" },
  { id: "primitives", label: "3D Loops" },
  { id: "video-loops", label: "Video" },
];

function AssetCard({ asset }: { asset: LibraryAsset }) {
  const rawRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const previewReady = useRef(false);
  const [hover, setHover] = useState(false);
  const selected = useStudioStore((s) => s.selectedAssetId === asset.id);
  const selectAsset = useStudioStore((s) => s.selectAsset);
  const loadWithRecipe = useStudioStore((s) => s.loadWithRecipe);

  useEffect(() => {
    const canvas = rawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width, h = canvas.height;
    let cancelled = false;

    const drawGenerator = (id: NonNullable<LibraryAsset["generatorId"]>) => {
      getGenerator(id)(ctx, w, h, 1.3);
    };

    if (asset.mediaType === "procedural" || !asset.rawUrl) {
      drawGenerator(asset.generatorId ?? "abstract-fallback");
      return;
    }
    if (asset.mediaType === "video") {
      // Remote video thumbnails use the procedural stand-in.
      drawGenerator(asset.generatorId ?? "crt-static");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      ctx.drawImage(img, (w - img.naturalWidth * scale) / 2, (h - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
    };
    img.onerror = () => {
      if (!cancelled) drawGenerator(asset.generatorId ?? "abstract-fallback");
    };
    img.src = asset.rawUrl;
    return () => {
      cancelled = true;
    };
  }, [asset]);

  const onEnter = () => {
    setHover(true);
    if (!previewReady.current && rawRef.current && previewRef.current) {
      const recipe = asset.recommendedPreset;
      const raw = rawRef.current;
      // Remote thumbnails may still be loading — don't cache a blank preview.
      const probe = raw.getContext("2d")!.getImageData(0, 0, raw.width, raw.height).data;
      let hasContent = false;
      for (let i = 3; i < probe.length; i += 64) {
        if (probe[i] > 0) { hasContent = true; break; }
      }
      if (!hasContent) return;
      let palette: string[];
      let sourceColor = false;
      if (recipe.effect === "halftone") {
        const hp = recipe.halftone ?? {};
        palette = [hp.paper ?? "#F5EFE4", hp.mode === "duotone" ? hp.duotoneA ?? "#F43F5E" : hp.inkK ?? "#1A1A1E"];
      } else if (recipe.effect === "mesh") {
        const mp = { ...DEFAULT_MESH, ...recipe.mesh };
        let extracted: string[] = [];
        if (mp.linkColors) {
          try {
            extracted = extractPalette(raw, raw.width, raw.height, 8);
          } catch {
            extracted = [];
          }
        }
        palette = [...resolveMeshColors(mp, extracted)];
      } else {
        const pid = recipe.paletteId ?? "image";
        let extracted: string[] = [];
        if (pid === "image") {
          try {
            extracted = extractPalette(raw, raw.width, raw.height, 8);
          } catch {
            extracted = [];
          }
        }
        palette = getPaletteColors(pid, ["#09090B", "#FAFAFA"], extracted);
        sourceColor = recipe.effect === "ascii" && recipe.ascii?.colorMode !== false;
      }
      renderPreview(previewRef.current, raw, recipe.effect, palette, sourceColor);
      previewReady.current = true;
    }
  };

  return (
    <button
      type="button"
      onClick={() => selectAsset(asset, loadWithRecipe)}
      onPointerEnter={onEnter}
      onPointerLeave={() => setHover(false)}
      className={`group w-full overflow-hidden rounded-lg border text-left transition-all duration-150 ${
        selected ? "border-coral/60 bg-coral/5 shadow-glow-coral" : "border-line bg-paper hover:border-faint"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <canvas ref={rawRef} width={160} height={100} className="absolute inset-0 h-full w-full" />
        <canvas
          ref={previewRef}
          width={160}
          height={100}
          className="absolute inset-0 h-full w-full transition-[clip-path] duration-300 ease-out"
          style={{ clipPath: hover ? "inset(0 0 0 50%)" : "inset(0 0 0 100%)" }}
        />
        <div
          className="absolute inset-y-0 w-px bg-white/90 transition-all duration-300"
          style={{ left: "50%", opacity: hover ? 1 : 0 }}
        />
        <span
          className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px font-mono text-[8px] text-white/90 backdrop-blur-sm transition-opacity duration-200"
          style={{ opacity: hover ? 1 : 0 }}
        >
          RAW
        </span>
        <span
          className="absolute right-1 top-1 rounded bg-coral/80 px-1 py-px font-mono text-[8px] text-oncoral transition-opacity duration-200"
          style={{ opacity: hover ? 1 : 0 }}
        >
          {EFFECT_LABELS[asset.recommendedPreset.effect]}
        </span>
        {asset.mediaType !== "image" && (
          <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/60 px-1 py-px font-mono text-[8px] text-peach backdrop-blur-sm">
            {asset.mediaType === "video" ? <Film size={8} /> : <Box size={8} />}
            LOOP
          </span>
        )}
      </div>
      <div className="px-2 py-1.5">
        <div className="truncate text-[11px] font-medium text-ink">{asset.title}</div>
        <div className="mt-0.5 truncate font-mono text-[9px] text-faint">{asset.tags.slice(0, 3).join(" · ")}</div>
      </div>
    </button>
  );
}

function UploadTab() {
  const setMedia = useStudioStore((s) => s.setMedia);
  const media = useStudioStore((s) => s.media);
  const setNotice = useStudioStore((s) => s.setNotice);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setNotice("Only image or video files are supported");
      return;
    }
    const url = URL.createObjectURL(file);
    setMedia({ kind: isImage ? "image" : "video", url, name: file.name });
    setNotice(`Loaded ${file.name}`);
  };

  return (
    <div className="space-y-3 p-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image or video"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-all ${
          dragging ? "border-coral bg-coral/10" : "border-line bg-paper hover:border-faint"
        }`}
      >
        <UploadCloud size={22} className={dragging ? "text-coral-ink" : "text-faint"} />
        <p className="text-xs text-muted">Drop an image or video here</p>
        <p className="font-mono text-[10px] text-faint">or click to browse · PNG JPG MP4 WEBM</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setMedia({ kind: "webcam", name: "Live Webcam" })}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper px-3 py-2.5 text-xs text-muted transition-colors hover:border-coral/50 hover:text-coral-ink"
      >
        <Camera size={14} />
        Capture live webcam
      </button>

      {media && (
        <div className="rounded-lg border border-line bg-paper p-3">
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">Active source</div>
          <div className="flex items-center gap-2">
            {media.kind === "video" || media.kind === "webcam" ? (
              <Film size={13} className="shrink-0 text-peach-ink" />
            ) : (
              <ImageIcon size={13} className="shrink-0 text-coral-ink" />
            )}
            <span className="truncate text-xs text-ink">{media.name}</span>
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase text-faint">{media.kind}</div>
        </div>
      )}

      <p className="px-1 font-mono text-[9px] leading-relaxed text-faint">
        All processing happens client-side. Files never leave your browser.
      </p>
    </div>
  );
}

export function LeftSidebar() {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [filter, setFilter] = useState<AssetCategory | "all">("all");
  const [query, setQuery] = useState("");
  const loadWithRecipe = useStudioStore((s) => s.loadWithRecipe);
  const setLoadWithRecipe = useStudioStore((s) => s.setLoadWithRecipe);

  const assets = ASSET_LIBRARY.filter((a) => {
    if (filter !== "all" && a.category !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q));
    }
    return true;
  });

  return (
    <aside className="flex h-full w-[288px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex border-b border-line">
        {(
          [
            { id: "library", label: "Asset Library", icon: Library },
            { id: "upload", label: "Upload", icon: Upload },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs transition-colors ${
              tab === id ? "border-coral text-ink" : "border-transparent text-faint hover:text-muted"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <UploadTab />
      ) : (
        <>
          <div className="space-y-2.5 border-b border-line p-3">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets…"
                className="w-full rounded-md border border-line bg-paper py-1.5 pl-7 pr-2 text-xs text-ink placeholder:text-faint outline-none focus:border-coral"
                aria-label="Search assets"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                    filter === f.id
                      ? "border-coral/50 bg-coral/15 text-coral-ink"
                      : "border-line text-faint hover:border-faint hover:text-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="rounded-md border border-line bg-paper px-2.5 py-2">
              <Toggle
                label="Load with recommended recipe"
                checked={loadWithRecipe}
                onChange={setLoadWithRecipe}
              />
              <p className="mt-1.5 flex items-start gap-1 font-mono text-[9px] leading-snug text-faint">
                <Sparkles size={9} className="mt-px shrink-0 text-coral-ink" />
                Applies curated params + 50% split curtain
              </p>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3">
            {assets.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
            {assets.length === 0 && (
              <p className="col-span-2 py-8 text-center font-mono text-[10px] text-faint">No assets match “{query}”</p>
            )}
          </div>
          <div className="border-t border-line px-3 py-2 font-mono text-[9px] text-faint">
            {assets.length} / {ASSET_LIBRARY.length} assets · hover for before/after
          </div>
        </>
      )}
    </aside>
  );
}