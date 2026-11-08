# Contributing to Saundarya Studio

Thanks for your interest! Saundarya Studio is a small, opinionated project, so a
few ground rules keep contributions easy to merge.

## The one non-negotiable rule

**Everything must stay 100% client-side.** No backend, no telemetry, no network
calls to our own servers, no accounts. Media never leaves the user's browser.
If a change would break that, it won't be merged.

## Get set up

```bash
git clone https://github.com/<your-username>/SaundaryaStudio.git
cd SaundaryaStudio
npm install
npm run dev
```

Before opening a PR, make sure these pass:

```bash
npm run typecheck
npm run build
```

## Where things live

- New visual effects go in `src/engine/shaders/` and are wired up in
  `src/engine/StudioRenderer.ts`, `src/store/useStudioStore.ts` and the studio UI.
- Export formats go in `src/exporters/`.
- Palettes and the demo asset library live in `src/data/`.

## Making a change

1. Branch from `main`: `git checkout -b feat/<short-name>`.
2. Keep diffs focused — one effect, fix or feature per PR.
3. Match the existing style: TypeScript strict, hand-built Tailwind components
   (there is no UI kit here), and raw WebGL2 rather than a 3D framework.
4. Add or update code only where the task requires it; avoid drive-by refactors.

## Opening a pull request

Fill in the template: what changed, why, and how you verified it in a browser.
Screenshots or short clips help a lot for visual work. A maintainer will review
and, once CI and review are green, squash-merge to `main`.

## Reporting issues

Use the issue tracker. Include the effect, the parameters, the browser and OS,
and a sample asset where relevant. For anything security-related, see
[SECURITY.md](./SECURITY.md) instead of opening a public issue.

By contributing you agree that your contributions are licensed under the
project's [MIT License](./LICENSE).
