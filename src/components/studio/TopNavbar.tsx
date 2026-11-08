"use client";

import {
  CircleOff,
  Columns2,
  ScanSearch,
  SquareSplitHorizontal,
  Frame,
  LayoutTemplate,
  LayoutGrid,
  Share2,
  Code2,
  PanelLeft,
  PanelRight,
  Activity,
} from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";
import type { ComparisonMode, ViewportMode } from "@/types/studio";
import { ToolButton } from "@/components/ui/controls";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LotusMark } from "@/components/ui/LotusMark";
import Link from "next/link";

const COMPARISONS: { mode: ComparisonMode; label: string; icon: typeof CircleOff }[] = [
  { mode: "off", label: "Comparison off", icon: CircleOff },
  { mode: "split-slider", label: "Split curtain", icon: Columns2 },
  { mode: "xray-loupe", label: "X-Ray loupe", icon: ScanSearch },
  { mode: "side-by-side", label: "Side by side", icon: SquareSplitHorizontal },
];

const VIEWPORTS: { mode: ViewportMode; label: string; icon: typeof Frame }[] = [
  { mode: "canvas", label: "Raw canvas", icon: Frame },
  { mode: "saas-hero", label: "SaaS hero mockup", icon: LayoutTemplate },
  { mode: "bento-grid", label: "Bento card mockup", icon: LayoutGrid },
];

export function TopNavbar({
  onToggleLeft,
  onToggleRight,
}: {
  onToggleLeft: () => void;
  onToggleRight: () => void;
}) {
  const comparisonMode = useStudioStore((s) => s.comparisonMode);
  const setComparisonMode = useStudioStore((s) => s.setComparisonMode);
  const viewportMode = useStudioStore((s) => s.viewportMode);
  const setViewportMode = useStudioStore((s) => s.setViewportMode);
  const fps = useStudioStore((s) => s.fps);
  const serialize = useStudioStore((s) => s.serialize);
  const setNotice = useStudioStore((s) => s.setNotice);
  const setExportModalOpen = useStudioStore((s) => s.setExportModalOpen);

  const share = async () => {
    const encoded = serialize();
    const url = `${window.location.origin}${window.location.pathname}?preset=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Preset link copied to clipboard");
    } catch {
      window.history.replaceState(null, "", `?preset=${encoded}`);
      setNotice("Preset encoded into the address bar");
    }
  };

  return (
    <header className="relative z-40 flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-panel/90 px-3 backdrop-blur">
      <button
        type="button"
        onClick={onToggleLeft}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-overlay hover:text-ink lg:hidden"
        aria-label="Toggle asset library"
      >
        <PanelLeft size={15} />
      </button>

      <Link href="/" className="flex items-center gap-2.5 rounded-md" title="Back to home">
        <LotusMark />
        <div className="leading-none">
          <span className="text-[13px] font-semibold tracking-tight text-ink">
            Saundarya <span className="font-light text-muted">Studio</span>
          </span>
        </div>
      </Link>

      <div className="mx-1 h-6 w-px bg-line" />

      <div className="flex items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5" role="toolbar" aria-label="Before / after comparison">
        {COMPARISONS.map(({ mode, label, icon: Icon }) => (
          <ToolButton
            key={mode}
            active={viewportMode === "canvas" && comparisonMode === mode}
            disabled={viewportMode !== "canvas"}
            onClick={() => setComparisonMode(mode)}
            title={viewportMode === "canvas" ? label : `${label} · raw canvas only`}
          >
            <Icon size={14} />
          </ToolButton>
        ))}
      </div>
      {viewportMode === "canvas" && (
        <span className="hidden items-center gap-1.5 font-mono text-[9px] text-faint xl:flex">
          <kbd className="rounded border border-line bg-overlay px-1.5 py-0.5 text-[9px] text-muted">SPACE</kbd>
          hold to bypass
        </span>
      )}

      <div className="mx-1 h-6 w-px bg-line" />

      <div className="flex items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5" role="toolbar" aria-label="Viewport context">
        {VIEWPORTS.map(({ mode, label, icon: Icon }) => (
          <ToolButton key={mode} active={viewportMode === mode} onClick={() => setViewportMode(mode)} title={label} accent="peach">
            <Icon size={14} />
          </ToolButton>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="hidden items-center gap-1.5 rounded-md border border-line bg-paper px-2 py-1 sm:flex" title="Render framerate">
          <Activity size={11} className={fps >= 50 ? "text-coral-ink" : fps >= 24 ? "text-peach-ink" : "text-coral"} />
          <span className="font-mono text-[11px] tabular-nums text-ink">{fps}</span>
          <span className="font-mono text-[9px] text-faint">FPS</span>
        </div>
        <button
          type="button"
          onClick={share}
          className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 text-xs text-muted transition-colors hover:border-faint hover:text-ink"
        >
          <Share2 size={13} />
          <span className="hidden md:inline">Share Preset</span>
        </button>
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-coral px-3 text-xs font-semibold text-oncoral shadow-glow-coral transition-all hover:bg-coral/90"
        >
          <Code2 size={13} />
          Export / Get Code
        </button>
        <button
          type="button"
          onClick={onToggleRight}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-overlay hover:text-ink lg:hidden"
          aria-label="Toggle inspector"
        >
          <PanelRight size={15} />
        </button>
      </div>
    </header>
  );
}