#!/bin/bash

# --- CONFIGURATION ---
VM_NAME="cscs-dev-backend"
ZONE="us-central1-a"
REGION="us-central1"
PROJECT="cscsdotdev"
ADDRESS_NAME="cscs-backend-ip"
DISK_NAME="pod-data"
USERNAME="jackvincenthall"
SSH_PUBLIC_KEY_PATH="$HOME/.ssh/id_rsa.pub"

# --- HELPER FUNCTIONS ---

check_ssh_key() {
    if [ ! -f "$SSH_PUBLIC_KEY_PATH" ]; then
        echo "❌ SSH public key file not found at: $SSH_PUBLIC_KEY_PATH"
        exit 1
    fi
}

ensure_firewall() {
    echo "🛡️  Checking Firewall rules..."
    gcloud compute firewall-rules create allow-http-80 \
        --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
        --rules=tcp:80 --source-ranges=0.0.0.0/0 --target-tags=https-server \
        --project=$PROJECT --quiet 2>/dev/null || true

    gcloud compute firewall-rules create allow-https-443 \
        --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
        --rules=tcp:443 --source-ranges=0.0.0.0/0 --target-tags=https-server \
        --project=$PROJECT --quiet 2>/dev/null || true
}

ensure_snapshot_policy() {
    echo "📸 Checking Snapshot policy..."
    gcloud compute resource-policies create snapshot-schedule pod-data-daily-backup \
        --region=$REGION --max-retention-days=7 --start-time=03:00 \
        --daily-schedule --on-source-disk-delete=keep-auto-snapshots \
        --project=$PROJECT --quiet 2>/dev/null || true
}

get_or_create_ip() {
    # >&2 sends these messages to stderr so they don't get captured into the variable
    echo "🌐 Checking Static IP '$ADDRESS_NAME'..." >&2
    
    # Check if address exists
    EXISTING_IP=$(gcloud compute addresses describe $ADDRESS_NAME \
        --region=$REGION --project=$PROJECT --format="value(address)" 2>/dev/null)

    if [ -z "$EXISTING_IP" ]; then
        echo "   Creating new static IP..." >&2
        gcloud compute addresses create $ADDRESS_NAME --region=$REGION --project=$PROJECT
        EXISTING_IP=$(gcloud compute addresses describe $ADDRESS_NAME \
            --region=$REGION --project=$PROJECT --format="value(address)")
    fi
    
    echo "   ✅ Using Static IP: $EXISTING_IP" >&2
    
    # Only this line goes to stdout for the variable to capture
    echo "$EXISTING_IP"
}

# --- COMMANDS ---

up() {
    check_ssh_key
    SSH_KEY=$(cat "$SSH_PUBLIC_KEY_PATH")
    
    ensure_firewall
    ensure_snapshot_policy
    
    # Capture only the IP, logs go to screen via stderr
    STATIC_IP=$(get_or_create_ip)

    # Check if VM already exists
    if gcloud compute instances describe $VM_NAME --zone=$ZONE --project=$PROJECT >/dev/null 2>&1; then
        echo "⚠️  VM '$VM_NAME' already exists. Aborting creation."
        exit 0
    fi

    # Check if Disk already exists to decide between --disk (attach) or --create-disk (new)
    DISK_FLAG=""
    if gcloud compute disks describe $DISK_NAME --zone=$ZONE --project=$PROJECT >/dev/null 2>&1; then
        echo "💾  Found existing disk '$DISK_NAME'. Attaching..."
        # Note: We must specify device-name so the startup script finds /dev/disk/by-id/google-pod-data-disk
        DISK_FLAG="--disk=name=$DISK_NAME,device-name=${DISK_NAME}-disk,auto-delete=no"
    else
        echo "💾  Disk '$DISK_NAME' not found. Creating new..."
        DISK_FLAG="--create-disk=name=$DISK_NAME,size=10GB,type=pd-balanced,device-name=${DISK_NAME}-disk,auto-delete=no,disk-resource-policy=pod-data-daily-backup"
    fi

    echo "🚀 Provisioning VM '$VM_NAME'..."
    gcloud compute instances create $VM_NAME \
        --image-family=ubuntu-2404-lts-amd64 \
        --image-project=ubuntu-os-cloud \
        --machine-type=e2-micro \
        --tags=https-server \
        --scopes=cloud-platform \
        --address=$STATIC_IP \
        $DISK_FLAG \
        --metadata-from-file startup-script=./startup.sh \
        --metadata ssh-keys="$USERNAME:$SSH_KEY" \
        --zone=$ZONE \
        --project=$PROJECT

    echo "✅ VM is Up! IP: $STATIC_IP"
    echo "   (Give it ~3 minutes for the startup script to initialize Pocketbase)"
}

down() {
    echo "🛑 Tearing down VM '$VM_NAME'..."
    
    # We delete the instance.
    # Because the disk was set to auto-delete=no, the data survives.
    # Because the IP is a separate regional resource, the IP survives.
    gcloud compute instances delete $VM_NAME \
        --zone=$ZONE \
        --project=$PROJECT \
        --quiet

    echo "✅ VM deleted. Static IP and Data Disk preserved."
}

# --- MAIN LOGIC ---

case "$1" in
    up)
        up
        ;;
    down)
        down
        ;;
    *)
        echo "Usage: $0 {up|down}"
        exit 1
        ;;
esac
