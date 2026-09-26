# ollyverse.com

[![CI](https://github.com/ollyverse/ollyweb/actions/workflows/ci.yml/badge.svg)](https://github.com/ollyverse/ollyweb/actions/workflows/ci.yml)
[![Release](https://github.com/ollyverse/ollyweb/actions/workflows/release.yml/badge.svg)](https://github.com/ollyverse/ollyweb/actions/workflows/release.yml)

Landing page for the **Ollyverse** — a tiny universe run by Olly, one very fluffy, very black Pomeranian.
The page is a retro arcade: pixel-art Olly you can boop, and **Operation: Bone**, a maze game where Olly
hunts for his bone while a robot vacuum, a smug cat and bath time chase him.

Built with [Astro](https://astro.build): static output, no UI framework, the game is plain TypeScript on a `<canvas>`.
English and Slovak.

## Docs

- [Architecture](docs/architecture.md) · [Development](docs/development.md) · [Game design](docs/game.md)
- [Kubernetes / Helm](docs/kubernetes.md) · [CI/CD](docs/ci-cd.md) · [**Release process**](docs/release.md)
- AI agents: [AGENTS.md](AGENTS.md)

## Quick start

Requires Node **22.12+** (see `.nvmrc`).

```sh
npm install
npm run dev       # http://localhost:4321  (add --host to open it from your phone)
npm run check     # type-check .astro + .ts
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

In dev mode, `/?planet=5` starts a run on planet 5 — handy for testing later enemies.

## Project layout

| Path | What's inside |
|---|---|
| `src/pages/` | Routes: `/` (English) and `/sk/` (Slovak); both render `components/HomePage.astro` |
| `src/layouts/Base.astro` | `<head>`, meta/hreflang, starfield, header, footer, Slovak-browser redirect |
| `src/components/` | Page sections: `Hero`, `MazeGame`, `FieldGuide`, `SiteHeader`, `SiteFooter`, … |
| `src/i18n/ui.ts` | **All copy** (page + game) for every language |
| `src/game/maze.ts` | Maze generation and pathfinding |
| `src/game/enemies.ts` | Enemy sprites, speeds, which planet they appear on, how they chase |
| `src/game/game.ts` | Game loop, input (keyboard, touch, gamepad buttons), rendering |
| `src/lib/` | Pixel sprites (Olly, bone), 8-bit sound, safe `localStorage` |
| `src/styles/global.css` | Colour tokens and shared classes; everything is sized in `rem` and scales with the screen |

## The game in one paragraph

Olly (arrows/WASD, swipe or on-screen d-pad) must reach the bone on each planet. The maze stays small;
difficulty comes from enemies: **the Vroomba** (planet 1, slow, always takes the shortest path),
**the cat** (planet 2, faster, gets distracted), **bath time** (planet 3, a bubble that drifts through walls),
with reinforcements from planet 5. Olly has 3 lives, can **bark** (Space / tap the maze / BARK) to stun
nearby enemies and walk through them, and **sniff** (E / SNIFF) to see the way to the bone.
Tuning knobs live at the top of `src/game/game.ts` and in `KINDS` in `src/game/enemies.ts`.

## Languages

English lives at `/`, Slovak at `/sk/`. A first visit from a Slovak (or Czech) browser is sent to `/sk/`
unless the visitor already picked a language in the header.

To add a language:

1. add it to `languages` in `src/i18n/ui.ts` with a full dictionary (TypeScript will complain until every key is there),
2. add it to `i18n.locales` in `astro.config.mjs`,
3. create `src/pages/<code>/index.astro` rendering `<HomePage />`.

## Container image

A two-stage `Dockerfile` builds the site with Node and serves `dist/` with
[unprivileged nginx](https://hub.docker.com/r/nginxinc/nginx-unprivileged) on port **8080**
(non-root, with a healthcheck, long cache headers for hashed `/_astro/` assets). Works with Docker and Podman.

```sh
docker build -t ollyweb .
docker run --rm -p 8080:8080 ollyweb        # http://localhost:8080
```

Published images live in the **GitHub Container Registry**:

```sh
docker pull ghcr.io/ollyverse/ollyweb:latest
```

Images are pushed **only for release tags** — they are what the Kubernetes deployment pulls:

```sh
git tag v1.0.0 && git push origin v1.0.0
```

| Git tag | Image tags |
|---|---|
| `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest` |
| pull request | built as `pr-<n>` to check the Dockerfile, never pushed |

The repository is private, so the package is private too; pulling needs `docker login ghcr.io`
with a token that has `read:packages`. Images are built for `linux/amd64` and `linux/arm64`.

In Kubernetes, pin the exact version (`ghcr.io/ollyverse/ollyweb:1.2.3`) rather than `latest`, and give the
pods an `imagePullSecret` for ghcr.io (a token with `read:packages`) since the package is private.
The container listens on **8080**; `/` answers `200` and works for liveness/readiness probes.

## Helm chart

`charts/ollyweb` is released together with the image, as an OCI artifact in ghcr.io:

```sh
helm upgrade --install ollyweb oci://ghcr.io/ollyverse/charts/ollyweb --version 1.2.3 \
  -n ollyverse --set 'imagePullSecrets[0].name=ghcr-pull' --wait
```

Chart `1.2.3` runs image `1.2.3`. Values, ingress/TLS, rollback: [docs/kubernetes.md](docs/kubernetes.md).

## CI/CD (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | push to `main`, PRs | `npm ci`, `astro check`, `astro build`, `helm lint` |
| `release.yml` | `v*` tags, PRs | builds the multi-arch image; for `v*` tags pushes it, then the Helm chart to ghcr.io, then creates the GitHub Release |
| `pages.yml` | push to `main`, manual | deploys `dist/` to GitHub Pages — **off by default**, see below |

**Dependabot** (`.github/dependabot.yml`) checks daily and opens PRs for npm packages
(Astro packages grouped, dev tools grouped), GitHub Actions and the Docker base images.

### Turning on GitHub Pages (optional)

1. Settings → Pages → Source: **GitHub Actions** (Pages on a private repo needs a paid GitHub plan).
2. Settings → Secrets and variables → Actions → Variables: add `PAGES_ENABLED` = `true`.
3. Custom domain: Settings → Pages → `ollyverse.com`, then point DNS at GitHub Pages
   (`A`/`AAAA` records for the apex, see GitHub's Pages docs).

Any static host works as well (Cloudflare Pages, Netlify, …): build command `npm run build`, output `dist`.
