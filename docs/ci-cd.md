# CI/CD

All automation is GitHub Actions in `.github/workflows/`.

| Workflow | Runs on | Steps | Publishes |
|---|---|---|---|
| `ci.yml` | push to `main`, every PR | `npm ci` → `npm run check` → `npm run build` | nothing |
| `image.yml` | PRs, tags `v*` | multi-arch `docker build` (amd64 + arm64, GHA layer cache) | **only for `v*` tags** → `ghcr.io/ollyverse/ollyweb` |
| `pages.yml` | push to `main`, manual | build + deploy `dist/` to GitHub Pages | only if repo variable `PAGES_ENABLED=true` |

Notes:

- `image.yml` on a PR builds the image as `pr-<n>` to prove the `Dockerfile` still works (e.g. for Dependabot
  base-image bumps) and does not log in or push.
- It logs in to ghcr.io with the built-in `GITHUB_TOKEN` (`packages: write`); no extra secrets are needed.
- Tag → image tags mapping is in [release.md](release.md).
- Pushes to `main` never produce an image; Kubernetes only ever sees released versions.

## Dependabot

`.github/dependabot.yml` checks **daily**:

| Ecosystem | Grouping | Ignored on purpose |
|---|---|---|
| npm | `astro` + `@astrojs/*` together; dev dependencies together | TypeScript majors — `@astrojs/check` pins its TS peer range |
| GitHub Actions | all in one PR | — |
| Docker (`Dockerfile`) | per image | Node majors (stay on the LTS line of `.nvmrc`); nginx minors (odd = mainline) |

Dependabot PRs run `ci.yml` and `image.yml`; merge them when green. For the ignored ones, bump by hand
together with their partner (e.g. Node image + `.nvmrc` + `engines` in `package.json`).

## GitHub Pages (optional, off)

1. Settings → Pages → Source: **GitHub Actions** (private repos need a paid plan).
2. Settings → Secrets and variables → Actions → Variables: `PAGES_ENABLED = true`.
3. Settings → Pages → custom domain, then DNS.

Production is Kubernetes, so this stays off unless a preview host is wanted.
