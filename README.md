# Saundarya Studio

**Beautiful images, for free, forever.**

A 100% client-side visual-effects studio that turns any image, video, or webcam
feed into ordered dithers, ASCII art, risograph halftones, and noisy gradient
meshes — then exports the result as code, PNG, SVG, or a looping WebM.

Everything runs in your browser. There is no backend, no account, no upload, and
no tracking. Drop in a photo and the pixels never leave your machine.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Runtime](https://img.shields.io/badge/runs-100%25%20in%20the%20browser-2bb3a3.svg)

---

## What it does

Four real-time WebGL2 engines, all driven by live uniforms:

| Engine | What it produces |
| ------ | ---------------- |
| **Ordered dither** | Bayer 2×2/4×4/8×8 plus Floyd–Steinberg and Atkinson error diffusion (the last two run in a Web Worker). |
| **ASCII** | Character-mapped luminance with selectable glyphs, cell size, phosphor tint or full source colour. |
| **Halftone / Riso** | CMYK, duotone or mono separations with dot/line/ellipse screens, angle and registration offset. |
| **Noisy mesh** | Domain-warped gradient meshes sampled from, or linked to, the source palette. |

Beyond the canvas:

- **Source-palette extraction** — dither and mesh automatically sample the colours of the loaded media.
- **Before / after comparison** — split slider, side-by-side, and an X-ray loupe (hold `Space` to bypass live).
- **Export & "get code"** — download a PNG, a vector SVG, a WebM loop, or copy a self-contained component (see below).
- **Shareable presets** — the full parameter state serialises into a URL.

## Get the code you can actually ship

The **Export / Get Code** dialog generates a dependency-free `SaundaryaCanvas`
React component: the vertex and fragment shaders plus every uniform value for
your current settings are baked into a single file. It imports only `react`.

1. Open **Export / Get Code** in the studio and pick the **React · TSX** tab.
2. Click **COPY**.
3. Paste it into any React 18+ project as a component file, e.g.
   `components/SaundaryaCanvas.tsx`.
4. Render `<SaundaryaCanvas />` inside a sized container.

The other tabs emit the raw **GLSL** fragment shader (WebGL2 / GLSL ES 3.00) and a
standalone **ASCII · HTML** page. The image or a still frame is embedded as a data
URL, and remote video sources stay remote — so the exported component reproduces
what you saw without shipping the app.

## Tech stack

- [Next.js](https://nextjs.org) 14 (App Router) · [React](https://react.dev) 18
- TypeScript 5.6 (strict)
- Tailwind CSS 3.4 — hand-built components, no UI kit
- Zustand 4.5 state
- Raw **WebGL2** + GLSL (no three.js, no shader framework)
- Web Workers for CPU error-diffusion
- [Lucide](https://lucide.dev) icons

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (fully static export)
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
```

The app prerenders to static pages — deploy the output to any static host.

## Project layout

```
src/
  app/            # Next.js App Router: landing + /studio + global styles
  components/     # studio UI, landing page and shared controls
  engine/         # WebGL2 renderer, shaders, ASCII atlas, procedural sources
    workers/      # error-diffusion Web Worker
  exporters/      # React/GLSL/HTML/SVG/WebM generators
  store/          # Zustand studio state + preset serialisation
  data/           # asset library and colour palettes
  types/          # shared TypeScript types
```

## Browser support

Needs a browser with WebGL2 and Web Workers (Chrome, Edge, Firefox, Safari 15+).
The studio degrades gracefully to procedural sources when a media fetch fails.

## Contributing

Bug fixes, new engines and palette presets are welcome. See
[CONTRIBUTING.md](./CONTRIBUTING.md). By participating you agree to keep the
project client-side-only.

Please report security issues privately — see [SECURITY.md](./SECURITY.md).

## License

Released under the [MIT License](./LICENSE).
