"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shuffle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LotusMark } from "@/components/ui/LotusMark";

type Background = {
  src: string;
  kind: "image" | "video";
  label: string;
};

const BACKGROUNDS: Background[] = [
  { src: "/landing/dither-parthenon.png", kind: "image", label: "Ordered dither · Parthenon" },
  { src: "/landing/halftone-skyline.png", kind: "image", label: "CMYK halftone · Skyline" },
  { src: "/landing/ascii-ridge.png", kind: "image", label: "ASCII luminance · Ridge" },
  { src: "/landing/loop-1.webm", kind: "video", label: "Live shader loop · 01" },
  { src: "/landing/loop-2.webm", kind: "video", label: "Live shader loop · 02" },
  { src: "/landing/halftone-flag.png", kind: "image", label: "Riso halftone · Union Jack" },
];

const SCRAMBLE_GLYPHS = "!<>-_\\/[]{}=+*^?#%&@";

type WordVariant = "flow" | "scramble" | "tilt" | "pop" | "arrow";

function TitleWord({ text, variant = "flow" }: { text: string; variant?: WordVariant }) {
  const [shown, setShown] = useState(text);
  const frame = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  // ASCII-style scramble: cycle glyphs, revealing the real letters left to right.
  const scramble = useCallback(() => {
    stop();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text);
      return;
    }
    const duration = 460;
    const start = performance.now();
    const tick = (now: number) => {
      const p = (now - start) / duration;
      if (p >= 1) {
        setShown(text);
        frame.current = null;
        return;
      }
      const revealed = Math.floor(p * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out +=
          i < revealed || ch === " "
            ? ch
            : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
      }
      setShown(out);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [text, stop]);

  useEffect(() => stop, [stop]);

  const isScramble = variant === "scramble";

  return (
    <span
      className={`tw tw-${variant}`}
      onMouseEnter={isScramble ? scramble : undefined}
      onMouseLeave={
        isScramble
          ? () => {
              stop();
              setShown(text);
            }
          : undefined
      }
      aria-label={text}
    >
      {isScramble ? (
        <>
          <span className="tw-sizer" aria-hidden="true">
            {text}
          </span>
          <span className="tw-live" aria-hidden="true">
            {shown}
          </span>
        </>
      ) : (
        text
      )}
      {variant === "arrow" && (
        <svg className="scribble" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            className="line"
            pathLength={1}
            d="M22 3.5 C 16.5 4, 9.5 7, 5.5 15.5"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
          />
          <path
            className="head"
            d="M5.5 15.5 l 4.6 -1.1 M5.5 15.5 l 1.1 -4.6"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

export default function Landing() {
  const [index, setIndex] = useState(0);
  const [navDark, setNavDark] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const heroRef = useRef<HTMLElement | null>(null);
  const sampleCanvas = useRef<HTMLCanvasElement | null>(null);

  const shuffle = () => {
    setIndex((prev) => {
      const others = BACKGROUNDS.map((_, i) => i).filter((i) => i !== prev);
      return others[Math.floor(Math.random() * others.length)];
    });
  };

  const prevBackground = () => setIndex((p) => (p - 1 + BACKGROUNDS.length) % BACKGROUNDS.length);
  const nextBackground = () => setIndex((p) => (p + 1) % BACKGROUNDS.length);

  // Sample the luminance of the background strip behind the nav and flip the
  // foreground between marine and white so it stays readable on any artwork.
  const sampleTone = useCallback((i: number) => {
    const b = BACKGROUNDS[i];
    let el: CanvasImageSource | null = null;
    let iw = 0;
    let ih = 0;
    if (b.kind === "image") {
      const img = imgRefs.current[i];
      if (img && img.complete && img.naturalWidth > 0) {
        el = img;
        iw = img.naturalWidth;
        ih = img.naturalHeight;
      }
    } else {
      const vid = videoRefs.current[i];
      if (vid && vid.readyState >= 2 && vid.videoWidth > 0) {
        el = vid;
        iw = vid.videoWidth;
        ih = vid.videoHeight;
      }
    }
    if (!el || !iw || !ih) return;
    let canvas = sampleCanvas.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      sampleCanvas.current = canvas;
    }
    const cw = 64;
    const ch = 8;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const sh = Math.max(1, Math.floor(ih * 0.12));
    try {
      ctx.drawImage(el, 0, 0, iw, sh, 0, 0, cw, ch);
      const data = ctx.getImageData(0, 0, cw, ch).data;
      let sum = 0;
      for (let p = 0; p < data.length; p += 4) {
        sum += (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
      }
      setNavDark(sum / (cw * ch) > 0.5);
    } catch {
      /* canvas tainted or frame not ready */
    }
  }, []);

  useEffect(() => {
    const b = BACKGROUNDS[index];
    const run = () => sampleTone(index);
    let interval: number | undefined;
    let target: HTMLImageElement | HTMLVideoElement | null = null;
    let evt = "load";
    if (b.kind === "image") {
      const img = imgRefs.current[index];
      target = img;
      if (img && img.complete) run();
      else img?.addEventListener("load", run, { once: true });
    } else {
      const vid = videoRefs.current[index];
      target = vid;
      evt = "loadeddata";
      run();
      vid?.addEventListener("loadeddata", run, { once: true });
      interval = window.setInterval(run, 1200);
    }
    return () => {
      if (interval) window.clearInterval(interval);
      target?.removeEventListener(evt, run);
    };
  }, [index, sampleTone]);

  useEffect(() => {
    const onScroll = () => {
      const h = heroRef.current?.offsetHeight ?? window.innerHeight;
      setScrolled(window.scrollY > h - 72);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const playAll = () => {
      videoRefs.current.forEach((v) => {
        if (v) v.play().catch(() => {});
      });
    };
    playAll();
    window.addEventListener("pointerdown", playAll, { once: true });
    window.addEventListener("keydown", playAll, { once: true });
    return () => {
      window.removeEventListener("pointerdown", playAll);
      window.removeEventListener("keydown", playAll);
    };
  }, []);

  const current = BACKGROUNDS[index];
  const navWord = scrolled ? "text-white" : navDark ? "text-[#173042]" : "text-white";
  const navSub = scrolled ? "text-white/70" : navDark ? "text-[#173042]/80" : "text-white/80";
  const navHalo = scrolled
    ? ""
    : navDark
      ? "[text-shadow:0_0_3px_rgba(255,255,255,0.95),0_0_8px_rgba(255,255,255,0.8),0_1px_14px_rgba(255,255,255,0.6)]"
      : "[text-shadow:0_0_3px_rgba(0,0,0,0.95),0_0_8px_rgba(0,0,0,0.8),0_1px_14px_rgba(0,0,0,0.6)]";
  const headerCls = scrolled
    ? "border-b border-white/10 bg-[#0a0d13]/80 backdrop-blur-md"
    : navDark
      ? "border-b border-black/10 bg-transparent"
      : "border-b border-white/15 bg-transparent";

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ── Fixed nav: transparent over the hero with luminance-adaptive text,
             themed glass once scrolled into the content ── */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${headerCls}`}>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 h-28 transition-opacity duration-500 ${
            scrolled ? "opacity-0" : "opacity-100"
          } ${
            navDark
              ? "bg-gradient-to-b from-white/60 via-white/25 to-transparent"
              : "bg-gradient-to-b from-black/55 via-black/25 to-transparent"
          }`}
        />
        <div className="relative mx-auto flex h-20 w-full max-w-6xl items-center gap-5 px-5">
          <Link href="/" className="flex items-center gap-3" title="Saundarya Studio home">
            <LotusMark size={38} bright />
            <span className={`text-[19px] font-semibold tracking-tight transition-colors duration-300 ${navWord} ${navHalo}`}>
              Saundarya <span className={`font-light transition-colors duration-300 ${navSub}`}>Studio</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/studio"
              className="flex h-10 items-center gap-2 rounded-lg bg-coral px-4 text-sm font-semibold text-oncoral shadow-glow-coral transition-all hover:bg-coral/90"
            >
              Open Studio <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Fixed background stage: pinned to the viewport while the page scrolls over it ── */}
      <div className="fixed inset-0 z-0 bg-[#0a0d13]" aria-hidden>
        {BACKGROUNDS.map((b, i) => (
          <div
            key={b.src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${i === index ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== index}
          >
            {b.kind === "image" ? (
              <img
                ref={(el) => {
                  imgRefs.current[i] = el;
                }}
                src={b.src}
                alt=""
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={b.src}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/55 to-black/70" />
        <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.08]" />
      </div>

      {/* ── Hero: transparent, so its text scrolls over the fixed background ── */}
      <section ref={heroRef} className="relative z-10 flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_46%,rgba(4,6,10,0.72),transparent_72%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 pb-32 pt-28 text-center">
          <span className="glass-badge rise w-fit" style={{ animationDelay: "0.05s" }}>
            OPEN SOURCE · WEBGL2 · 100% CLIENT-SIDE
          </span>
          <h1
            className="rise mt-5 max-w-4xl text-5xl font-bold leading-[1.03] tracking-tight text-white drop-shadow-[0_0_44px_rgba(254,101,79,0.28)] sm:text-7xl lg:text-8xl"
            style={{ animationDelay: "0.15s" }}
          >
            <TitleWord text="Beautiful" variant="flow" />{" "}
            <TitleWord text="images," variant="scramble" />
            <br />
            <TitleWord text="for" variant="tilt" />{" "}
            <TitleWord text="free," variant="pop" />{" "}
            <TitleWord text="forever." variant="arrow" />
          </h1>
          <div
            className="rise mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-full border border-white/20 bg-black/35 px-5 py-2.5 backdrop-blur-md"
            style={{ animationDelay: "0.26s" }}
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-peach" />
              <span className="text-[13px] font-semibold text-white">Every image stays on your laptop.</span>
            </span>
            <span className="text-[12px] text-white/70">No uploads. No account. No telemetry.</span>
          </div>

          <p className="rise mt-5 max-w-xl text-[15px] leading-relaxed text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]" style={{ animationDelay: "0.38s" }}>
            Saundarya Studio turns photos, videos and interfaces into ordered dither, ASCII, risograph
            halftone and noisy gradient mesh, rendered live in your browser and exported as clean code.
          </p>

          <div className="rise mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.5s" }}>
            <Link
              href="/studio"
              className="flex h-11 items-center gap-2 rounded-lg bg-coral px-6 text-sm font-semibold text-oncoral shadow-glow-coral transition-all hover:bg-coral/90 hover:shadow-glow-peach"
            >
              Enter the Studio <ArrowRight size={15} />
            </Link>
            <button
              type="button"
              onClick={shuffle}
              className="flex h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:border-peach/60 hover:bg-white/20"
            >
              <Shuffle size={15} /> Shuffle background
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto flex w-full max-w-6xl items-end justify-between px-5 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5 rounded-full border border-white/20 bg-black/30 p-0.5 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={prevBackground}
                    aria-label="Previous background"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="min-w-[54px] text-center font-mono text-[10px] tracking-[0.18em] text-white/85 tabular-nums">
                    {String(index + 1).padStart(2, "0")} / {String(BACKGROUNDS.length).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={nextBackground}
                    aria-label="Next background"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                  {current.label}
                </p>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                {BACKGROUNDS.map((b, i) => (
                  <button
                    key={b.src}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show background ${i + 1}: ${b.label}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === index ? "w-6 bg-coral" : "w-2 bg-white/35 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}