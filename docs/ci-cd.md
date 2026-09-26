# CI/CD

All automation is GitHub Actions in `.github/workflows/`.

| Workflow | Runs on | Steps | Publishes |
|---|---|---|---|
| `ci.yml` | push to `main`, every PR | site: `npm ci` → `npm run check` → `npm run build`; chart: `helm lint --strict` + `helm template` | nothing |
| `release.yml` | PRs, tags `v*` | job `image`: multi-arch `docker build` (amd64 + arm64, GHA cache); job `chart`: `helm package` + `helm push` (tags only, after `image`) | **only for `v*` tags** → image `ghcr.io/ollyverse/ollyweb`, chart `oci://ghcr.io/ollyverse/charts/ollyweb` |
| `pages.yml` | push to `main`, manual | build + deploy `dist/` to GitHub Pages | only if repo variable `PAGES_ENABLED=true` |

Notes:

- `release.yml` on a PR builds the image as `pr-<n>` to prove the `Dockerfile` still works (e.g. for Dependabot
  base-image bumps) and does not log in or push.
- It logs in to ghcr.io (docker and helm) with the built-in `GITHUB_TOKEN` (`packages: write`); no extra secrets.
- The chart gets `version` and `appVersion` from the tag (`v1.4.2` → `1.4.2`); `Chart.yaml` stays at `0.0.0-dev`.
- Tag → image tags mapping is in [release.md](release.md).
- Pushes to `main` never produce an image or chart; Kubernetes only ever sees released versions.

## Dependabot

`.github/dependabot.yml` checks **daily**:

| Ecosystem | Grouping | Ignored on purpose |
|---|---|---|
| npm | `astro` + `@astrojs/*` together; dev dependencies together | TypeScript majors — `@astrojs/check` pins its TS peer range |
| GitHub Actions | all in one PR | — |
| Docker (`Dockerfile`) | per image | Node majors (stay on the LTS line of `.nvmrc`); nginx minors (odd = mainline) |

Dependabot PRs run `ci.yml` and `release.yml` (build only); merge them when green. For the ignored ones, bump by hand
together with their partner (e.g. Node image + `.nvmrc` + `engines` in `package.json`).

## GitHub Pages (optional, off)

1. Settings → Pages → Source: **GitHub Actions** (private repos need a paid plan).
2. Settings → Secrets and variables → Actions → Variables: `PAGES_ENABLED = true`.
3. Settings → Pages → custom domain, then DNS.

Production is Kubernetes, so this stays off unless a preview host is wanted.
