# ADR 0007: Persistent Data on Separate GCE Disk

**Status**: Accepted

**Date**: 2026-02-28

## Context

PocketBase stores all data — the SQLite database, uploaded files, and migration history — on disk. If this data lived on the VM's boot disk, deleting and recreating the VM (a routine operation via `deploy.sh down` / `deploy.sh up`) would destroy all application data.

The deployment model treats the VM as disposable infrastructure that can be rebuilt from the startup script at any time. Data must survive VM lifecycle events.

## Decision

We will store all PocketBase data on a separate 10GB `pd-balanced` persistent disk named `pod-data`, created in `us-central1-a` with `auto-delete=no`. The `deploy.sh` script either creates a new disk or attaches an existing one when provisioning the VM.

The startup script formats the disk as ext4 on first use (idempotently — it checks `blkid` before formatting), mounts it at `/mnt/pod-data`, and bind-mounts it into the PocketBase container at `/data`. The `pb_data` directory lives at `/mnt/pod-data/pb_data` on the host.

A daily snapshot policy (`pod-data-daily-backup`) runs at 03:00 UTC with 7-day retention, configured via `gcloud compute resource-policies`.

## Consequences

- The VM can be deleted and recreated without any data loss. The persistent disk and its contents survive independently.
- Daily snapshots provide point-in-time recovery for up to 7 days. This protects against accidental data corruption or deletion.
- The disk is a first-class GCP resource with its own lifecycle, visible in the GCP console and manageable via `gcloud` commands.
- First-time disk formatting is an idempotent operation in the startup script, but it must be handled carefully — an accidental format of a disk with existing data would be destructive.
- Snapshot retention at 7 days means incidents older than a week cannot be recovered from snapshots alone.
- The 10GB disk size is generous for a community site using SQLite. PocketBase is unlikely to approach this limit in the near term.
- The disk must be in the same zone (`us-central1-a`) as the VM, which limits geographic flexibility.
