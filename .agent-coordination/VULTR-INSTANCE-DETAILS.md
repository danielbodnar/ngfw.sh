# NGFW Demo Router - Vultr Instance Details

**Created:** 2026-02-09 19:02:48 UTC
**Status:** ✅ ACTIVE AND RUNNING

---

## 🖥️ Instance Information

| Property | Value |
|----------|-------|
| **Instance ID** | `89e10c79-a178-4dca-9606-741715b5b2c8` |
| **Label** | `ngfw-demo-router` |
| **IP Address** | `149.28.34.203` |
| **IPv6** | `2001:19f0:1000:fecc::` |
| **Region** | `ewr` (New Jersey, US) |
| **OS** | Ubuntu 22.04 x64 |
| **Plan** | vc2-1c-1gb (1 CPU, 1GB RAM, 25GB SSD) |
| **Cost** | $5.00/month |
| **Tags** | demo, ngfw, testing |

---

## 🔐 Access Credentials

```bash
# SSH Connection
ssh root@149.28.34.203

# Root Password
# Retrieve from Vultr dashboard or secrets manager — never store in version control
```

⚠️ **SECURITY NOTE:** Credentials must be retrieved from the Vultr dashboard or a secrets manager. Change the root password immediately after first login:
```bash
passwd
```

---

## 🚀 Quick Setup Commands

### Step 1: Connect to Instance

```bash
ssh root@149.28.34.203
# Enter password from Vultr dashboard or secrets manager
```

### Step 2: Run Automated Setup

```bash
# Download, inspect, and run setup script
VERSION="v0.1.0"
curl -fsSLo setup-demo-router.sh \
  "https://raw.githubusercontent.com/danielbodnar/ngfw.sh/${VERSION}/.agent-coordination/setup-demo-router.sh"
chmod +x setup-demo-router.sh
less setup-demo-router.sh   # Inspect before running
sudo ./setup-demo-router.sh

# Or manually:
apt update && apt upgrade -y
apt install -y curl git build-essential pkg-config libssl-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
cd /opt
git clone https://github.com/danielbodnar/ngfw.sh.git
cd ngfw.sh/packages/agent
cargo build --release
cp target/release/ngfw-agent /usr/local/bin/
chmod +x /usr/local/bin/ngfw-agent
```

### Step 3: Configure Agent

```bash
# Create config directory
mkdir -p /etc/ngfw

# Create configuration file
cat > /etc/ngfw/config.toml <<'EOF'
[agent]
device_id = "demo-router-001"
api_url = "wss://api.ngfw.sh/agent/ws"
# TODO: Get these from portal after registering device
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

chmod 600 /etc/ngfw/config.toml
```

### Step 4: Create Systemd Service

```bash
cat > /etc/systemd/system/ngfw-agent.service <<'EOF'
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
systemctl daemon-reload
systemctl enable ngfw-agent
# Don't start yet - need to configure API credentials first
# systemctl start ngfw-agent
```

### Step 5: Register Device in Portal

1. Go to https://portal.ngfw.sh (or your portal instance)
2. Sign in with Clerk
3. Navigate to "Devices" → "Register New Device"
4. Enter device details:
   - **Name:** Demo Router
   - **Device ID:** demo-router-001
   - **Model:** RT-AX92U (or select appropriate)
5. Copy the generated API key
6. Update `/etc/ngfw/config.toml` with the API key
7. Start agent: `systemctl start ngfw-agent`

### Step 6: Verify Connection

```bash
# Check agent logs
journalctl -u ngfw-agent -f

# Should see:
# - WebSocket connection established
# - Authentication successful
# - Status message sent
# - Metrics collection started

# Check service status
systemctl status ngfw-agent
```

---

## 🔧 Management Commands

### View Logs
```bash
# Real-time logs
journalctl -u ngfw-agent -f

# Last 100 lines
journalctl -u ngfw-agent -n 100

# Since last boot
journalctl -u ngfw-agent -b
```

### Control Service
```bash
# Start
systemctl start ngfw-agent

# Stop
systemctl stop ngfw-agent

# Restart
systemctl restart ngfw-agent

# Status
systemctl status ngfw-agent
```

### Rebuild Agent
```bash
cd /opt/ngfw.sh
git pull
cd packages/agent
cargo build --release
cp target/release/ngfw-agent /usr/local/bin/
systemctl restart ngfw-agent
```

---

## 🧪 Testing

### Test WebSocket Connection
```bash
curl -i \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://api.ngfw.sh/agent/ws?device_id=demo-router-001

# Should return: 101 Switching Protocols
```

### Test from Portal

1. Open portal in browser
2. Navigate to "Devices"
3. Device should show as "Online"
4. Metrics should update every 5 seconds
5. Device details should be populated

---

## 🗑️ Cleanup

### Stop and Remove Service
```bash
systemctl stop ngfw-agent
systemctl disable ngfw-agent
rm /etc/systemd/system/ngfw-agent.service
systemctl daemon-reload
```

### Delete Instance
```bash
# Via CLI
vultr instance delete 89e10c79-a178-4dca-9606-741715b5b2c8

# Or via Web UI
# Go to https://my.vultr.com and delete from dashboard
```

---

## 📊 Monitoring

### Resource Usage
```bash
# CPU and memory
htop

# Disk usage
df -h

# Network connections
ss -tunap | grep ngfw-agent
```

### Agent Metrics
```bash
# Check if agent is sending metrics
journalctl -u ngfw-agent | grep METRICS

# Check connection status
journalctl -u ngfw-agent | grep AUTH_OK
```

---

## 🐛 Troubleshooting

### Agent Won't Start

```bash
# Check logs for errors
journalctl -u ngfw-agent -n 100 --no-pager

# Common issues:
# - Invalid API key → Check portal registration
# - Wrong WebSocket URL → Verify config.toml
# - Network issues → Check firewall rules
```

### Connection Fails

```bash
# Test network connectivity
ping api.ngfw.sh
curl -I https://api.ngfw.sh

# Check DNS resolution
nslookup api.ngfw.sh

# Verify WebSocket endpoint
curl -i https://api.ngfw.sh/health
```

### Portal Can't See Device

1. Verify device is registered in portal
2. Check agent is running: `systemctl status ngfw-agent`
3. Check API key matches between portal and config
4. Check WebSocket URL is correct
5. Check firewall allows outbound WebSocket connections

---

## 📝 Notes

- **Build Time:** Initial Rust build takes 5-10 minutes
- **Memory Usage:** Agent uses ~50-100MB RAM
- **CPU Usage:** <1% idle, ~5% during metrics collection
- **Network:** ~1KB/s for metrics (5-second interval)
- **Logs:** Rotated automatically by journald

---

## 🔗 Related Files

- **Deployment Guide:** `.agent-coordination/DEPLOYMENT-GUIDE.md`
- **Agent Source:** `packages/agent/`
- **Configuration Example:** `packages/agent/config.example.toml`
- **Protocol Spec:** `packages/protocol/`

---

**Instance Created By:** Claude Code (Automated Deployment)
**Created At:** 2026-02-09 19:02:48 UTC
**Last Updated:** 2026-02-09 19:05:00 UTC
**Status:** READY FOR CONFIGURATION
