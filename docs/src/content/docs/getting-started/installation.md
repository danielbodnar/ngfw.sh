---
title: Installation
description: Detailed installation instructions for NGFW.sh agent
---

## Supported Platforms

NGFW.sh agent runs on the following platforms:

| Platform | Architecture | Status |
|----------|--------------|--------|
| OpenWrt 23.x | mipsel, arm, aarch64 | Supported |
| Debian 12+ | amd64, arm64 | Supported |
| Ubuntu 22.04+ | amd64, arm64 | Supported |
| Alpine 3.18+ | amd64, arm64 | Supported |

## Hardware Requirements

- **CPU**: 500MHz+ (dual-core recommended)
- **RAM**: 128MB minimum, 256MB recommended
- **Storage**: 32MB for agent, 128MB for logs

## Installation Methods

### Quick Install (Recommended)

```bash
curl -fsSL https://get.ngfw.sh | sh -s -- --api-key YOUR_API_KEY
```

### OpenWrt

```bash
# Add the NGFW.sh repository
echo "src/gz ngfw https://packages.ngfw.sh/openwrt/$(. /etc/openwrt_release && echo $DISTRIB_RELEASE)" >> /etc/opkg/customfeeds.conf

# Update and install
opkg update
opkg install ngfw-agent

# Configure
uci set ngfw.agent.api_key='YOUR_API_KEY'
uci commit ngfw

# Start the service
/etc/init.d/ngfw-agent start
/etc/init.d/ngfw-agent enable
```

### Debian/Ubuntu

```bash
# Add repository
curl -fsSL https://packages.ngfw.sh/gpg | sudo gpg --dearmor -o /usr/share/keyrings/ngfw.gpg
echo "deb [signed-by=/usr/share/keyrings/ngfw.gpg] https://packages.ngfw.sh/apt stable main" | sudo tee /etc/apt/sources.list.d/ngfw.list

# Install
sudo apt update
sudo apt install ngfw-agent

# Configure
sudo ngfw-agent configure --api-key YOUR_API_KEY

# Start
sudo systemctl enable --now ngfw-agent
```

### Docker

```bash
docker run -d \
  --name ngfw-agent \
  --network host \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  -e NGFW_API_KEY=YOUR_API_KEY \
  ghcr.io/danielbodnar/ngfw-agent:latest
```

## Verification

After installation, verify the agent is running:

```bash
# Check service status
systemctl status ngfw-agent

# View logs
journalctl -u ngfw-agent -f

# Test connectivity
ngfw-agent status
```

Your device should appear as "Online" in the NGFW.sh dashboard within 30 seconds.

## Troubleshooting

### Agent won't start

Check the logs for errors:
```bash
journalctl -u ngfw-agent --no-pager -n 50
```

### Connection issues

Verify outbound connectivity to the API:
```bash
curl -I https://api.ngfw.sh/health
```

### Firewall conflicts

If you have existing iptables rules, the agent may need to be configured to work alongside them. See [Advanced Configuration](/configuration/advanced) for details.
