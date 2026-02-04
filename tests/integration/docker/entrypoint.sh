#!/bin/sh
set -e

# Mount mock sysfs over /sys (tmpfs already mounted by compose)
if [ -d /mock-sysfs ]; then
  cp -r /mock-sysfs/* /sys/ 2>/dev/null || true
fi

# Prepend mock binaries to PATH
export PATH="/mock-bins:$PATH"

# Wait for mock API to be ready
echo "Waiting for mock API..."
for i in $(seq 1 30); do
  if wget -q -O /dev/null http://mock-api:8787/health 2>/dev/null; then
    echo "Mock API is ready"
    break
  fi
  sleep 1
done

echo "Starting NGFW agent..."
exec /usr/local/bin/ngfw-agent --config /etc/ngfw/config.toml
