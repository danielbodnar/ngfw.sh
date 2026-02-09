# NGFW Demo Router Deployment Guide

## Vultr Deployment Instructions

Since automated Vultr API deployment is not available through current tooling, follow these manual steps to deploy `ngfw-demo-router`:

### Prerequisites
- Vultr account with API access
- SSH key configured
- Domain/subdomain for router access (optional)

### Step 1: Create Vultr Instance

```bash
# Via Vultr CLI (if installed)
vultr-cli instance create \
  --region ewr \
  --plan vc2-1c-1gb \
  --os 387 \
  --label ngfw-demo-router \
  --hostname ngfw-demo-router \
  --tag demo,ngfw,testing

# Or via Web UI:
# 1. Go to https://my.vultr.com/deploy
# 2. Choose Cloud Compute
# 3. Location: New York (NJ) or closest
# 4. Server Type: Ubuntu 22.04 LTS
# 5. Server Size: 1 CPU, 1GB RAM ($6/mo)
# 6. Hostname: ngfw-demo-router
# 7. Label: ngfw-demo-router
```

### Step 2: Install Dependencies

SSH into the instance and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
  curl \
  git \
  build-essential \
  pkg-config \
  libssl-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Add ASUS Merlin toolchain target
rustup target add aarch64-unknown-linux-musl
```

### Step 3: Clone and Build Agent

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/danielbodnar/ngfw.sh.git
cd ngfw.sh

# Build agent for production
cd packages/agent
cargo build --release --target aarch64-unknown-linux-musl

# Copy binary to system location
sudo cp target/aarch64-unknown-linux-musl/release/ngfw-agent /usr/local/bin/
sudo chmod +x /usr/local/bin/ngfw-agent
```

### Step 4: Configure Agent

```bash
# Create config directory
sudo mkdir -p /etc/ngfw

# Create configuration (replace with actual values)
sudo tee /etc/ngfw/config.toml << 'EOF'
[agent]
device_id = "demo-router-001"
api_url = "wss://api.ngfw.sh/agent/ws"
# Get these from your NGFW portal after registering the device
api_key = "YOUR_API_KEY_HERE"
owner_id = "YOUR_USER_ID_HERE"

[mode]
default = "shadow"

[adapters]
nvram = true
iptables = true
dnsmasq = true
wireless = true
wireguard = true
system = true
EOF

sudo chmod 600 /etc/ngfw/config.toml
```

### Step 5: Install Mock Binaries (for testing)

```bash
# Copy mock binaries for demo/testing
sudo cp /opt/ngfw.sh/tests/integration/mock-bins/* /usr/local/bin/
sudo chmod +x /usr/local/bin/nvram
sudo chmod +x /usr/local/bin/wl
sudo chmod +x /usr/local/bin/ip
sudo chmod +x /usr/local/bin/iptables
sudo chmod +x /usr/local/bin/service

# Create mock sysfs (optional)
sudo mkdir -p /sys/class/thermal/thermal_zone0
echo "50000" | sudo tee /sys/class/thermal/thermal_zone0/temp
```

### Step 6: Create Systemd Service

```bash
sudo tee /etc/systemd/system/ngfw-agent.service << 'EOF'
[Unit]
Description=NGFW Router Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/ngfw-agent --config /etc/ngfw/config.toml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ngfw-agent
sudo systemctl start ngfw-agent

# Check status
sudo systemctl status ngfw-agent
sudo journalctl -u ngfw-agent -f
```

### Step 7: Configure Firewall

```bash
# Allow WebSocket connections
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Step 8: Register Device in Portal

1. Go to https://portal.ngfw.sh (or your portal instance)
2. Sign in with Clerk
3. Navigate to "Devices" → "Register New Device"
4. Enter device details:
   - **Name:** Demo Router
   - **Device ID:** demo-router-001
   - **Model:** RT-AX92U (or select appropriate)
5. Copy the generated API key
6. Update `/etc/ngfw/config.toml` with the API key
7. Restart agent: `sudo systemctl restart ngfw-agent`

### Step 9: Verify Connection

```bash
# Check agent logs
sudo journalctl -u ngfw-agent -n 50

# Should see:
# - WebSocket connection established
# - Authentication successful
# - Status message sent
# - Metrics collection started

# Check from portal:
# - Device should show as "Online"
# - Metrics should be updating every 5 seconds
# - Device details should be populated
```

## Alternative: Cloudflare Container Deployment

If you prefer using Cloudflare infrastructure:

```bash
# Build for x86_64 (Cloudflare Containers)
cd packages/agent
cargo build --release

# Create container
# (Use Cloudflare Containers MCP tools)
```

## Testing UI Connections

Once the router is deployed and online:

### Test Portal (Original)

```bash
cd packages/portal
bun install
bun run dev

# Open http://localhost:3000
# Should connect to deployed router
```

### Test Portal-Astro

```bash
cd packages/portal-astro
bun install
bun run dev

# Open http://localhost:4321
# Should connect to deployed router
```

## Troubleshooting

### Agent Won't Start

```bash
# Check logs
sudo journalctl -u ngfw-agent -n 100 --no-pager

# Common issues:
# - Invalid API key → Check portal registration
# - Wrong WebSocket URL → Verify config.toml
# - Network issues → Check firewall rules
```

### Connection Fails

```bash
# Test WebSocket endpoint
curl -i \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://api.ngfw.sh/agent/ws?device_id=demo-router-001

# Should return 101 Switching Protocols
```

### Portal Can't See Device

1. Verify device is registered in portal
2. Check agent is running: `systemctl status ngfw-agent`
3. Check API key matches between portal and config
4. Check WebSocket URL is correct
5. Check firewall allows outbound WebSocket connections

## Monitoring

```bash
# Watch agent logs
sudo journalctl -u ngfw-agent -f

# Watch system resources
htop

# Check WebSocket connection
sudo ss -tunap | grep ngfw-agent
```

## Cleanup

```bash
# Stop and disable service
sudo systemctl stop ngfw-agent
sudo systemctl disable ngfw-agent

# Remove files
sudo rm /usr/local/bin/ngfw-agent
sudo rm -rf /etc/ngfw
sudo rm /etc/systemd/system/ngfw-agent.service

# On Vultr: Delete instance from web UI
```

---

**Note:** This guide uses the compiled agent binary. For a production-ready firmware image on actual ASUS routers, follow the firmware build process in `packages/firmware/README.md`.
