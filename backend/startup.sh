#!/bin/bash

# 1. Setup Logging
exec > >(tee /var/log/startup-script.log|logger -t startup-script -s 2>/dev/console) 2>&1

echo "Starting Podman Setup on e2-micro..."

# --- FIX FOR E2-MICRO ---
# 2. Create a 1GB Swap File to prevent OOM kills during install
if [ ! -f /swapfile ]; then
    echo "Creating swapfile for e2-micro stability..."
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
# ------------------------

# 3. Format and Mount the Persistent Disk
DISK_ID="/dev/disk/by-id/google-pod-data-disk"
MOUNT_POINT="/mnt/pod-data"

if [ -e "${DISK_ID}" ]; then
    if ! blkid "${DISK_ID}"; then
        echo "Formatting persistent disk..."
        mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard "${DISK_ID}"
    fi
    mkdir -p "${MOUNT_POINT}"
    if ! mountpoint -q "${MOUNT_POINT}"; then
        mount -o discard,defaults "${DISK_ID}" "${MOUNT_POINT}"
        echo "${DISK_ID} ${MOUNT_POINT} ext4 discard,defaults,nofail 0 2" >> /etc/fstab
    fi
    chmod 777 "${MOUNT_POINT}"
else
    echo "ERROR: Persistent disk not found at ${DISK_ID}"
fi

# 4. Install Podman
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y podman

echo "net.ipv4.ip_unprivileged_port_start=80" > /etc/sysctl.d/ports.conf
sysctl --system

echo "Authenticating to Artifact Registry..."
gcloud auth print-access-token | \
  podman login -u oauth2accesstoken --password-stdin https://us-central1-docker.pkg.dev

# 5. Create Directory for Quadlet Files
QUADLET_DIR="/etc/containers/systemd"
mkdir -p "$QUADLET_DIR"

# 6. Create the Kubernetes YAML (The Payload)
cat <<EOF > "${QUADLET_DIR}/pocketbase.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: pocketbase
spec:
  restartPolicy: Always
  containers:
  - name: pocketbase
    image: us-central1-docker.pkg.dev/cscsdotdev/website/backend:latest
    command:
      - "pocketbase"
      - "serve"
      - "api.cscs.dev"
      - "--http=0.0.0.0:80"
      - "--https=0.0.0.0:443"
      - "--dir=/data/pb_data"
    volumeMounts:
    - mountPath: /data
      name: data-volume
  volumes:
  - name: data-volume
    hostPath:
      path: ${MOUNT_POINT}
      type: Directory
EOF

# 7. Create the Quadlet .kube Unit (The Trigger)
cat <<EOF > "${QUADLET_DIR}/pocketbase.kube"
[Unit]
Description=Pocketbase Kube-Play Service
Documentation=man:podman-systemd.unit(5)
Wants=network-online.target
After=network-online.target

[Kube]
Yaml=${QUADLET_DIR}/pocketbase.yaml
PublishPort=443:443
PublishPort=80:80

[Install]
WantedBy=multi-user.target
EOF

# 8. Activate
systemctl daemon-reload
systemctl start pocketbase.service

echo "Startup script completed successfully."
