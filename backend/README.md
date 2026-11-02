# CSCS.dev Backend

PocketBase backend for the CSCS community website.

## Local Development

PocketBase listens on port 8080. From the project root, install the pinned PocketBase for your OS and architecture (macOS or Linux, x64 or arm64; needs Node and `unzip`) and run it. `make pocketbase` verifies the download's SHA-256, writes the gitignored `backend/pocketbase`, and does nothing if that version is already there:

```bash
cd backend
make pocketbase
./pocketbase serve --http=127.0.0.1:8080 --dir=./pb_data --migrationsDir=./pb_migrations
```

On Windows, or to run everything in containers, use Podman Compose from the project root:

```bash
podman-compose up --build -d pocketbase   # PocketBase only
podman-compose up --build -d              # PocketBase + frontend
```

- PocketBase: `http://localhost:8080`
- Admin dashboard: `http://localhost:8080/_/`
- Frontend: `http://localhost:4321` (run `npm run dev` from the project root unless you started the full Compose stack)

See the root `README.md` for the full local setup, including the superuser and moderator steps.

## Collections

| Collection | Purpose                                     | Public Read   | Write Access                   |
| ---------- | ------------------------------------------- | ------------- | ------------------------------ |
| `users`    | Authentication (email/password)             | No            | Self-registration, self-update |
| `events`   | Event listings (meetups, book club)         | Yes           | Moderators only                |
| `rsvps`    | Attendance tracking (user + event relation) | Authenticated | Own-record create; self delete |
| `books`    | Book club reading list                      | Yes           | Moderators only                |

Roles: `user` (default), `moderator` (set via admin dashboard). See [`../doc/authentication.md`](../doc/authentication.md) for details. RSVP create is limited to the signed-in user's own record (`user` must equal the authenticated id).

## Migrations

Migration files live in `backend/pb_migrations/` with timestamp prefixes. PocketBase applies them automatically on startup.

**Creating a new collection**: See `1768138900_created_rsvps.js` for the pattern (Collection constructor with fields, indexes, and RBAC rules).

**Updating a collection**: See `1768098549_updated_events_recurring.js` for the pattern (findCollectionByNameOrId + field mutations).

Each migration has an up function and a down function for reversibility. `npm run test:pb` (from the project root) applies them to a throwaway local PocketBase and checks the API rules; see [MIGRATIONS.md](MIGRATIONS.md#3-testing-migrations).

## Deployment

### Infrastructure

Hosted on a GCE e2-micro instance (~$8/month) running Podman via Quadlet. Application data persists on a separate 10 GB `pod-data` disk, backed up by daily snapshots at 03:00 UTC with 7-day retention. For backup status, restores, incident triage and monitoring, see [RUNBOOK.md](RUNBOOK.md).

### Deploy Steps

1. **Build and push** the container image (includes migrations):

   ```bash
   cd backend
   make build-push
   ```

2. **SSH into the VM** and restart:

   ```bash
   gcloud compute ssh cscs-dev-backend --zone=us-central1-a --project=cscsdotdev
   gcloud auth print-access-token | sudo podman login -u oauth2accesstoken --password-stdin https://us-central1-docker.pkg.dev
   sudo podman pull us-central1-docker.pkg.dev/cscsdotdev/website/backend:latest
   sudo systemctl restart pocketbase.service
   ```

3. **Verify**: `sudo systemctl status pocketbase.service` should show `active (running)`.

Migrations apply when the container starts. For the digest-based rollback, restores and incident triage, see [RUNBOOK.md](RUNBOOK.md).

### VM Management

```bash
cd backend
./deploy.sh up    # Provision VM (idempotent)
./deploy.sh down  # Tear down VM (preserves disk and IP)
```

Provisioning uses your SSH identity: `CSCS_SSH_USER` (default `whoami`) and `CSCS_SSH_PUBLIC_KEY` (default `~/.ssh/id_rsa.pub`). Set both when they differ from those defaults.

## Architecture

- **Containerfile**: Multi-arch Alpine image with PocketBase binary + migrations baked in
- **startup.sh**: VM cloud-init script — installs Podman, mounts persistent disk, creates Quadlet unit
- **Makefile**: `make pocketbase` (local binary) and build/push shortcuts for the container image
- **scripts/pocketbase-download.mjs**: The pinned PocketBase version and SHA-256 checksums, and the verified download behind `make pocketbase` and `npm run test:pb`
- **deploy.sh**: GCE VM lifecycle management (create/delete, preserves data)

PocketBase serves HTTPS directly via Let's Encrypt at `https://api.cscs.dev`.
