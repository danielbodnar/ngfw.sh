#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_DIR="$SCRIPT_DIR/.images"
mkdir -p "$IMAGE_DIR"

ALPINE_VERSION="3.21"
ARCH="aarch64"
BASE_URL="https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_VERSION}/releases/${ARCH}"
IMAGE_NAME="alpine-virt-${ALPINE_VERSION}.0-${ARCH}.qcow2"

echo "=== Building QEMU VM Image ==="

# Download Alpine cloud image if not cached
if [ ! -f "$IMAGE_DIR/$IMAGE_NAME" ]; then
  echo "Downloading Alpine ${ALPINE_VERSION} cloud image for ${ARCH}..."
  wget -O "$IMAGE_DIR/$IMAGE_NAME" "${BASE_URL}/alpine-virt-${ALPINE_VERSION}.0-${ARCH}.qcow2"
fi

# Create working copy
cp "$IMAGE_DIR/$IMAGE_NAME" "$IMAGE_DIR/ngfw-test.qcow2"

# Resize disk to 2GB
qemu-img resize "$IMAGE_DIR/ngfw-test.qcow2" 2G

# Generate cloud-init ISO (NoCloud datasource)
echo "Generating cloud-init seed ISO..."
SEED_DIR=$(mktemp -d)
cp "$SCRIPT_DIR/user-data.yaml" "$SEED_DIR/user-data"
cat > "$SEED_DIR/meta-data" << 'EOF'
instance-id: ngfw-test-001
local-hostname: ngfw-test-router
EOF

# Use mkisofs/genisoimage to create the seed ISO
if command -v mkisofs >/dev/null 2>&1; then
  mkisofs -output "$IMAGE_DIR/seed.iso" -volid cidata -joliet -rock "$SEED_DIR/"
elif command -v genisoimage >/dev/null 2>&1; then
  genisoimage -output "$IMAGE_DIR/seed.iso" -volid cidata -joliet -rock "$SEED_DIR/"
else
  echo "ERROR: mkisofs or genisoimage required. Install: sudo pacman -S cdrtools"
  exit 1
fi

rm -rf "$SEED_DIR"

echo "VM image ready: $IMAGE_DIR/ngfw-test.qcow2"
echo "Cloud-init seed: $IMAGE_DIR/seed.iso"
