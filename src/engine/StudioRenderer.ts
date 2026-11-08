"use client";

import type { ActiveEffect, ProceduralId } from "@/types/studio";
import { useStudioStore } from "@/store/useStudioStore";
import { getPaletteColors, hexToRgb, hexToRgb255, resolveMeshColors } from "@/data/palettes";
import { VERTEX_SHADER } from "./shaders/vertex";
import { DITHER_FRAG } from "./shaders/dither.frag";
import { ASCII_FRAG } from "./shaders/ascii.frag";
import { HALFTONE_FRAG } from "./shaders/halftoneRiso.frag";
import { MESH_FRAG } from "./shaders/noisyMesh.frag";
import { getAsciiAtlas } from "./asciiAtlas";
import { getGenerator, type GeneratorFn } from "./procedural";
import { extractPalette } from "./extractPalette";

const FRAGS: Record<ActiveEffect, string> = {
  dither: DITHER_FRAG,
  ascii: ASCII_FRAG,
  halftone: HALFTONE_FRAG,
  mesh: MESH_FRAG,
};

const COMPARE_INT: Record<string, number> = {
  off: 0,
  "split-slider": 1,
  "xray-loupe": 2,
  "side-by-side": 3,
  "hold-bypass": 0,
};

type UVal =
  | { t: "1f"; v: number }
  | { t: "1i"; v: number }
  | { t: "2f"; v: [number, number] }
  | { t: "3f"; v: [number, number, number] }
  | { t: "3fv"; v: number[] };

interface ProgramInfo {
  program: WebGLProgram;
  locs: Map<string, WebGLUniformLocation | null>;
}

type Source =
  | { kind: "image"; el: HTMLImageElement }
  | { kind: "video"; el: HTMLVideoElement }
  | { kind: "procedural"; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; gen: GeneratorFn; id: ProceduralId }
  | { kind: "webcam"; el: HTMLVideoElement };

export class StudioRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private programs = new Map<ActiveEffect, ProgramInfo>();
  private texSource: WebGLTexture;
  private texAtlas: WebGLTexture;
  private texProcessed: WebGLTexture;
  private quadBuf: WebGLBuffer | null = null;
  private source: Source | null = null;
  private srcRes: [number, number] = [1, 1];
  private sourceStatic = true;
  private sourceUploaded = false;
  private paletteDirty = true;
  private atlasCharset = "";
  private mouse: [number, number] = [0.5, 0.5];
  private raf = 0;
  private pump: MessageChannel | null = null;
  private lastFrame = 0;
  private start = performance.now();
  private frames = 0;
  private fpsLast = performance.now();
  private playbackLast = 0;
  private destroyed = false;

  private worker: Worker | null = null;
  private workCanvas = document.createElement("canvas");
  private processedCanvas = document.createElement("canvas");
  private processedReady = false;
  private processedDirty = true;
  private processedLast = 0;
  private workerBusy = false;
  private jobId = 0;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      preserveDrawingBuffer: true,
      antialias: false,
      alpha: false,
    });
    if (!gl) throw new Error("WebGL2 is not available in this browser.");
    this.gl = gl;

    const buf = gl.createBuffer();
    this.quadBuf = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    for (const effect of Object.keys(FRAGS) as ActiveEffect[]) {
      this.programs.set(effect, this.buildProgram(FRAGS[effect]));
    }

    this.texSource = this.makeTexture(0, gl.LINEAR);
    this.texAtlas = this.makeTexture(1, gl.LINEAR);
    this.texProcessed = this.makeTexture(2, gl.NEAREST);
    // 1×1 black so sampleRaw is always safe (mesh runs sourceless).
    gl.bindTexture(gl.TEXTURE_2D, this.texSource);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    try {
      this.worker = new Worker(new URL("./workers/dither.worker.ts", import.meta.url));
      this.worker.onmessage = (e) => this.onWorkerResult(e.data);
    } catch {
      this.worker = null;
    }

    this.loop = this.loop.bind(this);
    this.tick = this.tick.bind(this);
    // MessageChannel tasks are exempt from hidden-tab timer throttling, so
    // rendering (and WebM capture) keeps a steady 30fps in background tabs.
    this.pump = new MessageChannel();
    this.pump.port1.onmessage = this.tick;
    document.addEventListener("visibilitychange", this.onVisibility);
    this.schedule();
  }

  private scheduled = false;

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.scheduled = false;
      this.schedule();
    }
  };

  private schedule() {
    if (this.destroyed || this.scheduled) return;
    this.scheduled = true;
    if (document.hidden) {
      this.pump?.port2.postMessage(0);
    } else {
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick() {
    this.scheduled = false;
    if (this.destroyed) return;
    const now = performance.now();
    if (document.hidden && now - this.lastFrame < 33) {
      this.schedule();
      return;
    }
    this.lastFrame = now;
    this.loop();
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile failed: ${log}\n${src}`);
    }
    return sh;
  }

  private buildProgram(fragSrc: string): ProgramInfo {
    const gl = this.gl;
    const vs = this.compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = this.compile(gl.FRAGMENT_SHADER, fragSrc);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    return { program, locs: new Map() };
  }

  private loc(info: ProgramInfo, name: string): WebGLUniformLocation | null {
    if (!info.locs.has(name)) {
      info.locs.set(name, this.gl.getUniformLocation(info.program, name));
    }
    return info.locs.get(name) ?? null;
  }

  private setUniforms(info: ProgramInfo, values: Record<string, UVal>) {
    const gl = this.gl;
    for (const [name, val] of Object.entries(values)) {
      const l = this.loc(info, name);
      if (l === null) continue;
      switch (val.t) {
        case "1f": gl.uniform1f(l, val.v); break;
        case "1i": gl.uniform1i(l, val.v); break;
        case "2f": gl.uniform2f(l, val.v[0], val.v[1]); break;
        case "3f": gl.uniform3f(l, val.v[0], val.v[1], val.v[2]); break;
        case "3fv": gl.uniform3fv(l, val.v); break;
      }
    }
  }

  private makeTexture(unit: number, filter: number): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private upload(tex: WebGLTexture, unit: number, el: TexImageSource, flip = true) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  // ── Source management ────────────────────────────────────────────────────
  setImage(el: HTMLImageElement) {
    this.source = { kind: "image", el };
    this.srcRes = [el.naturalWidth || 1, el.naturalHeight || 1];
    this.sourceStatic = true;
    this.sourceUploaded = false;
    this.paletteDirty = true;
    this.processedReady = false;
    this.processedDirty = true;
  }

  setVideo(el: HTMLVideoElement, webcam = false) {
    this.source = webcam ? { kind: "webcam", el } : { kind: "video", el };
    const update = () => {
      this.srcRes = [el.videoWidth || 1, el.videoHeight || 1];
    };
    update();
    el.addEventListener("loadedmetadata", update);
    this.sourceStatic = false;
    this.sourceUploaded = false;
    this.paletteDirty = true;
    this.processedReady = false;
    this.processedDirty = true;
  }

  setProcedural(id: ProceduralId) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, this.canvas.width);
    canvas.height = Math.max(2, this.canvas.height);
    const ctx = canvas.getContext("2d")!;
    this.source = { kind: "procedural", canvas, ctx, gen: getGenerator(id), id };
    this.srcRes = [canvas.width, canvas.height];
    this.sourceStatic = false;
    this.sourceUploaded = false;
    this.paletteDirty = true;
    this.processedReady = false;
    this.processedDirty = true;
  }

  getSourceCanvas(): HTMLCanvasElement | null {
    const s = this.source;
    if (!s) return null;
    if (s.kind === "procedural") return s.canvas;
    const sw = s.kind === "image" ? s.el.naturalWidth : s.el.videoWidth;
    const sh = s.kind === "image" ? s.el.naturalHeight : s.el.videoHeight;
    if (!sw || !sh) return null;
    const scale = Math.min(1, 1600 / sw);
    const c = document.createElement("canvas");
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    c.getContext("2d")!.drawImage(s.el, 0, 0, c.width, c.height);
    return c;
  }

  get videoElement(): HTMLVideoElement | null {
    const s = this.source;
    return s && (s.kind === "video" || s.kind === "webcam") ? s.el : null;
  }

  play() { this.videoElement?.play().catch(() => {}); }
  pause() { this.videoElement?.pause(); }
  seek(t: number) {
    const v = this.videoElement;
    if (v && Number.isFinite(v.duration)) v.currentTime = t;
  }

  setMouse(x: number, y: number) {
    const r = this.canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    this.mouse = [x / r.width, 1 - y / r.height];
  }

  onParamsChanged() {
    this.processedDirty = true;
  }

  resamplePalette() {
    this.paletteDirty = true;
  }

  private maybeExtractPalette() {
    if (!this.paletteDirty) return;
    const s = this.source;
    if (!s) return;
    let el: CanvasImageSource;
    let w: number;
    let h: number;
    if (s.kind === "procedural") {
      el = s.canvas;
      w = s.canvas.width;
      h = s.canvas.height;
    } else if (s.kind === "image") {
      if (!s.el.naturalWidth) return;
      el = s.el;
      w = s.el.naturalWidth;
      h = s.el.naturalHeight;
    } else {
      if (s.el.readyState < 2 || !s.el.videoWidth) return;
      el = s.el;
      w = s.el.videoWidth;
      h = s.el.videoHeight;
    }
    this.paletteDirty = false;
    try {
      const colors = extractPalette(el, w, h, 8);
      if (colors.length >= 2) useStudioStore.getState().setImagePalette(colors);
    } catch {
      // Tainted source — keep the current palette.
    }
  }

  resize(cssW: number, cssH: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.dpr = dpr;
    const w = Math.max(2, Math.round(cssW * dpr));
    const h = Math.max(2, Math.round(cssH * dpr));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    const s = this.source;
    if (s?.kind === "procedural") {
      s.canvas.width = w;
      s.canvas.height = h;
      this.srcRes = [w, h];
    }
    this.processedDirty = true;
  }

  // ── Error-diffusion worker pipeline ──────────────────────────────────────
  private maybeProcess(now: number) {
    const st = useStudioStore.getState();
    if (st.effect !== "dither") return;
    const isError = st.dither.algorithm === "floyd-steinberg" || st.dither.algorithm === "atkinson";
    if (!isError || !this.worker || !this.source) return;
    const dynamic = !this.sourceStatic;
    if (!this.processedDirty && !(dynamic && now - this.processedLast > 120)) return;
    if (this.workerBusy) return;

    const srcCanvas = this.getSourceCanvas();
    if (!srcCanvas || srcCanvas.width < 2) return;

    const px = Math.max(1, st.dither.pixelSize * this.dpr);
    const bw = Math.min(420, Math.max(16, Math.round(this.canvas.width / px)));
    const bh = Math.max(16, Math.round((bw * this.canvas.height) / this.canvas.width));
    this.workCanvas.width = bw;
    this.workCanvas.height = bh;
    const ctx = this.workCanvas.getContext("2d", { willReadFrequently: true })!;
    // Cover-fit crop identical to the shader's coverUv.
    const sw = srcCanvas.width, sh = srcCanvas.height;
    const scale = Math.max(bw / sw, bh / sh);
    const dw = sw * scale, dh = sh * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(srcCanvas, (bw - dw) / 2, (bh - dh) / 2, dw, dh);
    const img = ctx.getImageData(0, 0, bw, bh);
    const palette = getPaletteColors(st.paletteId, st.customColors, st.imagePalette).slice(0, 8).map(hexToRgb255);
    this.workerBusy = true;
    this.processedDirty = false;
    this.processedLast = now;
    this.jobId++;
    this.worker.postMessage(
      {
        id: this.jobId,
        width: bw,
        height: bh,
        data: img.data,
        algorithm: st.dither.algorithm,
        palette,
        invert: st.dither.invert,
        contrast: st.preprocess.contrast,
        brightness: st.preprocess.brightness,
        gamma: st.preprocess.gamma,
      },
      [img.data.buffer],
    );
  }

  private onWorkerResult(res: { id: number; width: number; height: number; data: Uint8ClampedArray }) {
    this.workerBusy = false;
    if (this.destroyed || res.id !== this.jobId) return;
    this.processedCanvas.width = res.width;
    this.processedCanvas.height = res.height;
    this.processedCanvas.getContext("2d")!.putImageData(new ImageData(res.data, res.width, res.height), 0, 0);
    this.upload(this.texProcessed, 2, this.processedCanvas);
    this.processedReady = true;
  }

  // ── Frame loop ───────────────────────────────────────────────────────────
  private loop() {
    if (this.destroyed) return;
    this.schedule();
    const now = performance.now();
    const t = (now - this.start) / 1000;
    const gl = this.gl;
    const s = this.source;

    if (s?.kind === "procedural") {
      s.gen(s.ctx, s.canvas.width, s.canvas.height, t);
      this.upload(this.texSource, 0, s.canvas);
    } else if (s && (s.kind === "video" || s.kind === "webcam")) {
      if (s.el.readyState >= 2) this.upload(this.texSource, 0, s.el);
    } else if (s?.kind === "image" && !this.sourceUploaded) {
      this.upload(this.texSource, 0, s.el);
      this.sourceUploaded = true;
    }

    this.maybeExtractPalette();
    this.maybeProcess(now);

    const st = useStudioStore.getState();
    const info = this.programs.get(st.effect)!;
    gl.useProgram(info.program);

    const palette = getPaletteColors(st.paletteId, st.customColors, st.imagePalette).slice(0, 8);
    const paletteFlat = palette.flatMap(hexToRgb);
    while (paletteFlat.length < 24) paletteFlat.push(0, 0, 0);

    const common: Record<string, UVal> = {
      u_tex: { t: "1i", v: 0 },
      u_atlas: { t: "1i", v: 1 },
      u_processedTex: { t: "1i", v: 2 },
      u_resolution: { t: "2f", v: [this.canvas.width, this.canvas.height] },
      u_srcRes: { t: "2f", v: this.srcRes },
      u_time: { t: "1f", v: t },
      u_mouse: { t: "2f", v: this.mouse },
      u_compareMode: { t: "1i", v: st.viewportMode === "canvas" ? (COMPARE_INT[st.comparisonMode] ?? 0) : 0 },
      u_splitPos: { t: "1f", v: st.splitPosition },
      u_loupeRadius: { t: "1f", v: 130 * this.dpr },
      u_bypass: { t: "1i", v: st.viewportMode === "canvas" && st.isHoldingBypass ? 1 : 0 },
      u_contrast: { t: "1f", v: st.preprocess.contrast },
      u_brightness: { t: "1f", v: st.preprocess.brightness },
      u_gamma: { t: "1f", v: st.preprocess.gamma },
    };

    let specific: Record<string, UVal> = {};
    if (st.effect === "dither") {
      const bayerSize = st.dither.algorithm === "bayer2" ? 2 : st.dither.algorithm === "bayer4" ? 4 : 8;
      const isError = st.dither.algorithm === "floyd-steinberg" || st.dither.algorithm === "atkinson";
      specific = {
        u_bayerSize: { t: "1i", v: bayerSize },
        u_pixelSize: { t: "1f", v: st.dither.pixelSize * this.dpr },
        u_palette: { t: "3fv", v: paletteFlat },
        u_paletteSize: { t: "1i", v: palette.length },
        u_spread: { t: "1f", v: st.dither.spread },
        u_invert: { t: "1i", v: st.dither.invert ? 1 : 0 },
        u_useProcessed: { t: "1i", v: isError && this.processedReady ? 1 : 0 },
      };
    } else if (st.effect === "ascii") {
      const atlas = getAsciiAtlas(st.ascii.charset);
      if (this.atlasCharset !== st.ascii.charset) {
        this.upload(this.texAtlas, 1, atlas.canvas);
        this.atlasCharset = st.ascii.charset;
      }
      specific = {
        u_charCount: { t: "1f", v: atlas.count },
        u_cellSize: { t: "1f", v: st.ascii.cellSize * this.dpr },
        u_colorMode: { t: "1i", v: st.ascii.colorMode ? 1 : 0 },
        u_tint: { t: "3f", v: hexToRgb(st.ascii.tint) },
        u_invert: { t: "1i", v: st.ascii.invert ? 1 : 0 },
      };
    } else if (st.effect === "halftone") {
      const hp = st.halftone;
      specific = {
        u_dotSize: { t: "1f", v: hp.dotSize * this.dpr },
        u_angle: { t: "1f", v: hp.angle },
        u_mode: { t: "1i", v: hp.mode === "cmyk" ? 0 : hp.mode === "duotone" ? 1 : 2 },
        u_shape: { t: "1i", v: hp.shape === "dot" ? 0 : hp.shape === "line" ? 1 : 2 },
        u_registration: { t: "2f", v: [hp.registrationX, hp.registrationY] },
        u_grain: { t: "1f", v: hp.grain },
        u_paper: { t: "3f", v: hexToRgb(hp.paper) },
        u_inkC: { t: "3f", v: hexToRgb(hp.inkC) },
        u_inkM: { t: "3f", v: hexToRgb(hp.inkM) },
        u_inkY: { t: "3f", v: hexToRgb(hp.inkY) },
        u_inkK: { t: "3f", v: hexToRgb(hp.inkK) },
        u_duoA: { t: "3f", v: hexToRgb(hp.duotoneA) },
        u_duoB: { t: "3f", v: hexToRgb(hp.duotoneB) },
      };
    } else {
      const mp = st.mesh;
      const [colA, colB, colC, colD] = resolveMeshColors(mp, st.imagePalette);
      specific = {
        u_colA: { t: "3f", v: hexToRgb(colA) },
        u_colB: { t: "3f", v: hexToRgb(colB) },
        u_colC: { t: "3f", v: hexToRgb(colC) },
        u_colD: { t: "3f", v: hexToRgb(colD) },
        u_scale: { t: "1f", v: mp.scale },
        u_warp: { t: "1f", v: mp.warp },
        u_speed: { t: "1f", v: mp.speed },
        u_grain: { t: "1f", v: mp.grain },
        u_sourceInfluence: { t: "1f", v: mp.sourceInfluence },
      };
    }

    this.setUniforms(info, { ...common, ...specific });
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // FPS + playback telemetry (throttled).
    this.frames++;
    if (now - this.fpsLast >= 500) {
      st.setFps(Math.round((this.frames * 1000) / (now - this.fpsLast)));
      this.frames = 0;
      this.fpsLast = now;
    }
    const v = this.videoElement;
    if (v && now - this.playbackLast > 250) {
      this.playbackLast = now;
      st.setPlayback({ currentTime: v.currentTime, duration: Number.isFinite(v.duration) ? v.duration : 0 });
    }
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.pump?.port1.close();
    this.pump?.port2.close();
    this.pump = null;
    this.worker?.terminate();
    const v = this.videoElement;
    if (v) {
      v.pause();
      if (v.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach((tr) => tr.stop());
        v.srcObject = null;
      }
    }
    // Delete resources but keep the context alive: React StrictMode remounts
    // effects on the same canvas, and getContext would return a lost context.
    const gl = this.gl;
    for (const info of this.programs.values()) gl.deleteProgram(info.program);
    gl.deleteTexture(this.texSource);
    gl.deleteTexture(this.texAtlas);
    gl.deleteTexture(this.texProcessed);
    if (this.quadBuf) gl.deleteBuffer(this.quadBuf);
    this.programs.clear();
  }
}

let current: StudioRenderer | null = null;
export function setRendererHandle(r: StudioRenderer | null) { current = r; }
export function getRendererHandle(): StudioRenderer | null { return current; }