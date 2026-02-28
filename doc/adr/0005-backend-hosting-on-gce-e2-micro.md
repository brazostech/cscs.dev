# ADR 0005: Backend Hosting on GCE e2-micro

**Status**: Accepted

**Date**: 2026-02-28

## Context

PocketBase requires a persistent process with persistent storage — it cannot run on a serverless platform or a static hosting CDN. The backend needs to be reachable at a stable IP address for DNS to point `api.cscs.dev` at it.

The team already has a Google Cloud Platform account (project `cscsdotdev`). Cost must be minimal for a community project. GCP's `e2-micro` instance type qualifies for the free tier in `us-central1`.

## Decision

We will host the PocketBase backend on a GCE VM named `cscs-dev-backend`, machine type `e2-micro`, running Ubuntu 24.04 LTS in zone `us-central1-a`. A regional static IP address (`cscs-backend-ip`) is reserved separately so it survives VM replacement.

The VM is provisioned via `backend/deploy.sh`, which handles instance creation, firewall rules (ports 80 and 443), static IP allocation, and persistent disk attachment. A 1GB swap file is created at first boot by the startup script to prevent OOM kills during package installation on the memory-constrained instance.

SSH access is configured through VM metadata with the user `jackvincenthall` and an RSA public key.

## Consequences

- Hosting cost is effectively free under GCP's free tier for `e2-micro` in `us-central1`.
- The VM can be torn down (`deploy.sh down`) and recreated (`deploy.sh up`) without data loss, because the persistent disk and static IP are separate resources that survive VM deletion.
- The `e2-micro` instance has only 1 vCPU and 1GB RAM. The swap workaround is a signal that the instance is memory-constrained. Heavy operations (large migrations, concurrent requests) may be slow.
- There is no auto-scaling or load balancing. If the VM goes down, the backend is unavailable until manually restarted.
- The startup script (`backend/startup.sh`) is the authoritative infrastructure definition — it configures everything from swap to container runtime to the PocketBase service.
- Firewall rules allow inbound traffic on ports 80 and 443 from all sources (`0.0.0.0/0`) to instances tagged `https-server`.
