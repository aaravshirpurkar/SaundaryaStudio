"use client";

import type { StudioState } from "@/store/useStudioStore";
import { getPaletteColors, hexToRgb, resolveMeshColors } from "@/data/palettes";
import { VERTEX_SHADER } from "@/engine/shaders/vertex";
import { DITHER_FRAG } from "@/engine/shaders/dither.frag";
import { ASCII_FRAG } from "@/engine/shaders/ascii.frag";
import { HALFTONE_FRAG } from "@/engine/shaders/halftoneRiso.frag";
import { MESH_FRAG } from "@/engine/shaders/noisyMesh.frag";
import { CHARSETS } from "@/engine/asciiAtlas";

const FRAGS = { dither: DITHER_FRAG, ascii: ASCII_FRAG, halftone: HALFTONE_FRAG, mesh: MESH_FRAG };

const f = (n: number) => {
  const s = n.toFixed(4).replace(/0+$/, "").replace(/\.$/, ".0");
  return s.includes(".") ? s : s + ".0";
};

function uniformLines(s: StudioState): string[] {
  const lines: string[] = [];
  const u1 = (n: string, v: number) => lines.push(`  gl.uniform1f(U(gl, prog, "${n}"), ${f(v)});`);
  const i1 = (n: string, v: number) => lines.push(`  gl.uniform1i(U(gl, prog, "${n}"), ${v});`);
  const u3 = (n: string, hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    lines.push(`  gl.uniform3f(U(gl, prog, "${n}"), ${f(r)}, ${f(g)}, ${f(b)});`);
  };
  i1("u_tex", 0);
  i1("u_atlas", 1);
  i1("u_processedTex", 2);
  i1("u_compareMode", 0);
  i1("u_bypass", 0);
  u1("u_splitPos", 0.5);
  u1("u_loupeRadius", 130);
  u1("u_contrast", s.preprocess.contrast);
  u1("u_brightness", s.preprocess.brightness);
  u1("u_gamma", s.preprocess.gamma);

  if (s.effect === "dither") {
    const palette = getPaletteColors(s.paletteId, s.customColors, s.imagePalette).slice(0, 8);
    const flat = palette.flatMap(hexToRgb);
    while (flat.length < 24) flat.push(0, 0, 0);
    const bayer = s.dither.algorithm === "bayer2" ? 2 : s.dither.algorithm === "bayer4" ? 4 : 8;
    i1("u_bayerSize", bayer);
    u1("u_pixelSize", s.dither.pixelSize);
    lines.push(`  gl.uniform3fv(U(gl, prog, "u_palette"), new Float32Array([${flat.map(f).join(", ")}]));`);
    i1("u_paletteSize", palette.length);
    u1("u_spread", s.dither.spread);
    i1("u_invert", s.dither.invert ? 1 : 0);
    i1("u_useProcessed", 0);
  } else if (s.effect === "ascii") {
    u1("u_charCount", CHARSETS[s.ascii.charset].length);
    u1("u_cellSize", s.ascii.cellSize);
    i1("u_colorMode", s.ascii.colorMode ? 1 : 0);
    u3("u_tint", s.ascii.tint);
    i1("u_invert", s.ascii.invert ? 1 : 0);
  } else if (s.effect === "halftone") {
    const hp = s.halftone;
    u1("u_dotSize", hp.dotSize);
    u1("u_angle", hp.angle);
    i1("u_mode", hp.mode === "cmyk" ? 0 : hp.mode === "duotone" ? 1 : 2);
    i1("u_shape", hp.shape === "dot" ? 0 : hp.shape === "line" ? 1 : 2);
    lines.push(`  gl.uniform2f(U(gl, prog, "u_registration"), ${f(hp.registrationX)}, ${f(hp.registrationY)});`);
    u1("u_grain", hp.grain);
    u3("u_paper", hp.paper);
    u3("u_inkC", hp.inkC);
    u3("u_inkM", hp.inkM);
    u3("u_inkY", hp.inkY);
    u3("u_inkK", hp.inkK);
    u3("u_duoA", hp.duotoneA);
    u3("u_duoB", hp.duotoneB);
  } else {
    const mp = s.mesh;
    const [colA, colB, colC, colD] = resolveMeshColors(mp, s.imagePalette);
    u3("u_colA", colA);
    u3("u_colB", colB);
    u3("u_colC", colC);
    u3("u_colD", colD);
    u1("u_scale", mp.scale);
    u1("u_warp", mp.warp);
    u1("u_speed", mp.speed);
    u1("u_grain", mp.grain);
    u1("u_sourceInfluence", mp.sourceInfluence);
  }
  return lines;
}

export interface ReactExportOptions {
  state: StudioState;
  mediaSrc: string; // http(s) URL or data URL
  mediaIsVideo: boolean;
  atlasDataUrl: string | null; // ascii glyph atlas
}

export function exportReactComponent({ state, mediaSrc, mediaIsVideo, atlasDataUrl }: ReactExportOptions): string {
  const frag = FRAGS[state.effect];
  const isErrorDither =
    state.effect === "dither" &&
    (state.dither.algorithm === "floyd-steinberg" || state.dither.algorithm === "atkinson");
  const palette255 = getPaletteColors(state.paletteId, state.customColors, state.imagePalette)
    .slice(0, 8)
    .map((h) => hexToRgb(h).map((v) => Math.round(v * 255)));

  const edCode = isErrorDiffusionBlock(state, mediaIsVideo);
  const edCall = isErrorDither
    ? mediaIsVideo
      ? `if (now - lastED > 120) { lastED = now; runErrorDiffusion(video, video.videoWidth, video.videoHeight); }`
      : `if (lastED === 0) { lastED = 1; runErrorDiffusion(img, img.naturalWidth, img.naturalHeight); }`
    : "";

  const mediaSetup = mediaIsVideo
    ? `const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true; video.loop = true; video.playsInline = true;
  video.src = MEDIA_SRC;
  const srcEl: TexImageSource = video;
  const srcSize = (): [number, number] => [video.videoWidth || 1, video.videoHeight || 1];
  video.play().catch(() => {});`
    : `const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = MEDIA_SRC;
  const srcEl: TexImageSource = img;
  const srcSize = (): [number, number] => [img.naturalWidth || 1, img.naturalHeight || 1];`;

  const atlasSetup =
    state.effect === "ascii" && atlasDataUrl
      ? `const atlasImg = new Image();
  atlasImg.src = ${JSON.stringify(atlasDataUrl)};
  atlasImg.onload = () => {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasImg);
  };`
      : "";

  return `"use client";
// Generated by Saundarya Studio v0.1.0 — self-contained WebGL2 effect component.
// Effect: ${state.effect.toUpperCase()} · drop into any React 18+ app. No dependencies.
import { useEffect, useRef, type CSSProperties } from "react";

const MEDIA_SRC = ${JSON.stringify(mediaSrc)};

const VERT = \`${VERTEX_SHADER}\`;

const FRAG = \`${frag}\`;

const U = (gl: WebGL2RenderingContext, prog: WebGLProgram, name: string) =>
  gl.getUniformLocation(prog, name);

function applyStaticUniforms(gl: WebGL2RenderingContext, prog: WebGLProgram) {
${uniformLines(state).join("\n")}
}

export default function SaundaryaCanvas({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
    if (!gl) return;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader error");
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const makeTex = (unit: number, filter: number) => {
      const tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    const srcTex = makeTex(0, gl.LINEAR);
    const atlasTex = makeTex(1, gl.LINEAR);
    makeTex(2, gl.NEAREST);
    ${mediaSetup}
    ${atlasSetup}

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U(gl, prog, "u_resolution"), canvas.width, canvas.height);
      const [sw, sh] = srcSize();
      gl.uniform2f(U(gl, prog, "u_srcRes"), sw, sh);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    ${edCode}

    applyStaticUniforms(gl, prog);
    let raf = 0;
    const start = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const [sw, sh] = srcSize();
      if (sw > 1) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, srcTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcEl);
        gl.uniform2f(U(gl, prog, "u_srcRes"), sw, sh);
        ${edCall}
      }
      gl.uniform1f(U(gl, prog, "u_time"), (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      ${mediaIsVideo ? "video.pause();" : ""}
      gl.deleteProgram(prog);
      gl.deleteTexture(srcTex);
      gl.deleteTexture(atlasTex);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: "100%", height: "100%", display: "block", ...style }}
    />
  );
}
`;
}

function isErrorDiffusionBlock(state: StudioState, mediaIsVideo: boolean): string {
  const isError =
    state.effect === "dither" &&
    (state.dither.algorithm === "floyd-steinberg" || state.dither.algorithm === "atkinson");
  if (!isError) return "";
  const palette255 = getPaletteColors(state.paletteId, state.customColors, state.imagePalette)
    .slice(0, 8)
    .map((h) => hexToRgb(h).map((v) => Math.round(v * 255)));
  const kernel =
    state.dither.algorithm === "atkinson"
      ? "[[1,0],[2,0],[-1,1],[0,1],[1,1],[0,2]].map(([x,y]) => [x,y,1/8] as [number,number,number])"
      : "[[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]] as [number,number,number][]";
  void mediaIsVideo;
  return `
  // ── Error-diffusion (${state.dither.algorithm}) on a downscaled CPU copy ──
  const PALETTE: number[][] = ${JSON.stringify(palette255)};
  const procCanvas = document.createElement("canvas");
  const procTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, procTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const runErrorDiffusion = (src: CanvasImageSource, sw: number, sh: number) => {
    const bw = Math.min(360, Math.max(16, Math.round(canvas.width / ${Math.max(1, state.dither.pixelSize)})));
    const bh = Math.max(16, Math.round((bw * canvas.height) / canvas.width));
    procCanvas.width = bw; procCanvas.height = bh;
    const c2 = procCanvas.getContext("2d", { willReadFrequently: true })!;
    const sc = Math.max(bw / sw, bh / sh);
    c2.drawImage(src, (bw - sw * sc) / 2, (bh - sh * sc) / 2, sw * sc, sh * sc);
    const img = c2.getImageData(0, 0, bw, bh);
    const d = img.data;
    const kernel: [number, number, number][] = ${kernel};
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = (y * bw + x) * 4;
      const old = [d[i], d[i + 1], d[i + 2]];
      let best = Infinity, q = PALETTE[0];
      for (const p of PALETTE) {
        const dd = (old[0] - p[0]) ** 2 * 0.299 + (old[1] - p[1]) ** 2 * 0.587 + (old[2] - p[2]) ** 2 * 0.114;
        if (dd < best) { best = dd; q = p; }
      }
      d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2];
      for (const [dx, dy, w] of kernel) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= bw || ny >= bh) continue;
        const j = (ny * bw + nx) * 4;
        for (let ch = 0; ch < 3; ch++) d[j + ch] = Math.max(0, Math.min(255, d[j + ch] + (old[ch] - q[ch]) * w));
      }
    }
    c2.putImageData(img, 0, 0);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, procTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, procCanvas);
    gl.uniform1i(U(gl, prog, "u_useProcessed"), 1);
  };
  let lastED = 0;`;
}

export function exportGlsl(state: StudioState): string {
  return `// Saundarya Studio — ${state.effect.toUpperCase()} fragment shader (WebGL2 / GLSL ES 3.00)\n${FRAGS[state.effect]}`;
}