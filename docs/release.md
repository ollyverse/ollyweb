# Release process

Releases are **git tags** `vMAJOR.MINOR.PATCH` ([semver](https://semver.org)). Pushing a tag builds the
multi-arch image and pushes it to **ghcr.io**; Kubernetes then runs that exact version.
Pushes to `main` never publish an image.

| You push | Image tags in `ghcr.io/ollyverse/ollyweb` |
|---|---|
| `v1.4.2` | `1.4.2`, `1.4`, `1`, `latest` |

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

## 3. Watch the image build

```sh
gh run watch "$(gh run list --workflow image.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

Or: GitHub → Actions → **Container image**. When it's green the image is at
`ghcr.io/ollyverse/ollyweb:$VERSION` (org → Packages → ollyweb).

## 4. (Optional) GitHub release notes

```sh
gh release create "v$VERSION" --generate-notes
```

## 5. Verify the published image

```sh
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-user> --password-stdin   # token with read:packages
docker pull ghcr.io/ollyverse/ollyweb:$VERSION
docker run --rm -p 8080:8080 ghcr.io/ollyverse/ollyweb:$VERSION
curl -fsS localhost:8080/ >/dev/null && echo OK
```

## 6. Deploy to Kubernetes

The cluster manifests are not in this repo; adjust `NS` / names to yours.

One-time: a pull secret, because the package is private.

```sh
NS=ollyverse
kubectl -n $NS create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io --docker-username=<github-user> --docker-password=<token with read:packages>
# reference it from the Deployment: spec.template.spec.imagePullSecrets: [{ name: ghcr-pull }]
```

Container facts for the manifest: port **8080**, non-root (uid 101), `GET /` → 200 for liveness/readiness,
no env vars or volumes needed.

Roll out the new version (pin the exact tag, not `latest`):

```sh
kubectl -n $NS set image deployment/ollyweb ollyweb=ghcr.io/ollyverse/ollyweb:$VERSION
kubectl -n $NS rollout status deployment/ollyweb
```

(If the deployment is managed by GitOps / Helm, change the image tag there instead.)

## Rollback

```sh
kubectl -n $NS rollout undo deployment/ollyweb
# or pin the previous version explicitly
kubectl -n $NS set image deployment/ollyweb ollyweb=ghcr.io/ollyverse/ollyweb:<previous-version>
```

Then fix forward on `main` and cut a new **patch** release.

## Mistakes

- **Tagged the wrong commit, image not deployed yet:** delete the tag and re-tag.
  ```sh
  git tag -d "v$VERSION" && git push origin --delete "v$VERSION"
  ```
  The already pushed image stays in ghcr.io — delete that version in Packages, or simply never reuse the
  number and release the next patch instead (preferred).
- **Build failed:** fix on `main`, then release the next patch version. Don't move an existing tag.

## Hotfix

Same flow: fix on `main` (PR, CI green), tag the next patch (`v1.4.3`), roll out.
