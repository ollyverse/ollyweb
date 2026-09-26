# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Copilot, …) working in this repo.
Humans: start with [README.md](README.md) and [docs/](docs/README.md).

## What this is

`ollyweb` is the site for **ollyverse.com**: a single-page, retro-arcade landing page with a canvas maze game
(**Operation: Bone**) starring Olly, a black Pomeranian. Astro static site, TypeScript, no UI framework,
English (`/`) and Slovak (`/sk/`). Shipped as an nginx container image to ghcr.io and run in Kubernetes.

## Commands

```sh
npm ci              # install (Node 22.12+, see .nvmrc)
npm run dev         # http://localhost:4321 ; /?planet=5 jumps to planet 5 (dev only)
npm run check       # astro check: types for .astro + .ts — must be 0 errors, 0 warnings
npm run build       # static site into dist/
docker build -t ollyweb . && docker run --rm -p 8080:8080 ollyweb
```

## Where things live

- `src/i18n/ui.ts` — **every user-facing string**, page and game, per language
- `src/components/` — page sections; `HomePage.astro` composes the page for every locale
- `src/game/` — `maze.ts` (generation, BFS), `enemies.ts` (enemy kinds, roster, AI), `game.ts` (loop, input, render)
- `src/lib/` — `sprites.ts` (pixel-art char maps + `drawPixels`), `sound.ts` (WebAudio blips), `storage.ts`
- `deploy/nginx.conf`, `Dockerfile` — the runtime image
- `charts/ollyweb/` — Helm chart; released as OCI to `oci://ghcr.io/ollyverse/charts/ollyweb`
- `.github/workflows/` — `ci.yml`, `release.yml` (image + chart to ghcr.io on `v*` tags only), `pages.yml` (opt-in)
- Deeper explanations: [docs/architecture.md](docs/architecture.md), [docs/game.md](docs/game.md)

## Rules

- **Copy goes in `src/i18n/ui.ts`, in every language at once.** `sk` is typed as `typeof en`, so a missing
  key fails `npm run check`. Never hard-code visible text in components or game code.
- **Size with `rem`**, not `px` (the root font size is fluid, the whole page scales with the screen).
  Colours come from the tokens in `src/styles/global.css`.
- **Sprites are character maps** (`'..kk..'` rows + a palette). Draw them with `drawPixels`; keep the white
  sticker outline on dark sprites so they stay readable on the dark background.
- **Game tuning** lives in the constants at the top of `src/game/game.ts` and in `KINDS` in
  `src/game/enemies.ts`. Keep the game winnable: every enemy change must leave Olly an escape (bark, loops).
- **Mobile is a first-class target**: touch steering, the on-screen pad, and the cabinet fitting one screen
  (portrait and landscape). Check a phone viewport for any layout change.
- `localStorage` access goes through `store` (it can throw).
- No new runtime dependencies without a good reason; no UI framework.
- Do not bump TypeScript majors, the Node image major, or move nginx to a mainline (odd) minor on your own —
  see the ignore rules in `.github/dependabot.yml`.

## Before you say "done"

1. `npm run check` → 0 errors, 0 warnings.
2. `npm run build` succeeds.
3. For UI/game changes: look at it in a browser (desktop **and** a phone viewport), both `/` and `/sk/`.
4. If you touched `Dockerfile` or `deploy/`: build and run the image, `curl` `/`, `/sk/`, `/sk` (relative redirect).
5. If you touched `charts/`: `helm lint --strict charts/ollyweb` and `helm template … | kubeconform -strict`;
   for bigger changes install it into a `kind` cluster (see docs/kubernetes.md).
   Keep `version`/`appVersion` in `Chart.yaml` at `0.0.0-dev` — releases set them from the tag.

## Git

- Branch `main` is always deployable; CI must be green.
- Commit messages: imperative subject, short body with the why.
- **Do not add `Co-Authored-By` or other AI attribution trailers** to commits or PRs.
- Releases are git tags `vX.Y.Z` (image + chart, same version) — only a human cuts them. See [docs/release.md](docs/release.md).
