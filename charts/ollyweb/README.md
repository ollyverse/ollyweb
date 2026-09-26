# ollyweb

Helm chart for [ollyverse.com](https://ollyverse.com): a static site served by unprivileged nginx on port 8080.
Chart version = app version = image tag.

```sh
helm upgrade --install ollyweb oci://ghcr.io/ollyverse/charts/ollyweb --version <X.Y.Z> \
  -n ollyverse --set 'imagePullSecrets[0].name=ghcr-pull' --wait
```

The image is private on ghcr.io — create the pull secret first. All values and examples:
[docs/kubernetes.md](https://github.com/ollyverse/ollyweb/blob/main/docs/kubernetes.md).
