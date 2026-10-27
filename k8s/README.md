# Kubernetes

Manifests for the whole app, applied with Kustomize: a namespace, PostgreSQL (StatefulSet + 5 Gi volume), the NestJS
backend, the web front end (nginx) and an Ingress.

```
Ingress ──> web (nginx, 2 pods) ──/api, /socket.io──> backend (1 pod) ──> postgres (StatefulSet)
```

## First deployment

```bash
kubectl apply -f k8s/namespace.yaml

# The secret is not in git. Use a URL-safe password: it ends up inside DATABASE_URL.
kubectl -n hellojess create secret generic hellojess-secrets \
  --from-literal=postgres-password="$(openssl rand -hex 16)" \
  --from-literal=secret-key="$(openssl rand -hex 32)"

kubectl apply -k k8s
kubectl -n hellojess rollout status deployment/backend deployment/web
```

Edit the host in `k8s/ingress.yaml` first. Check what the manifests render to with `kubectl kustomize k8s`.

## Releases

The pipeline in `.github/workflows/ci-cd.yml` does this on every push to `main`: after the tests pass it pushes the two
images to GitHub Container Registry tagged with the commit, applies these manifests, points the deployments at the new
tags and waits for the rollout. Rolling updates keep the old pods serving until the new ones are ready.

## Limits worth knowing

- The backend runs **one replica**. Real-time broadcasts live in the memory of the process, so scaling out needs the
  socket.io Redis adapter and sticky sessions first.
- The schema is created from the entities at start-up (`DB_SYNCHRONIZE=true`); there are no migrations yet.
