# Kubernetes (Helm chart)

The chart lives in [`charts/ollyweb`](../charts/ollyweb) and is published as an **OCI artifact** to ghcr.io on
every release, next to the image:

| Artifact | Where | Version |
|---|---|---|
| image | `ghcr.io/ollyverse/ollyweb` | `X.Y.Z` |
| chart | `oci://ghcr.io/ollyverse/charts/ollyweb` | `X.Y.Z` (appVersion `X.Y.Z` → runs image `X.Y.Z`) |

One version number for both: chart `1.4.2` deploys image `1.4.2` unless you override `image.tag`.

## What it creates

| Resource | Notes |
|---|---|
| Deployment | 2 replicas, non-root (uid 101), read-only root FS + `emptyDir` on `/tmp`, all capabilities dropped, `RuntimeDefault` seccomp, no service-account token, liveness/readiness on `GET /` |
| Service | `ClusterIP`, port 80 → container 8080 |
| Ingress | off by default (`ingress.enabled`) |
| PodDisruptionBudget | `minAvailable: 1` when `replicaCount > 1` |

## Access to ghcr.io

Both the chart and the image are private packages (the repo is private).

```sh
# helm, to pull the chart (token with read:packages)
echo "$GHCR_TOKEN" | helm registry login ghcr.io -u <github-user> --password-stdin

# cluster, to pull the image — once per namespace
NS=ollyverse
kubectl create namespace $NS
kubectl -n $NS create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io --docker-username=<github-user> --docker-password="$GHCR_TOKEN"
```

## Install / upgrade

```sh
VERSION=1.4.2
helm upgrade --install ollyweb oci://ghcr.io/ollyverse/charts/ollyweb \
  --version "$VERSION" -n $NS \
  --set 'imagePullSecrets[0].name=ghcr-pull' \
  --wait
```

With an ingress, keep your settings in a values file (e.g. in your infra repo):

```yaml
# values-prod.yaml
imagePullSecrets:
  - name: ghcr-pull
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  hosts:
    - host: ollyverse.com
      paths: [{ path: /, pathType: Prefix }]
  tls:
    - secretName: ollyverse-com-tls
      hosts: [ollyverse.com]
```

```sh
helm upgrade --install ollyweb oci://ghcr.io/ollyverse/charts/ollyweb --version "$VERSION" -n $NS -f values-prod.yaml --wait
```

## Inspect, roll back, remove

```sh
helm show values oci://ghcr.io/ollyverse/charts/ollyweb --version "$VERSION"   # all options
helm -n $NS history ollyweb
helm -n $NS rollback ollyweb            # previous revision (or: rollback ollyweb <revision>)
helm -n $NS uninstall ollyweb
```

## Values

| Key | Default | |
|---|---|---|
| `replicaCount` | `2` | |
| `image.repository` | `ghcr.io/ollyverse/ollyweb` | |
| `image.tag` | `""` → chart `appVersion` | pin only to run a different image than the chart version |
| `image.pullPolicy` | `IfNotPresent` | |
| `imagePullSecrets` | `[]` | needed for the private image, e.g. `[{name: ghcr-pull}]` |
| `service.type` / `service.port` | `ClusterIP` / `80` | |
| `ingress.*` | disabled | `className`, `annotations`, `hosts`, `tls` |
| `resources` | req 10m CPU / 16Mi, limit 64Mi | static files, nginx needs very little |
| `podDisruptionBudget.enabled` / `.minAvailable` | `true` / `1` | |
| `podAnnotations`, `podLabels`, `nodeSelector`, `tolerations`, `affinity`, `topologySpreadConstraints` | empty | |

## Working on the chart

```sh
helm lint --strict charts/ollyweb
helm template t charts/ollyweb --set ingress.enabled=true | kubeconform -strict -summary
```

Full local test with [kind](https://kind.sigs.k8s.io):

```sh
kind create cluster --name ollyweb
docker build -t ghcr.io/ollyverse/ollyweb:0.0.0-dev .          # chart's dev appVersion
kind load docker-image ghcr.io/ollyverse/ollyweb:0.0.0-dev --name ollyweb
helm install ollyweb charts/ollyweb -n ollyverse --create-namespace --wait
kubectl -n ollyverse port-forward svc/ollyweb 8080:80           # http://localhost:8080
kind delete cluster --name ollyweb
```

`Chart.yaml` keeps `version`/`appVersion` at `0.0.0-dev`; the release workflow sets both from the tag.
Bump the chart's templates freely — it is released together with the app.
