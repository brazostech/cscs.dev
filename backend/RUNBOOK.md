# Backend Operations Runbook

Operational procedures for the PocketBase backend behind <https://api.cscs.dev>. [backend/README.md](README.md) covers local development and the normal deploy path; this file covers incidents, backups, restores and monitoring.

Set these once per shell:

```bash
export PROJECT=cscsdotdev
export ZONE=us-central1-a
export REGION=us-central1
export VM=cscs-dev-backend
export DISK=pod-data
export POLICY=pod-data-daily-backup
```

Every command below assumes an authenticated `gcloud` against `$PROJECT`. The static IP is `34.67.31.86`, but prefer the resource name: the address is a separate resource, while the VM name is stable.

## Current status

As of 2026-11-02:

| Area                     | Status            | Detail                                                                                                                                       |
| ------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Backup policy            | ✅ Attached       | `pod-data-daily-backup` on `pod-data`, daily 03:00 UTC, 7-day retention                                                                      |
| First scheduled snapshot | ✅ Verified       | `pod-data-us-central1-a-20261102033821-bfcizm3p` at 2026-11-02 03:38 UTC                                                                     |
| Uptime check             | ❌ Not configured | No Cloud Monitoring uptime check on `/api/health` yet                                                                                        |
| Email alert              | ❌ Not configured | No notification channel or alert policy yet                                                                                                  |
| Boot-disk 80% alert      | ❌ Not configured | Needs the Ops Agent on the VM (GCE metrics do not report filesystem usage)                                                                   |
| Live `startup-script`    | ⚠️ Stale          | Instance metadata still holds the old script, without the #78 disk-space fixes. Update pending, see [Update `startup.sh`](#update-startupsh) |
| Restore rehearsal        | ❌ Not rehearsed  | The restore procedure is written from the configuration, not yet run end to end                                                              |

The live items above stay parked with the maintainer until #83's acceptance checks pass.

## Health check

```bash
curl -fsS https://api.cscs.dev/api/health
```

Expected: HTTP 200 and

```json
{ "code": 200, "message": "API is healthy.", "data": {} }
```

`curl -f` exits non-zero on 4xx/5xx, so this doubles as a probe:

```bash
curl -fsS https://api.cscs.dev/api/health >/dev/null && echo ok || echo down
```

The health endpoint proves TLS and the HTTP handler. It does not prove the database is readable or writable, so also load the site (for example <https://cscs.dev/schedule>) and confirm events and books render.

## Triage order

1. Confirm the VM state:

   ```bash
   gcloud compute instances describe "$VM" --zone="$ZONE" --project="$PROJECT" \
     --format="value(status)"
   ```

2. Read the serial output. This works without SSH and shows boot, sshd and systemd errors:

   ```bash
   gcloud compute instances get-serial-port-output "$VM" \
     --zone="$ZONE" --project="$PROJECT" | tail -100
   ```

3. Check disk space first once you are in. The boot disk filling up broke this VM for seven months:

   ```bash
   df -h / /mnt/pod-data
   ```

   `/` is the boot disk, `/mnt/pod-data` is the data disk. Both should sit below about 80%.

4. Read the service log:

   ```bash
   sudo journalctl -u pocketbase.service -n 200 --no-pager
   ```

5. Check the service state:

   ```bash
   systemctl status pocketbase.service --no-pager
   ```

6. List the containers:

   ```bash
   sudo podman ps -a
   ```

7. Confirm `/mnt/pod-data` is a real mount. If it is not, PocketBase starts against an empty directory and creates a fresh database on the boot disk. Stop it before it writes:

   ```bash
   mountpoint /mnt/pod-data
   sudo systemctl stop pocketbase.service   # only if the mountpoint is missing
   ```

## Access

```bash
gcloud compute ssh cscs-dev-backend --zone=us-central1-a --project=cscsdotdev
```

or, with the variables set:

```bash
gcloud compute ssh "$VM" --zone="$ZONE" --project="$PROJECT"
```

The VM has no password login. Access is SSH-key only: keys live in the project and instance `ssh-keys` metadata, and `gcloud compute ssh` adds your key if it is missing.

### When SSH fails because the boot disk is full

SSH login is not just authentication: the guest agent has to write your public key into the account's `~/.ssh/authorized_keys`, and the session writes to `/run`, `/tmp` and the journal. On a full filesystem those writes fail, so `gcloud compute ssh` reports `Permission denied (publickey)` even though the key is in metadata. A full disk can also stop sshd from forking a session at all. That is the failure this VM hit in 2026: the boot disk filled, key provisioning and image pulls failed, and nobody could log in.

Recovery order:

1. Reboot with a clean stop and start, which gives PocketBase an ACPI shutdown before the power goes:

   ```bash
   gcloud compute instances stop "$VM" --zone="$ZONE" --project="$PROJECT"
   gcloud compute instances start "$VM" --zone="$ZONE" --project="$PROJECT"
   ```

   Wait about two minutes, then retry SSH. If the VM hangs and will not stop, `gcloud compute instances reset "$VM" --zone="$ZONE" --project="$PROJECT"` is a hard power-cycle: faster, but with no clean shutdown, so use it only as a last resort on a data host.

   The startup script runs on every boot. Its disk-space mitigations from PR #78 (journal cap, snap cache, `apt-get clean`) only take effect after the instance's `startup-script` metadata is updated; as of 2026-11-02 the live metadata is still the old script, so a reboot does not apply them yet. See [Update `startup.sh`](#update-startupsh).

2. Grow the boot disk. This is the cheapest fix for a full disk, needs no SSH, and works even when login is impossible. Resize the disk, then stop and start the VM so the guest grows the filesystem on boot:

   ```bash
   gcloud compute disks resize "$VM" --size=30GB --zone="$ZONE" --project="$PROJECT"
   gcloud compute instances stop "$VM" --zone="$ZONE" --project="$PROJECT"
   gcloud compute instances start "$VM" --zone="$ZONE" --project="$PROJECT"
   ```

   The boot disk has the same name as the VM and is 20 GB today. A disk can only grow, never shrink, and a bigger disk costs more every month, so this buys time rather than fixing the cause: free space as in [Free space safely](#free-space-safely) once you are in.

3. If SSH still fails, read the serial output. It is read-only and always available, and usually names the cause directly:

   ```bash
   gcloud compute instances get-serial-port-output "$VM" \
     --zone="$ZONE" --project="$PROJECT" | less
   ```

   Look for `No space left on device`, `Read-only file system`, `Failed to start` or an sshd error.

4. The interactive serial console can get you a login prompt. It requires serial port access to be enabled once:

   ```bash
   gcloud compute instances add-metadata "$VM" --zone="$ZONE" --project="$PROJECT" \
     --metadata serial-port-enable=TRUE
   gcloud compute connect-to-serial-port "$VM" --zone="$ZONE" --project="$PROJECT"
   ```

   Ubuntu GCE images have no console password by default, so the serial console is more reliable for diagnosis than for repair. If you cannot log in at all, stop the VM and attach the boot disk to a temporary rescue VM to free space, then reattach it and start the VM. Do not format or delete anything during that recovery.

### Free space safely

Run these in order and re-check `df -h /` after each:

```bash
sudo journalctl --vacuum-size=200M
sudo find /var/lib/snapd/cache -type f -delete 2>/dev/null || true
sudo apt-get clean
```

Do not run `sudo podman system prune -f` here unless you accept losing the rollback image: after a deploy pull, the previous `:latest` is a dangling image, and `prune -f` deletes it. See [Roll back an image](#roll-back-an-image).

- `journalctl --vacuum-size=200M` matches the cap `startup.sh` writes (`SystemMaxUse=200M`). Safe.
- `/var/lib/snapd/cache` holds downloaded snap archives. Installed revisions are unaffected. Safe.
- `apt-get clean` clears `/var/cache/apt/archives`. Safe. `apt-get autoremove --purge` also removes unused kernels and dependencies, so review its list before confirming.
- `podman system prune -f` removes stopped containers, unused networks and dangling images. **It deletes the previous image that a rollback needs**, so prune only after the rollback window for the latest deploy has passed, or note the digest first so you can pull it from the registry. Adding `-a` removes images not used by a running container, which forces a re-pull on the next restart; avoid `--volumes`.
- Never delete anything under `/mnt/pod-data/pb_data`. That is the database.

To find what is large:

```bash
sudo du -xh --max-depth=1 / | sort -h
sudo du -xh --max-depth=2 /var | sort -h | tail -20
```

## Deploy an image

Migrations are baked into the image and apply automatically on startup ([MIGRATIONS.md](MIGRATIONS.md)). A deploy therefore migrates production the moment the service restarts.

1. Record the digest currently serving traffic, so you have a rollback target:

   ```bash
   gcloud compute ssh "$VM" --zone="$ZONE" --project="$PROJECT" --command \
     "sudo podman image inspect --format '{{.Digest}}' \
      us-central1-docker.pkg.dev/cscsdotdev/website/backend:latest"
   ```

   If the image was built locally and has no digest, use the image ID instead:

   ```bash
   sudo podman images --digests --format '{{.Repository}}:{{.Tag}} {{.Digest}} {{.ID}}'
   ```

   The registry keeps every pushed digest. To list recent ones:

   ```bash
   gcloud artifacts docker images list \
     us-central1-docker.pkg.dev/cscsdotdev/website/backend \
     --include-tags --project="$PROJECT" --sort-by=~createTime --limit=10 \
     --format="table(version,tags,createTime)"
   ```

   `version` is the digest.

2. Build and push the multi-arch image. Authenticate Podman to Artifact Registry first if needed, then run the build from `backend/`:

   ```bash
   gcloud auth print-access-token | \
     podman login -u oauth2accesstoken --password-stdin https://us-central1-docker.pkg.dev
   cd backend
   make build-push
   ```

3. Pull and restart. First open a shell on the VM:

   ```bash
   gcloud compute ssh "$VM" --zone="$ZONE" --project="$PROJECT"
   ```

   Then, on the VM:

   ```bash
   gcloud auth print-access-token | sudo podman login -u oauth2accesstoken --password-stdin https://us-central1-docker.pkg.dev
   sudo podman pull us-central1-docker.pkg.dev/cscsdotdev/website/backend:latest
   sudo systemctl restart pocketbase.service
   ```

4. Verify:

   ```bash
   systemctl status pocketbase.service --no-pager
   sudo journalctl -u pocketbase.service -n 50 --no-pager
   curl -fsS https://api.cscs.dev/api/health
   ```

   The log shows the applied migrations. Then load <https://cscs.dev/schedule> and the admin dashboard and confirm the data looks right.

### Roll back an image

**Not yet rehearsed.** This procedure is written from reading the Quadlet configuration and Podman's pull behaviour. Run it once on a quiet day and update this section with what actually happened.

Re-tagging an old image as the local `:latest` does not work. The Quadlet `.kube` unit runs `podman kube play` on every start, and Podman gives an image tagged `latest` the `newer` pull policy when the YAML sets no `imagePullPolicy`. On restart it compares the local `:latest` with the registry's, finds the registry's newer, and pulls the bad image again. Pin the old image by digest instead, since a digest reference is not subject to that policy.

Open a shell on the VM:

```bash
gcloud compute ssh "$VM" --zone="$ZONE" --project="$PROJECT"
```

Then, on the VM, set the digest recorded in step 1 of [Deploy an image](#deploy-an-image) and point the unit at it:

```bash
OLD_DIGEST=sha256:...   # recorded in step 1 of Deploy an image

sudo podman pull us-central1-docker.pkg.dev/cscsdotdev/website/backend@${OLD_DIGEST}
sudoedit /etc/containers/systemd/pocketbase.yaml
```

In `pocketbase.yaml`, change the container's `image:` line to the digest form:

```yaml
image: us-central1-docker.pkg.dev/cscsdotdev/website/backend@sha256:<old>
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart pocketbase.service
```

Check that the running image is the one you intended:

```bash
sudo podman ps --format '{{.Image}} {{.ImageID}}'
sudo podman image inspect --format '{{.Digest}}' us-central1-docker.pkg.dev/cscsdotdev/website/backend@${OLD_DIGEST}
```

The `ps` output must show the old image, not `:latest`. Then run the verify checks from [Deploy an image](#deploy-an-image).

Three limits:

- **An image rollback does not roll back migrations.** PocketBase records applied migrations in the database. If the release added or changed a migration, the older image will report missing migrations and fail to start against the newer schema. In that case restore the data disk from a snapshot instead (see [Restore `pod-data` from a snapshot](#restore-pod-data-from-a-snapshot)).
- **The pin is a manual edit on the VM.** The `image:` line in `pocketbase.yaml` stays on the old digest until you change it back. When a fixed image is pushed, restore the `:latest` reference in `pocketbase.yaml` (or the next deploy will not take effect), reload, and restart. A rebuilt VM regenerates the file from `startup.sh` with `:latest`, and the registry's `:latest` still points at the bad image until you push a fix.
- **The old image must still be available.** A plain `podman system prune -f` after the deploy deletes it locally; the `pull` above fetches it from the registry, which keeps every pushed digest.

## Update `startup.sh`

The VM runs the `startup-script` value in its instance metadata, not the copy in the repository. Changing `backend/startup.sh` has no effect until you update the metadata.

From the repository root, on the commit you intend to run:

```bash
gcloud compute instances add-metadata "$VM" --zone="$ZONE" --project="$PROJECT" \
  --metadata-from-file startup-script=backend/startup.sh
```

`add-metadata` replaces only the named key, so the SSH keys and other metadata are untouched.

- The new script runs on the **next boot**, not immediately.
- To apply the same change to the running VM, reproduce it by hand. The Quadlet files the script generates live in `/etc/containers/systemd/`; edit `pocketbase.yaml` and `pocketbase.kube` there, then:

  ```bash
  sudo systemctl daemon-reload
  sudo systemctl restart pocketbase.service
  ```

- For the system-level parts of the script (journald cap, snap cache, swap), run the corresponding commands directly.
- Verify that the stored script matches the repository. From the repository root, no output from `diff` means they are identical:

  ```bash
  diff <(gcloud compute instances describe "$VM" --zone="$ZONE" --project="$PROJECT" \
    --format=json | jq -r '.metadata.items[] | select(.key == "startup-script") | .value') \
    backend/startup.sh && echo "metadata matches backend/startup.sh"
  ```

  As of 2026-11-02 this reports differences: the live metadata is the old script, without the journald cap, snap cache purge, `apt-get clean` or `ip_forward` sysctl added in #78.

## Backups

`pod-data` has the `pod-data-daily-backup` snapshot schedule attached:

| Property                 | Value                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Schedule                 | Daily at 03:00 UTC                                                                                             |
| Retention                | 7 days (`maxRetentionDays=7`)                                                                                  |
| On source disk delete    | Keep auto snapshots                                                                                            |
| Attached                 | 2026-11-02, by hand (see the amendment in [ADR 0007](../doc/adr/0007-persistent-data-on-separate-gce-disk.md)) |
| First scheduled snapshot | `pod-data-us-central1-a-20261102033821-bfcizm3p`, 2026-11-02 03:38 UTC                                         |

Snapshots may appear a few minutes after 03:00, as the first one did.

Check that the policy is still attached:

```bash
gcloud compute disks describe "$DISK" --zone="$ZONE" --project="$PROJECT" \
  --format="value(resourcePolicies)"
```

The output should end in `/pod-data-daily-backup`. List snapshots:

```bash
gcloud compute snapshots list --project="$PROJECT" \
  --filter="sourceDisk~${DISK}" \
  --format="table(name,creationTimestamp,diskSizeGb,status)"
```

To check only the scheduled backups, filter on their naming pattern, so a manual snapshot cannot mask a broken schedule:

```bash
gcloud compute snapshots list --project="$PROJECT" \
  --filter="name~'^pod-data-us-central1-a-'" \
  --format="table(name,creationTimestamp,diskSizeGb,status)"
```

A scheduled snapshot dated within the last 24 hours means backups are working. Scheduled snapshots older than 7 days should disappear automatically; none from the last 24 hours means the policy was detached or the disk is gone. Manual snapshots never expire. One exists today, `pod-data-pre-fix-20261101`, taken before the #78 changes; delete it once nobody needs it.

Only `pod-data` is backed up. The boot disk is disposable and is rebuilt by `startup.sh`. For a manual pre-change snapshot:

```bash
gcloud compute snapshots create "${DISK}-manual-$(date -u +%Y%m%d%H%M)" \
  --source-disk="$DISK" --source-disk-zone="$ZONE" --project="$PROJECT"
```

Manual snapshots have no expiry and cost money; delete them when the change is confirmed good.

## Restore `pod-data` from a snapshot

**Not yet rehearsed.** This procedure is written from the current configuration. Run it once end to end on a quiet day and update this section with what actually happened.

Restoring replaces the whole data disk: every write after the snapshot is lost. The procedure restores in place. The disk keeps the name `pod-data`, so `deploy.sh up` stays correct, and a manual pre-restore snapshot is the rollback.

1. Choose the snapshot. Scheduled snapshots are named `pod-data-us-central1-a-<timestamp>-<suffix>`:

   ```bash
   gcloud compute snapshots list --project="$PROJECT" \
     --filter="sourceDisk~${DISK}" \
     --format="table(name,creationTimestamp,diskSizeGb,status)"
   ```

2. Stop the VM so the filesystem is quiesced:

   ```bash
   gcloud compute instances stop "$VM" --zone="$ZONE" --project="$PROJECT"
   ```

3. Take a manual snapshot of the current disk. This is the rollback; do not skip it, because step 5 deletes the disk:

   ```bash
   PRE_RESTORE="${DISK}-pre-restore-$(date -u +%Y%m%d%H%M)"
   gcloud compute snapshots create "$PRE_RESTORE" \
     --source-disk="$DISK" --source-disk-zone="$ZONE" --project="$PROJECT"
   ```

   Wait until the snapshot is `READY` before going on:

   ```bash
   gcloud compute snapshots describe "$PRE_RESTORE" --project="$PROJECT" --format="value(status)"
   ```

4. Detach the old disk:

   ```bash
   gcloud compute instances detach-disk "$VM" --disk="$DISK" \
     --zone="$ZONE" --project="$PROJECT"
   ```

5. Delete it. A disk cannot be renamed, and while an old `pod-data` exists, `deploy.sh up` would attach it:

   ```bash
   gcloud compute disks delete "$DISK" --zone="$ZONE" --project="$PROJECT"
   ```

   Scheduled snapshots survive the delete (the policy keeps auto snapshots on source-disk delete), and the pre-restore snapshot holds the final state.

6. Recreate `pod-data` from the chosen snapshot, with the backup policy attached from the start:

   ```bash
   gcloud compute disks create "$DISK" \
     --source-snapshot=<snapshot-name> \
     --resource-policies="$POLICY" \
     --zone="$ZONE" --project="$PROJECT" --type=pd-balanced
   ```

7. Attach it with the device name the startup script expects:

   ```bash
   gcloud compute instances attach-disk "$VM" --disk="$DISK" \
     --device-name=pod-data-disk --zone="$ZONE" --project="$PROJECT"
   ```

   The device name is not the disk name. `startup.sh` mounts `/dev/disk/by-id/google-pod-data-disk` at `/mnt/pod-data`; any other device name leaves the container without data.

8. Start the VM:

   ```bash
   gcloud compute instances start "$VM" --zone="$ZONE" --project="$PROJECT"
   ```

9. Verify before trusting it. First open a shell on the VM:

   ```bash
   gcloud compute ssh "$VM" --zone="$ZONE" --project="$PROJECT"
   ```

   Then, on the VM:

   ```bash
   mountpoint /mnt/pod-data
   df -h /mnt/pod-data
   sudo ls -la /mnt/pod-data/pb_data
   sudo journalctl -u pocketbase.service -n 50 --no-pager
   systemctl status pocketbase.service --no-pager
   ```

   Then check the health endpoint and load the site and admin dashboard. If `/mnt/pod-data` is not a mountpoint, stop the service immediately (`sudo systemctl stop pocketbase.service`) so PocketBase does not initialise an empty database on the boot disk, and re-check the device name.

10. Confirm the policy is attached to the new disk (see [Backups](#backups)). It should end in `/pod-data-daily-backup`.

To roll back, repeat the procedure with `$PRE_RESTORE` as the snapshot in step 6 (delete the restored `pod-data` first, as in steps 2, 4 and 5). Keep the pre-restore snapshot until the restore is confirmed good, then delete it; manual snapshots do not expire.

## Monitoring

**Not configured as of 2026-11-02.** This section describes what to set up and how; the checks and policies do not exist yet.

### Email notification channel

Console: Monitoring → Alerting → **Edit notification channels** → **Email** → **Add email**, then enter a display name and address. Use **Send test notification** to confirm delivery. Alert policies below attach to this channel.

### Uptime check on the health endpoint

Console:

1. Monitoring → Uptime checks → **Create uptime check**.
2. Protocol **HTTPS**, hostname `api.cscs.dev`, path `/api/health`.
3. Check every **1 minute**, timeout **10 seconds**; leave the default regions.
4. Optionally set response validation to match content `API is healthy.`
5. In **Alert & notification**, tick the email channel (or create one there) and save. This creates the uptime alert policy.

Equivalent `gcloud` for the check itself (flag syntax checked against `gcloud monitoring uptime create --help`, not executed):

```bash
gcloud monitoring uptime create "CSCS API health" \
  --resource-type=uptime-url \
  --resource-labels=host=api.cscs.dev,project_id=cscsdotdev \
  --protocol=https --path=/api/health \
  --period=1 --timeout=10 \
  --project="$PROJECT"
```

The alert policy for it is easiest to create from the uptime check's **Alert & notification** section in the console.

### Boot-disk 80% alert

GCE's built-in disk metrics (`compute.googleapis.com/instance/disk/*`) cover I/O and provisioned size only; none reports filesystem usage. The 80% alert therefore needs the Ops Agent metric `agent.googleapis.com/disk/percent_used`, and the agent is not installed on the VM today. Installing it is a live change and adds a small memory footprint on the e2-micro.

On the VM:

```bash
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```

Console:

1. Monitoring → Alerting → **Create policy**.
2. Metric: search for `disk percent used`, resource type **VM instance**, metric `agent.googleapis.com/disk/percent_used`.
3. Filter to the boot disk's root filesystem: `device = sda1` and `state = used`. Confirm the device name in the Metric Explorer; the data disk is a separate device.
4. Condition: **is above** `80`, for **5 minutes**.
5. Notification: the email channel above. Name the policy `cscs-dev-backend boot disk 80%`.

On the 20 GB boot disk, 80% leaves about 4 GB free. That is a heuristic starting threshold, not a measured failure point: the 2026 incident happened on the original 10 GB boot disk, and nothing records how much free space remained when it started failing. Tune it after watching real usage.

### Limits of these checks

- The uptime check proves TLS and the HTTP handler, not that the database is writable.
- A container that crash-loops but answers between checks may never trip the uptime alert; `systemctl status` and the journal remain the source of truth.
- Nothing watches the data disk's capacity. Add a second condition on `sdb`/`/mnt/pod-data` if it starts to grow.

## Open items

These close #83's acceptance checks and are tracked on the issue:

- Add the uptime check, email channel and alert policy.
- Install the Ops Agent and add the 80% boot-disk policy.
- Update the VM's `startup-script` metadata to the current `backend/startup.sh` (see [Update `startup.sh`](#update-startupsh)); the live copy lacks the #78 disk-space fixes.
- Rehearse the restore once and update this runbook with the result.
