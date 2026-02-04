#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_DIR="$SCRIPT_DIR/.images"
mkdir -p "$IMAGE_DIR"

ALPINE_VERSION="3.21"
ALPINE_PATCH="6"
ARCH="aarch64"
BASE_URL="https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_VERSION}/releases/cloud"
VHD_NAME="azure_alpine-${ALPINE_VERSION}.${ALPINE_PATCH}-${ARCH}-uefi-cloudinit-r0.vhd"

echo "=== Building QEMU VM Image ==="

# Download Alpine cloud image (VHD) if not cached
if [ ! -f "$IMAGE_DIR/$VHD_NAME" ]; then
  echo "Downloading Alpine ${ALPINE_VERSION}.${ALPINE_PATCH} cloud image for ${ARCH}..."
  wget -O "$IMAGE_DIR/$VHD_NAME" "${BASE_URL}/${VHD_NAME}"
fi

# Convert VHD to qcow2 if needed
if [ ! -f "$IMAGE_DIR/ngfw-test.qcow2" ] || [ "$IMAGE_DIR/$VHD_NAME" -nt "$IMAGE_DIR/ngfw-test.qcow2" ]; then
  echo "Converting VHD to qcow2..."
  qemu-img convert -f vpc -O qcow2 "$IMAGE_DIR/$VHD_NAME" "$IMAGE_DIR/ngfw-test.qcow2"

  # Resize disk to 2GB
  qemu-img resize "$IMAGE_DIR/ngfw-test.qcow2" 2G
  echo "Image converted and resized to 2GB"
else
  echo "Using cached qcow2 image"
fi

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
