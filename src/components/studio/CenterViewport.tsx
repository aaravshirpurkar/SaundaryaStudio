"use client";

import { useRef, useState } from "react";
import { ChevronsLeftRight, Play, Pause, Radio, ArrowRight, Zap, Shield, Globe } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";
import { EFFECT_LABELS } from "@/types/studio";
import { useStudioRenderer } from "@/engine/useStudioRenderer";
import { getRendererHandle } from "@/engine/StudioRenderer";

function SplitHandle() {
  const splitPosition = useStudioStore((s) => s.splitPosition);
  const setSplitPosition = useStudioStore((s) => s.setSplitPosition);
  const effect = useStudioStore((s) => s.effect);
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const r = parent.getBoundingClientRect();
    setSplitPosition((e.clientX - r.left) / r.width);
  };

  return (
    <>
      <div
        ref={ref}
        className="absolute inset-y-0 z-20"
        style={{ left: `${splitPosition * 100}%`, width: 0 }}
      >
        <div className="absolute inset-y-0 -left-px w-[2px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)]" />
        <button
          type="button"
          aria-label="Drag to compare before / after"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          className={`absolute top-1/2 flex h-9 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/40 bg-black/55 text-white backdrop-blur-md transition-all ${
            dragging ? "scale-110 border-coral bg-coral/30" : "hover:border-white/80"
          }`}
        >
          <ChevronsLeftRight size={16} />
        </button>
      </div>
      <span className="glass-badge absolute left-3 top-3 z-10">RAW INPUT</span>
      <span className="glass-badge absolute right-3 top-3 z-10 border-peach/40 text-peach">
        SAUNDARYA: {EFFECT_LABELS[effect]}
      </span>
    </>
  );
}

function LoupeRing() {
  const ringRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 z-10"
      onPointerMove={(e) => {
        const ring = ringRef.current;
        const host = hostRef.current;
        if (!ring || !host) return;
        const r = host.getBoundingClientRect();
        ring.style.transform = `translate(${e.clientX - r.left - 130}px, ${e.clientY - r.top - 130}px)`;
        ring.style.opacity = "1";
      }}
      onPointerLeave={() => {
        if (ringRef.current) ringRef.current.style.opacity = "0";
      }}
    >
      <div
        ref={ringRef}
        className="pointer-events-none absolute left-0 top-0 h-[260px] w-[260px] rounded-full border border-white/50 opacity-0 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-opacity duration-150"
      >
        <span className="glass-badge absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap">X-RAY · RAW</span>
      </div>
    </div>
  );
}

function VideoControls() {
  const playback = useStudioStore((s) => s.playback);
  const setPlayback = useStudioStore((s) => s.setPlayback);
  const media = useStudioStore((s) => s.media);
  const isLive = media?.kind === "webcam";
  const hasDuration = playback.duration > 0;

  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line/60 bg-gradient-to-t from-paper/95 to-paper/40 px-4 py-2.5 backdrop-blur-sm">
      {isLive ? (
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-peach-ink">
          <Radio size={11} className="animate-pulse" /> Live
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setPlayback({ playing: !playback.playing })}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-panel text-ink transition-colors hover:border-coral hover:text-coral-ink"
          aria-label={playback.playing ? "Pause" : "Play"}
        >
          {playback.playing ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
        </button>
      )}
      {hasDuration && !isLive && (
        <>
          <span className="font-mono text-[10px] tabular-nums text-muted">{fmt(playback.currentTime)}</span>
          <input
            type="range"
            className="slider flex-1"
            min={0}
            max={playback.duration}
            step={0.01}
            value={playback.currentTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              getRendererHandle()?.seek(t);
              setPlayback({ currentTime: t });
            }}
            aria-label="Scrub video"
          />
          <span className="font-mono text-[10px] tabular-nums text-faint">{fmt(playback.duration)}</span>
        </>
      )}
      {!hasDuration && !isLive && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Seamless procedural loop · 8s</span>
      )}
    </div>
  );
}

function SaasHeroOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-coral shadow-glow-coral" />
          <span className="text-sm font-semibold text-white drop-shadow">Acme Labs</span>
        </div>
        <div className="hidden items-center gap-6 text-[13px] text-white/80 drop-shadow md:flex">
          <span>Product</span>
          <span>Pricing</span>
          <span>Docs</span>
          <span className="rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-black">Get started</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 rounded-full border border-white/25 bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
          Now in public beta
        </span>
        <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)] md:text-6xl">
          Ship beautiful interfaces at the speed of thought
        </h1>
        <p className="mt-4 max-w-md text-sm text-white/85 drop-shadow md:text-base">
          Your canvas effect is the hero background. This is exactly how it ships.
        </p>
        <div className="mt-7 flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-oncoral shadow-glow-coral">
            Start building <ArrowRight size={14} />
          </span>
          <span className="rounded-lg border border-white/30 bg-black/30 px-5 py-2.5 text-sm text-white backdrop-blur-sm">
            View demo
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-8 pb-6 font-mono text-[10px] uppercase tracking-widest text-white/60">
        <span className="flex items-center gap-1.5"><Zap size={10} /> 60fps WebGL</span>
        <span className="flex items-center gap-1.5"><Shield size={10} /> Zero backend</span>
        <span className="flex items-center gap-1.5"><Globe size={10} /> Works offline</span>
      </div>
    </div>
  );
}

function BentoOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 gap-3 p-6">
      <div className="col-span-2 row-span-2 rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-[2px]">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">Live effect surface</span>
        <p className="mt-2 max-w-[220px] text-lg font-semibold leading-snug text-white drop-shadow">
          This card is transparent — the shader runs beneath it
        </p>
      </div>
      <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/50">Render</span>
        <div className="mt-2 font-mono text-2xl font-semibold text-coral drop-shadow">60<span className="text-sm text-white/60"> fps</span></div>
        <div className="mt-2 flex items-end gap-1">
          {[5, 8, 6, 10, 7, 12, 9, 14].map((h, i) => (
            <div key={i} className="w-full rounded-sm bg-coral/70" style={{ height: `${h * 2.4}px` }} />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/50">Bundle</span>
        <div className="mt-2 font-mono text-2xl font-semibold text-white drop-shadow">0<span className="text-sm text-white/60"> deps</span></div>
        <p className="mt-1 text-[11px] leading-snug text-white/70">Exported components are self-contained</p>
      </div>
      <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/50">Palette</span>
        <div className="mt-3 flex gap-1.5">
          {["#FE654F", "#FED18C", "#D6EFFF", "#2E7CB8", "#173042"].map((c) => (
            <div key={c} className="h-6 w-6 rounded-md border border-white/20" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="col-span-2 rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/50">Pipeline</span>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-white/80">
          <span className="rounded bg-white/10 px-2 py-1">SOURCE</span>
          <span className="text-white/40">→</span>
          <span className="rounded bg-coral/25 px-2 py-1 text-coral">SHADER</span>
          <span className="text-white/40">→</span>
          <span className="rounded bg-white/10 px-2 py-1">COMPARE</span>
          <span className="text-white/40">→</span>
          <span className="rounded bg-peach/25 px-2 py-1 text-peach">EXPORT</span>
        </div>
      </div>
    </div>
  );
}

export function CenterViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useStudioRenderer(canvasRef);
  const comparisonMode = useStudioStore((s) => s.comparisonMode);
  const isHoldingBypass = useStudioStore((s) => s.isHoldingBypass);
  const viewportMode = useStudioStore((s) => s.viewportMode);
  const effect = useStudioStore((s) => s.effect);
  const media = useStudioStore((s) => s.media);

  const showVideoControls = media?.kind === "video" || media?.kind === "webcam";
  const inCanvas = viewportMode === "canvas";

  return (
    <div className="viewport-bg relative min-w-0 flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {inCanvas && comparisonMode === "split-slider" && !isHoldingBypass && <SplitHandle />}
      {inCanvas && comparisonMode === "xray-loupe" && !isHoldingBypass && <LoupeRing />}
      {inCanvas && comparisonMode === "side-by-side" && !isHoldingBypass && (
        <>
          <div className="absolute inset-y-0 left-1/2 z-10 w-px bg-white/70" />
          <span className="glass-badge absolute left-3 top-3 z-10">RAW INPUT</span>
          <span className="glass-badge absolute right-3 top-3 z-10 border-peach/40 text-peach">
            SAUNDARYA: {EFFECT_LABELS[effect]}
          </span>
        </>
      )}
      {inCanvas && isHoldingBypass && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <span className="glass-badge border-white/40 px-4 py-2 text-[11px] text-white">
            BYPASS · RAW INPUT — release SPACE to compare
          </span>
        </div>
      )}

      {viewportMode === "saas-hero" && <SaasHeroOverlay />}
      {viewportMode === "bento-grid" && <BentoOverlay />}
      {inCanvas && showVideoControls && <VideoControls />}
    </div>
  );
}