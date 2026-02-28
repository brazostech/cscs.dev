# ADR 0006: Container Runtime — Podman with Quadlet

**Status**: Accepted

**Date**: 2026-02-28

## Context

PocketBase runs inside a container to isolate it from the host OS and make deployments reproducible. The host is an Ubuntu 24.04 VM on GCE (see [ADR 0005](0005-backend-hosting-on-gce-e2-micro.md)).

Docker requires a daemon running as root, which introduces a security concern on a single-purpose VM. Podman is a daemonless, rootless-capable container runtime that is a drop-in replacement for Docker CLI commands. Quadlet is Podman's systemd integration layer, allowing containers to be managed as native systemd services.

## Decision

We will run PocketBase using Podman, managed by systemd via Podman Quadlet. The startup script installs Podman, writes a Kubernetes Pod YAML definition to `/etc/containers/systemd/pocketbase.yaml`, and creates a Quadlet `.kube` unit file at `/etc/containers/systemd/pocketbase.kube`. Systemd handles service startup, restart-on-failure, and dependency ordering.

PocketBase listens directly on ports 80 and 443, enabled by setting `net.ipv4.ip_unprivileged_port_start=80` via sysctl. The container image is pulled from Google Artifact Registry (see [ADR 0008](0008-container-registry-google-artifact-registry.md)). PocketBase handles its own TLS certificate provisioning for the `api.cscs.dev` domain.

## Consequences

- No Docker daemon required. Podman runs containers without a persistent root-level process.
- The container is managed as a systemd unit (`pocketbase.service`), benefiting from systemd's restart policies, logging (journalctl), and boot-time ordering.
- The Kubernetes Pod YAML format means the container definition is portable and familiar to anyone who has worked with Kubernetes manifests.
- Quadlet is a relatively new feature in the Podman ecosystem. Documentation and community examples are less mature than Docker Compose.
- Debugging requires familiarity with both Podman and systemd tooling (`podman ps`, `systemctl status`, `journalctl`).
- The Kubernetes YAML and Quadlet unit file are embedded as heredocs in `backend/startup.sh` and baked into the VM at creation time. Updating them requires either a new VM deployment or SSH access to modify in place.
