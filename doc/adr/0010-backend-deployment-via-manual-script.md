# ADR 0010: Backend Deployment via Manual Script

**Status**: Accepted

**Date**: 2026-02-28

## Context

The backend (GCE VM running PocketBase) does not have an automated deployment pipeline equivalent to the frontend's Netlify integration. Backend infrastructure changes infrequently — the VM is provisioned once and runs until it is intentionally replaced. Automating GCE provisioning in CI would require storing GCP service account credentials in GitHub Secrets and building a more complex workflow.

The `MIGRATIONS.md` documentation describes a pipeline flow of `Git → CI/CD Build → GCE VM → Container Restart → Migrations Apply`, but this automated pipeline does not exist yet.

## Decision

We will manage backend infrastructure and deployment manually using `backend/deploy.sh` and `backend/Makefile`. The deployment workflow has two parts:

**Infrastructure lifecycle**: `deploy.sh up` provisions the GCE VM with all dependent resources (firewall rules, static IP, persistent disk, snapshot policy). `deploy.sh down` deletes the VM while preserving the data disk and static IP. The script is idempotent — it checks for existing resources before creating them.

**Application updates**: New container images are built and pushed using `make build-push` from the `backend/` directory. Updating a running deployment requires SSHing into the VM, pulling the new image, and restarting the systemd service.

## Consequences

- No GCP credentials need to be stored in CI. The deployment process requires only a developer with `gcloud` access and SSH key authorization.
- The deployment process is explicit and auditable — every action is a deliberate human decision.
- The `deploy.sh` script is idempotent for resource creation, making it safe to run `up` multiple times.
- There is no automated deployment pipeline for backend changes. A developer must manually build, push, and restart for every update.
- The process for updating a live container (SSH, pull, restart) is not formally documented in the deploy script — it only handles VM creation and deletion.
- There is no automated rollback. If a bad image is pushed, recovery requires manually pulling a previous image or restoring from a disk snapshot.
- This is appropriate for a low-change-frequency service at community scale. The operational simplicity outweighs the automation gap for now.
