"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Code2, FileCode2, Terminal, ImageDown, FileDown, Film, Loader2 } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";
import { EFFECT_LABELS, type ExportFormat } from "@/types/studio";
import { exportReactComponent, exportGlsl } from "@/exporters/exportReactComponent";
import { exportAsciiHtml } from "@/exporters/exportAsciiHtml";
import { exportSvg } from "@/exporters/exportSvg";
import { exportVideo, downloadBlob } from "@/exporters/exportVideo";
import { getRendererHandle } from "@/engine/StudioRenderer";
import { getAsciiAtlas } from "@/engine/asciiAtlas";
import { CodeViewer } from "./CodeViewer";

const CODE_TABS: { id: ExportFormat; label: string; icon: typeof Code2 }[] = [
  { id: "react-tsx", label: "React · TSX", icon: Code2 },
  { id: "glsl", label: "GLSL Fragment", icon: FileCode2 },
  { id: "ascii-html", label: "ASCII · HTML", icon: Terminal },
];

function snapshotDataUrl(maxW = 900): string | null {
  const renderer = getRendererHandle();
  const src = renderer?.getSourceCanvas();
  if (!src) return null;
  const scale = Math.min(1, maxW / src.width);
  const c = document.createElement("canvas");
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export function ExportModal() {
  const open = useStudioStore((s) => s.exportModalOpen);
  const setOpen = useStudioStore((s) => s.setExportModalOpen);
  const revision = useStudioStore((s) => s.paramsRevision);
  const effect = useStudioStore((s) => s.effect);
  const media = useStudioStore((s) => s.media);
  const charset = useStudioStore((s) => s.ascii.charset);
  const setNotice = useStudioStore((s) => s.setNotice);

  const [tab, setTab] = useState<ExportFormat>("react-tsx");
  const [seconds, setSeconds] = useState(4);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const code = useMemo(() => {
    if (!open) return "";
    const state = useStudioStore.getState();
    if (tab === "glsl") return exportGlsl(state);
    const renderer = getRendererHandle();
    const src = renderer?.getSourceCanvas() ?? null;
    if (tab === "ascii-html") {
      return src
        ? exportAsciiHtml(state, src)
        : "<!-- Load a media source first -->";
    }
    const remoteUrl = state.media?.url && /^https?:/.test(state.media.url) ? state.media.url : null;
    const mediaIsVideo = state.media?.kind === "video" && !!remoteUrl;
    const mediaSrc = remoteUrl ?? snapshotDataUrl() ?? "";
    const atlasDataUrl = state.effect === "ascii" ? getAsciiAtlas(state.ascii.charset).canvas.toDataURL() : null;
    return exportReactComponent({ state, mediaSrc, mediaIsVideo, atlasDataUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, revision, effect, media, charset]);

  if (!open) return null;

  const downloadPng = () => {
    const renderer = getRendererHandle();
    if (!renderer) return;
    renderer.canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `saundarya-${effect}.png`);
        setNotice("PNG exported");
      }
    }, "image/png");
  };

  const downloadSvg = () => {
    const renderer = getRendererHandle();
    const src = renderer?.getSourceCanvas();
    if (!src) {
      setNotice("Load a media source first");
      return;
    }
    const svg = exportSvg(useStudioStore.getState(), src, renderer?.canvas ?? null);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `saundarya-${effect}.svg`);
    setNotice("Vector SVG exported");
  };

  const recordWebm = async () => {
    const renderer = getRendererHandle();
    if (!renderer || recording) return;
    setRecording(true);
    setProgress(0);
    try {
      const blob = await exportVideo({
        canvas: renderer.canvas,
        seconds,
        onProgress: setProgress,
      });
      downloadBlob(blob, `saundarya-${effect}-loop.webm`);
      setNotice("WebM loop exported");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Video export failed");
    } finally {
      setRecording(false);
    }
  };

  const tabMeta = CODE_TABS.find((t) => t.id === tab)!;
  const isAnimated = media?.kind === "video" || media?.kind === "procedural" || media?.kind === "webcam";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Export and get code"
    >
      <div className="flex h-[min(82vh,760px)] w-[min(94vw,920px)] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-ink">Export / Get Code</h2>
            <span className="rounded border border-coral/30 bg-coral/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-coral-ink">
              {EFFECT_LABELS[effect]}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-overlay hover:text-ink"
            aria-label="Close export dialog"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center gap-1 border-b border-line px-4 pt-2">
          {CODE_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 font-mono text-[11px] transition-colors ${
                tab === id ? "border-coral text-ink" : "border-transparent text-faint hover:text-muted"
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
          <span className="ml-auto hidden pb-1 font-mono text-[9px] text-faint sm:block">
            {tab === "react-tsx" && "self-contained · zero deps · live uniforms baked"}
            {tab === "glsl" && "WebGL2 · GLSL ES 3.00"}
            {tab === "ascii-html" && "120-col sampling · inline CSS"}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          <CodeViewer code={code} label={`${tabMeta.label} — ${code.length.toLocaleString()} chars`} />
          {tab === "react-tsx" && media?.kind === "procedural" && (
            <p className="mt-2 font-mono text-[9px] leading-snug text-faint">
              Procedural loops embed as a still frame in code export — use WebM below to capture the motion.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-4 py-3">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">Binary</span>
          <button
            type="button"
            onClick={downloadPng}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs text-muted transition-colors hover:border-coral/50 hover:text-coral-ink"
          >
            <ImageDown size={13} /> PNG
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs text-muted transition-colors hover:border-coral/50 hover:text-coral-ink"
          >
            <FileDown size={13} /> Vector SVG
          </button>
          {isAnimated && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={recordWebm}
                disabled={recording}
                className="flex items-center gap-1.5 rounded-md border border-peach/40 bg-peach/10 px-3 py-1.5 text-xs text-peach-ink transition-colors hover:bg-peach/20 disabled:opacity-60"
              >
                {recording ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
                {recording ? `Recording ${Math.round(progress * 100)}%` : "WebM loop"}
              </button>
              <select
                value={seconds}
                onChange={(e) => setSeconds(parseInt(e.target.value, 10))}
                disabled={recording}
                className="rounded-md border border-line bg-panel px-1.5 py-1.5 font-mono text-[10px] text-muted outline-none"
                aria-label="Recording duration"
              >
                <option value={2}>2s</option>
                <option value={4}>4s</option>
                <option value={8}>8s</option>
              </select>
            </div>
          )}
          {isAnimated && recording && (
            <div className="h-1 min-w-24 flex-1 overflow-hidden rounded-full bg-overlay">
              <div className="h-full rounded-full bg-peach transition-all duration-150" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}