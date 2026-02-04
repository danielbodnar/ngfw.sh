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

# Convert VHD to qcow2 and patch for NoCloud datasource
if [ ! -f "$IMAGE_DIR/ngfw-test.qcow2" ] || [ "$IMAGE_DIR/$VHD_NAME" -nt "$IMAGE_DIR/ngfw-test.qcow2" ]; then
  echo "Converting VHD to qcow2..."
  qemu-img convert -f vpc -O qcow2 "$IMAGE_DIR/$VHD_NAME" "$IMAGE_DIR/ngfw-test.qcow2"
  qemu-img resize "$IMAGE_DIR/ngfw-test.qcow2" 2G

  # Patch cloud-init: the Azure image hardcodes datasource_list: ["Azure"]
  # We need NoCloud to read our cidata seed ISO instead
  echo "Patching cloud-init datasource (Azure -> NoCloud)..."
  sudo modprobe nbd max_part=8 2>/dev/null || true
  sudo qemu-nbd --connect=/dev/nbd0 "$IMAGE_DIR/ngfw-test.qcow2"
  sleep 1

  MOUNT_DIR=$(mktemp -d)
  sudo mount -o rw /dev/nbd0p2 "$MOUNT_DIR"

  # Replace the Azure-only datasource override at the end of cloud.cfg
  sudo sed -i 's/^datasource_list: \["Azure"\]$/datasource_list: ["NoCloud", "None"]/' "$MOUNT_DIR/etc/cloud/cloud.cfg"

  # Clear any cached cloud-init state from the base image
  sudo rm -rf "$MOUNT_DIR/var/lib/cloud/instances" "$MOUNT_DIR/var/lib/cloud/data" "$MOUNT_DIR/var/lib/cloud/instance" 2>/dev/null || true

  sudo umount "$MOUNT_DIR"
  rmdir "$MOUNT_DIR"
  sudo qemu-nbd --disconnect /dev/nbd0

  echo "Image converted, resized to 2GB, and patched for NoCloud"
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
