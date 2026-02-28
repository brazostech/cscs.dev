# ADR 0008: Container Registry — Google Artifact Registry

**Status**: Accepted

**Date**: 2026-02-28

## Context

The PocketBase container image needs to be stored in a registry that the GCE VM can pull from. The team already uses GCP for the backend VM (see [ADR 0005](0005-backend-hosting-on-gce-e2-micro.md)). GCE VMs can authenticate to Google Artifact Registry using their service account, which avoids managing separate registry credentials.

## Decision

We will use Google Artifact Registry at `us-central1-docker.pkg.dev/cscsdotdev/website` as the container image registry. Images are tagged as `backend:latest` and pushed using `make build-push` from the `backend/` directory.

Multi-architecture images (linux/amd64 and linux/arm64) are built using `podman build --platform` to support both the amd64 GCE production VM and arm64 developer machines (Apple Silicon). The VM authenticates to the registry at startup using `gcloud auth print-access-token` piped to `podman login`.

## Consequences

- Authentication is handled by GCP IAM — no separate registry credentials to manage, rotate, or store.
- The registry is co-located in the same region (`us-central1`) as the VM, minimizing image pull latency.
- Multi-arch builds allow the same image to run on Apple Silicon developer machines and the amd64 GCE VM without platform-specific tags.
- The `latest` tag means the running container is not pinned to a specific version. A bad image push could affect production on the next VM start or container restart.
- Registry access requires an authenticated `gcloud` session on the developer's machine to push images.
- Artifact Registry storage costs are billed to the GCP project `cscsdotdev`, though they are negligible for a single image.
