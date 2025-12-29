---
title: Quick Start
description: Get NGFW.sh running in 5 minutes
---

This guide will help you get NGFW.sh up and running quickly.

## Prerequisites

- A supported router or x86 device
- Internet connection
- NGFW.sh account (sign up at [ngfw.sh](https://ngfw.sh))

## Step 1: Create an Account

1. Visit [ngfw.sh](https://ngfw.sh) and click **Sign Up**
2. Sign in with Google, GitHub, or create an account with email
3. Choose your subscription plan (Free tier available)

## Step 2: Register Your Device

1. From the dashboard, click **Add Device**
2. Enter a name for your device (e.g., "Home Router")
3. Copy the generated API key

## Step 3: Install the Agent

### Using the Install Script

```bash
curl -fsSL https://get.ngfw.sh | sh -s -- --api-key YOUR_API_KEY
```

### Manual Installation

Download the appropriate package for your platform:

```bash
# For OpenWrt
opkg install ngfw-agent

# For Debian/Ubuntu
apt install ngfw-agent

# For Alpine
apk add ngfw-agent
```

## Step 4: Configure Your Network

Once the agent connects, you'll see your device online in the dashboard. From there you can:

1. **Configure WAN** - Set up your internet connection (DHCP, Static, PPPoE)
2. **Set up WiFi** - Create wireless networks with WPA3 security
3. **Enable DNS filtering** - Block ads and malware at the DNS level
4. **Create firewall rules** - Control traffic between zones

## Next Steps

- [WAN Configuration](/configuration/wan) - Configure your internet connection
- [Firewall Rules](/security/firewall) - Set up security policies
- [VPN Server](/services/vpn-server) - Enable remote access
