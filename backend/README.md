# CSCS.dev Backend

PocketBase backend for the CSCS community website.

## Local Development

Start PocketBase alongside the frontend with Podman Compose from the project root:

```bash
podman-compose up --build -d
```

- PocketBase: `http://localhost:8090`
- Admin dashboard: `http://localhost:8090/_/`
- Frontend: `http://localhost:4321`

## Collections

| Collection | Purpose | Public Read | Write Access |
|-----------|---------|-------------|--------------|
| `users` | Authentication (email/password) | No | Self-registration, self-update |
| `events` | Event listings (meetups, book club) | Yes | Moderators only |
| `rsvps` | Attendance tracking (user + event relation) | Authenticated | Self only |
| `books` | Book club reading list | Yes | Moderators only |

Roles: `user` (default), `moderator` (set via admin dashboard). See `doc/authentication.md` for details.

## Migrations

Migration files live in `backend/pb_migrations/` with timestamp prefixes. PocketBase applies them automatically on startup.

**Creating a new collection**: See `1768138900_created_rsvps.js` for the pattern (Collection constructor with fields, indexes, and RBAC rules).

**Updating a collection**: See `1768098549_updated_events_recurring.js` for the pattern (findCollectionByNameOrId + field mutations).

Each migration has an up function and a down function for reversibility.

## Deployment

### Infrastructure

Hosted on a GCE e2-micro instance (~$8/month) running Podman via Quadlet. Application data persists on a separate block device with scheduled backups.

### Deploy Steps

1. **Build and push** the container image (includes migrations):
   ```bash
   cd backend
   make build-push
   ```

2. **SSH into the VM** and restart:
   ```bash
   ssh jackvincenthall@34.67.31.86
   gcloud auth print-access-token | sudo podman login -u oauth2accesstoken --password-stdin https://us-central1-docker.pkg.dev
   sudo podman pull us-central1-docker.pkg.dev/cscsdotdev/website/backend:latest
   sudo systemctl restart pocketbase.service
   ```

3. **Verify**: `sudo systemctl status pocketbase.service` should show `active (running)`.

### VM Management

```bash
cd backend
./deploy.sh up    # Provision VM (idempotent)
./deploy.sh down  # Tear down VM (preserves disk and IP)
```

## Architecture

- **Containerfile**: Multi-arch Alpine image with PocketBase binary + migrations baked in
- **startup.sh**: VM cloud-init script — installs Podman, mounts persistent disk, creates Quadlet unit
- **Makefile**: Build/push shortcuts for the container image
- **deploy.sh**: GCE VM lifecycle management (create/delete, preserves data)

PocketBase serves HTTPS directly via Let's Encrypt at `https://api.cscs.dev`.
