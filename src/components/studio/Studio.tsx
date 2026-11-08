"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useStudioStore } from "@/store/useStudioStore";
import { ASSET_LIBRARY, getAsset } from "@/data/assetLibrary";
import { type ActiveEffect, type ComparisonMode } from "@/types/studio";
import { TopNavbar } from "./TopNavbar";
import { LeftSidebar } from "./LeftSidebar";
import { CenterViewport } from "./CenterViewport";
import { RightInspector } from "./RightInspector";
import { getRendererHandle } from "@/engine/StudioRenderer";

// Exporters + code viewer are only needed when the dialog opens; keep them out
// of the studio's critical first-paint bundle so navigation feels instant.
const ExportModal = dynamic(() => import("./ExportModal").then((m) => m.ExportModal), {
  ssr: false,
});

const EFFECT_KEYS: Record<string, ActiveEffect> = {
  "1": "dither",
  "2": "ascii",
  "3": "halftone",
  "4": "mesh",
};

const COMPARISON_CYCLE: ComparisonMode[] = ["off", "split-slider", "xray-loupe", "side-by-side"];

function Toast() {
  const notice = useStudioStore((s) => s.notice);
  const setNotice = useStudioStore((s) => s.setNotice);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice, setNotice]);
  if (!notice) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-coral/40 bg-panel/95 px-4 py-2 font-mono text-[11px] text-coral-ink shadow-glow-coral backdrop-blur">
      {notice}
    </div>
  );
}

export default function Studio() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  useEffect(() => {
    const store = useStudioStore.getState();
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("preset");
    let assetId: string | null = null;
    if (encoded) assetId = store.hydrate(encoded);
    const asset = (assetId && getAsset(assetId)) || ASSET_LIBRARY[0];
    store.selectAsset(asset, !encoded);
    // Debug/QA handle for console and automated verification.
    (window as unknown as Record<string, unknown>).__saundarya = {
      store: useStudioStore,
      getRenderer: getRendererHandle,
      library: ASSET_LIBRARY,
      getAsset,
    };
  }, []);

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const store = useStudioStore.getState();
      if (e.code === "Space") {
        if (store.viewportMode !== "canvas") return;
        e.preventDefault();
        if (!e.repeat) store.setHoldingBypass(true);
        return;
      }
      if (EFFECT_KEYS[e.key]) {
        store.setEffect(EFFECT_KEYS[e.key]);
        return;
      }
      if ((e.key === "c" || e.key === "C") && store.viewportMode === "canvas") {
        const idx = COMPARISON_CYCLE.indexOf(store.comparisonMode);
        store.setComparisonMode(COMPARISON_CYCLE[(idx + 1) % COMPARISON_CYCLE.length]);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") useStudioStore.getState().setHoldingBypass(false);
    };
    const blur = () => useStudioStore.getState().setHoldingBypass(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <TopNavbar onToggleLeft={() => setLeftOpen((v) => !v)} onToggleRight={() => setRightOpen((v) => !v)} />
      <main className="relative flex min-h-0 flex-1">
        <div
          className={`${
            leftOpen ? "absolute inset-y-0 left-0 z-30 flex shadow-panel" : "hidden"
          } lg:static lg:flex lg:shadow-none`}
        >
          <LeftSidebar />
        </div>
        <CenterViewport />
        <div
          className={`${
            rightOpen ? "absolute inset-y-0 right-0 z-30 flex shadow-panel" : "hidden"
          } lg:static lg:flex lg:shadow-none`}
        >
          <RightInspector />
        </div>
      </main>
      <ExportModal />
      <Toast />
    </div>
  );
}