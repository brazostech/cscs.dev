# ADR 0011: Local Development with Podman Compose

**Status**: Accepted

**Date**: 2026-02-28

## Context

Developers need to run both the Astro frontend and PocketBase backend locally. The setup should be consistent across developer machines, not require global tool installations beyond Podman, and support hot-reloading of frontend code changes during development.

Docker Compose is the more widely known tool, but the project uses Podman for production containers (see [ADR 0006](0006-container-runtime-podman-with-quadlet.md)). Using the same container runtime in development and production reduces environment inconsistencies.

## Decision

We will use `podman-compose.yaml` at the project root to define the local development environment with two services:

**pocketbase**: Built from `backend/Containerfile`, running on port 8080 with `./backend/pb_data` bind-mounted for persistent local database state. The admin dashboard is accessible at `http://localhost:8080/_/`.

**cscs**: Built from the root `Containerfile` (a Node.js dev server image), running on port 4321 with the entire project directory volume-mounted for hot-reloading. The environment variable `PUBLIC_POCKETBASE_URL` is set to `http://localhost:8080` for browser-side API access.

The full stack starts with `podman-compose up --build` and stops with `podman-compose down`.

## Consequences

- A single command starts the complete development stack with both frontend and backend.
- Hot-reloading works because the source directory is mounted into the frontend container — file changes on the host are reflected immediately.
- The `pb_data` directory is bind-mounted so local database state (users, events, RSVPs) persists across container restarts.
- Podman and Podman Compose must be installed on the developer's machine. This is documented in `README.md`.
- The root `Containerfile` is a development-only image (Node.js dev server); it is not used in production.
- The frontend service uses `node_modules` from inside the container image, which can cause confusion if the host also has a `node_modules` directory from running `npm install` locally.
- The compose setup is explicitly for development. Production uses a completely different deployment path (GCE VM with Quadlet — see [ADR 0006](0006-container-runtime-podman-with-quadlet.md)).
