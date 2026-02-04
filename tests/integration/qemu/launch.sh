#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_DIR="$SCRIPT_DIR/.images"

# Check prerequisites
if ! command -v qemu-system-aarch64 >/dev/null 2>&1; then
  echo "ERROR: qemu-system-aarch64 not found. Install: sudo pacman -S qemu-system-aarch64"
  exit 1
fi

# Find UEFI firmware
UEFI_FW=""
for path in \
  /usr/share/edk2/aarch64/QEMU_EFI.fd \
  /usr/share/AAVMF/AAVMF_CODE.fd \
  /usr/share/qemu-efi-aarch64/QEMU_EFI.fd; do
  if [ -f "$path" ]; then
    UEFI_FW="$path"
    break
  fi
done

if [ -z "$UEFI_FW" ]; then
  echo "ERROR: UEFI firmware not found. Install: sudo pacman -S edk2-aarch64"
  exit 1
fi

echo "Launching QEMU aarch64 VM..."
echo "  UEFI: $UEFI_FW"
echo "  Image: $IMAGE_DIR/ngfw-test.qcow2"
echo "  SSH: localhost:2222"
echo "  Serial: this terminal"

exec qemu-system-aarch64 \
  -M virt \
  -cpu cortex-a53 \
  -smp 2 \
  -m 512 \
  -bios "$UEFI_FW" \
  -drive file="$IMAGE_DIR/ngfw-test.qcow2",format=qcow2,if=virtio,snapshot=on \
  -drive file="$IMAGE_DIR/seed.iso",format=raw,if=virtio \
  -netdev user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::8080-:80 \
  -device virtio-net-pci,netdev=net0 \
  -nographic
