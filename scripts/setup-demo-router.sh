#!/usr/bin/env bash
set -euo pipefail

# NGFW Demo Router Automated Setup Script
# Instance: ngfw-demo-router (<PUBLIC_IP>)
#
# This script automates the installation and configuration of the NGFW
# router agent on a fresh Ubuntu 22.04 instance.
#
# Usage (recommended — download, inspect, then execute):
#   VERSION="v0.1.0"  # Pin to a specific release tag
#   curl -fsSLo setup-demo-router.sh \
#     "https://raw.githubusercontent.com/danielbodnar/ngfw.sh/${VERSION}/.agent-coordination/setup-demo-router.sh"
#   chmod +x setup-demo-router.sh
#   less setup-demo-router.sh   # Inspect before running
#   sudo ./setup-demo-router.sh

NGFW_VERSION="v0.1.0"
AGENT_USER="root"
INSTALL_DIR="/opt/ngfw.sh"
BIN_DIR="/usr/local/bin"
CONFIG_DIR="/etc/ngfw"
SERVICE_NAME="ngfw-agent"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

header() {
    echo ""
    echo "=================================================="
    echo "$1"
    echo "=================================================="
    echo ""
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

header "NGFW Demo Router Setup ${NGFW_VERSION}"

# Update system
log_info "Updating system packages..."
apt update -qq
apt upgrade -y -qq

# Install dependencies
log_info "Installing dependencies..."
apt install -y -qq \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    htop \
    net-tools

# Install Rust
log_info "Installing Rust toolchain..."
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    # shellcheck disable=SC1090
    source "$HOME/.cargo/env"
    log_info "Rust installed: $(rustc --version)"
else
    log_warn "Rust already installed: $(rustc --version)"
fi

# Add cargo to PATH if not already
export PATH="$HOME/.cargo/bin:$PATH"

# Add target
log_info "Adding build target..."
rustup target add x86_64-unknown-linux-gnu

# Clone repository
log_info "Cloning NGFW repository..."
if [ ! -d "$INSTALL_DIR" ]; then
    git clone https://github.com/danielbodnar/ngfw.sh.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    log_info "Repository cloned to $INSTALL_DIR"
else
    log_warn "Repository already exists at $INSTALL_DIR"
    cd "$INSTALL_DIR"
    git pull
    log_info "Repository updated"
fi

# Build agent
log_info "Building agent (this may take 5-10 minutes)..."
cd "$INSTALL_DIR/packages/agent"
cargo build --release --quiet
log_info "Agent built successfully"

# Install agent binary
log_info "Installing agent binary..."
cp target/release/ngfw-agent "$BIN_DIR/"
chmod +x "$BIN_DIR/ngfw-agent"
log_info "Agent installed to $BIN_DIR/ngfw-agent"

# Create config directory
log_info "Creating configuration directory..."
mkdir -p "$CONFIG_DIR"

# Create example configuration
if [ ! -f "$CONFIG_DIR/config.toml" ]; then
    log_info "Creating example configuration..."
    cat > "$CONFIG_DIR/config.toml" <<'EOF'
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
    chmod 600 "$CONFIG_DIR/config.toml"
    log_warn "Created example config at $CONFIG_DIR/config.toml"
    log_warn "You MUST update api_key and owner_id before starting the service"
else
    log_warn "Configuration already exists at $CONFIG_DIR/config.toml"
fi

# Create systemd service
log_info "Creating systemd service..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=NGFW Router Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${AGENT_USER}
ExecStart=${BIN_DIR}/ngfw-agent --config ${CONFIG_DIR}/config.toml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload
log_info "Systemd service created"

# Enable service (but don't start yet)
systemctl enable "$SERVICE_NAME"
log_info "Service enabled (will start on boot)"

header "Setup Complete!"

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Register device in portal:"
echo "   - Go to https://portal.ngfw.sh"
echo "   - Navigate to Devices → Register New Device"
echo "   - Device ID: demo-router-001"
echo "   - Copy the generated API key"
echo ""
echo "2. Update configuration:"
echo "   nano $CONFIG_DIR/config.toml"
echo "   - Set api_key from portal"
echo "   - Set owner_id from portal"
echo ""
echo "3. Start the service:"
echo "   systemctl start $SERVICE_NAME"
echo ""
echo "4. Check logs:"
echo "   journalctl -u $SERVICE_NAME -f"
echo ""
echo "5. Verify connection:"
echo "   - Portal should show device as 'Online'"
echo "   - Metrics should update every 5 seconds"
echo ""

log_warn "Do NOT start the service until you've configured API credentials!"

echo ""
echo "📚 Documentation:"
echo "   - Deployment Guide: $INSTALL_DIR/.agent-coordination/DEPLOYMENT-GUIDE.md"
echo "   - Instance Details: $INSTALL_DIR/.agent-coordination/VULTR-INSTANCE-DETAILS.md"
echo ""
