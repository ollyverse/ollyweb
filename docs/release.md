# Release process

Releases are **git tags** `vMAJOR.MINOR.PATCH` ([semver](https://semver.org)). Pushing a tag runs the
**Release** workflow, which publishes to **ghcr.io**, in this order:

1. the multi-arch **image**,
2. the **Helm chart** as an OCI artifact — only if the image succeeded,
3. the **GitHub Release** page for the tag — only if both exist; it lists the image and chart and adds
   auto-generated notes (merged PRs / commits since the previous tag). Tags with a suffix
   (`v1.3.0-rc.1`) become pre-releases.

Pushes to `main` never publish anything.

| You push | Image `ghcr.io/ollyverse/ollyweb` | Chart `oci://ghcr.io/ollyverse/charts/ollyweb` |
|---|---|---|
| `v1.4.2` | `1.4.2`, `1.4`, `1`, `latest` | version `1.4.2`, appVersion `1.4.2` |

Chart and app share one version, so "deploy 1.4.2" means the chart 1.4.2, which runs image 1.4.2.

Which number to bump: **patch** for fixes and copy tweaks, **minor** for new features (a section, an enemy,
a language), **major** for something visitors would call a new site.

## 1. Make sure `main` is ready

```sh
git switch main
git pull --ff-only
npm ci
npm run check          # 0 errors, 0 warnings
npm run build
gh run list --workflow ci.yml --branch main --limit 1     # last CI on main must be ✓
git tag --sort=-v:refname | head -5                       # current versions
```

Optional smoke test of the exact image:

```sh
docker build -t ollyweb:rc .
docker run --rm -p 8080:8080 ollyweb:rc     # open http://localhost:8080 and /sk/
```

## 2. Tag and push

```sh
VERSION=1.4.2
git tag -a "v$VERSION" -m "v$VERSION"
git push origin "v$VERSION"
```

## 3. Watch the release

```sh
gh run watch "$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

Or: GitHub → Actions → **Release** (jobs `image` → `chart` → `github-release`). When it's green you have
`ghcr.io/ollyverse/ollyweb:$VERSION`, `oci://ghcr.io/ollyverse/charts/ollyweb` version `$VERSION`
(org → Packages) and the release page:

## 4. Check the release page

```sh
gh release view "v$VERSION" --web
```

Edit the notes there if you want a human summary on top.

## 5. Verify what was published

```sh
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-user> --password-stdin          # token with read:packages
echo "$GHCR_TOKEN" | helm registry login ghcr.io -u <github-user> --password-stdin

docker run --rm -p 8080:8080 ghcr.io/ollyverse/ollyweb:$VERSION                       # open http://localhost:8080
helm show chart oci://ghcr.io/ollyverse/charts/ollyweb --version $VERSION             # version + appVersion = $VERSION
helm template ollyweb oci://ghcr.io/ollyverse/charts/ollyweb --version $VERSION | grep image:
```

## 6. Deploy to Kubernetes

One-time per namespace (the packages are private):

```sh
NS=ollyverse
kubectl create namespace $NS
kubectl -n $NS create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io --docker-username=<github-user> --docker-password="$GHCR_TOKEN"
```

Every release:

```sh
helm upgrade --install ollyweb oci://ghcr.io/ollyverse/charts/ollyweb \
  --version "$VERSION" -n $NS -f values-prod.yaml --wait
kubectl -n $NS rollout status deployment/ollyweb
```

`values-prod.yaml` (pull secret, ingress host, TLS) and every chart option: [kubernetes.md](kubernetes.md).
With GitOps (Argo CD / Flux) point the app at the OCI chart and bump `version` there instead.

## Rollback

```sh
helm -n $NS history ollyweb
helm -n $NS rollback ollyweb               # previous revision
# or install an older release explicitly
helm upgrade --install ollyweb oci://ghcr.io/ollyverse/charts/ollyweb --version <previous> -n $NS -f values-prod.yaml --wait
```

Then fix forward on `main` and cut a new **patch** release.

## Mistakes

- **Tagged the wrong commit, image not deployed yet:** delete the tag and re-tag.
  ```sh
  git tag -d "v$VERSION" && git push origin --delete "v$VERSION"
  ```
  The already pushed image/chart stay in ghcr.io — delete those versions in Packages, or simply never reuse
  the number and release the next patch instead (preferred).
- **Image job failed:** nothing was published (the chart waits for the image). Fix on `main`, release the next patch.
- **Chart job failed after the image was pushed:** fix, then either re-run the failed job (Actions → Re-run failed
  jobs) or release the next patch. Don't move an existing tag.
- **Only `github-release` failed:** re-run that job, or create the page by hand:
  `gh release create "v$VERSION" --verify-tag --generate-notes`.

## Hotfix

Same flow: fix on `main` (PR, CI green), tag the next patch (`v1.4.3`), roll out.
