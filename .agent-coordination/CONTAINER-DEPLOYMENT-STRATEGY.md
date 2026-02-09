# NGFW Container Deployment Strategy

**Author:** Claude Code
**Date:** 2026-02-09
**Status:** Architecture Design

---

## 🎯 Vision: Unified OCI Image Across All Targets

Build **once**, deploy **everywhere**:
- 🐳 Docker (local development)
- 🖥️ QEMU (VM testing)
- ☁️ Cloud VMs (Vultr/AWS/GCP as VPC gateway)
- 🔌 Routers (ASUS Merlin via Entware)

---

## 📦 Container Architecture

### Multi-Stage Build

```
┌─────────────────────────────────────┐
│ Stage 1: Builder (rust:alpine)      │
│ - Install build deps                │
│ - Cargo build --release             │
│ - Static linking for portability    │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Stage 2: Runtime (alpine:latest)    │
│ - Minimal runtime deps only         │
│ - Single binary: ngfw-agent         │
│ - Size: ~15-20MB (vs ~500MB native) │
└─────────────────────────────────────┘
```

### Why Alpine?

1. **Minimal Size:** 5MB base + 15MB binary = ~20MB total
2. **Security:** Smaller attack surface
3. **Portability:** musl libc for static linking
4. **GitHub Actions:** Excellent CI/CD support
5. **OCI Standard:** Works everywhere

---

## 🚀 Deployment Modes

### Mode 1: Agent Only (Default)

**Use Case:** Router monitoring, metrics collection

```yaml
# docker-compose.yml
services:
  agent:
    image: ngfw-agent:latest
    network_mode: bridge
    volumes:
      - ./config.toml:/etc/ngfw/config.toml:ro
```

**Capabilities:**
- WebSocket connection to API
- Metrics collection
- Status reporting
- Configuration sync (read-only)

---

### Mode 2: Gateway/Firewall (VPC Mode)

**Use Case:** Cloud VPC gateway, VyOS-style deployment

```yaml
# docker-compose.gateway.yml
services:
  agent:
    image: ngfw-agent:latest
    network_mode: host
    privileged: true
    cap_add:
      - NET_ADMIN
      - NET_RAW
```

**Capabilities:**
- Full network stack management
- iptables/nftables rules
- Routing table modification
- NAT configuration
- VPN gateway (WireGuard)

---

## 🎪 Deployment Targets

### 1. Docker (Local Development)

```bash
# Build
docker build -t ngfw-agent:latest packages/agent/

# Run (agent mode)
docker-compose -f packages/agent/docker-compose.yml up -d

# Run (gateway mode)
docker-compose -f packages/agent/docker-compose.yml \
               -f packages/agent/docker-compose.gateway.yml up -d

# Logs
docker-compose logs -f agent
```

---

### 2. QEMU (VM Testing)

#### Option A: Docker-in-QEMU
```bash
# Create VM with Docker
qemu-system-x86_64 \
  -m 1G \
  -hda ubuntu-cloud.qcow2 \
  -net nic -net user,hostfwd=tcp::2222-:22

# SSH and run container
ssh -p 2222 ubuntu@localhost
docker run -v ./config.toml:/etc/ngfw/config.toml ngfw-agent
```

#### Option B: OCI → VM Rootfs (Future)
```bash
# Convert container to VM rootfs
docker export $(docker create ngfw-agent) | tar -C rootfs -xf -

# Create QEMU image
qemu-img convert -f raw -O qcow2 rootfs.img ngfw-vm.qcow2

# Boot
qemu-system-x86_64 -hda ngfw-vm.qcow2
```

---

### 3. Cloud VM (Vultr/AWS/GCP)

#### Current: Ubuntu + Docker

```bash
# On Vultr instance (149.28.34.203)
apt update && apt install -y docker.io

# Pull and run
docker pull ghcr.io/danielbodnar/ngfw-agent:latest
docker run -d \
  --name ngfw-agent \
  --restart unless-stopped \
  -v /etc/ngfw/config.toml:/etc/ngfw/config.toml:ro \
  ghcr.io/danielbodnar/ngfw-agent:latest
```

#### Future: Container-Optimized OS

Use **Flatcar Container Linux** or **Fedora CoreOS**:
```bash
# Ignition config for automatic container deployment
{
  "systemd": {
    "units": [{
      "name": "ngfw-agent.service",
      "enabled": true,
      "contents": "..."
    }]
  }
}
```

---

### 4. Router (ASUS Merlin)

#### Option A: Entware + Docker
```bash
# Install Entware
# Install Docker via Entware
opkg install docker dockerd

# Run container
docker run -d \
  --privileged \
  --net host \
  -v /jffs/ngfw/config.toml:/etc/ngfw/config.toml:ro \
  ngfw-agent:latest
```

#### Option B: Native Binary (Fallback)
```bash
# Extract binary from container
docker create --name temp ngfw-agent:latest
docker cp temp:/usr/local/bin/ngfw-agent /opt/bin/
docker rm temp

# Run natively
/opt/bin/ngfw-agent --config /jffs/ngfw/config.toml
```

---

## 🔌 Plugin Architecture (Next Milestone)

### Provider Interface

```rust
// packages/agent/src/provider/mod.rs
pub trait RouterProvider: Send + Sync {
    /// Read current router configuration
    fn read_config(&self) -> Result<RouterConfig>;

    /// Apply firewall rules
    fn apply_firewall(&self, rules: &FirewallRules) -> Result<()>;

    /// Apply NAT rules
    fn apply_nat(&self, rules: &NatRules) -> Result<()>;

    /// Get system metrics
    fn get_metrics(&self) -> Result<Metrics>;

    /// Get interface status
    fn get_interfaces(&self) -> Result<Vec<Interface>>;
}
```

### Provider Implementations

```rust
// ASUS Merlin Provider
pub struct AsusMerlinProvider {
    nvram: NvramClient,
    wl: WirelessClient,
    iptables: IptablesClient,
}

// VyOS Provider
pub struct VyOSProvider {
    api_client: VyosApiClient,
    config_path: PathBuf,
}

// OPNsense Provider
pub struct OPNsenseProvider {
    api_client: OpnSenseApiClient,
    base_url: String,
}

// Generic Linux Provider (for cloud VMs)
pub struct GenericLinuxProvider {
    iptables: IptablesClient,
    ip: IpRouteClient,
}
```

### Configuration

```toml
[agent]
device_id = "demo-router-001"
api_url = "wss://api.ngfw.sh/agent/ws"

# Provider selection
[provider]
type = "asus-merlin"  # or "vyos", "opnsense", "pfsense", "generic-linux"

# Provider-specific config
[provider.asus-merlin]
nvram_path = "/usr/sbin/nvram"
wl_path = "/usr/sbin/wl"

[provider.vyos]
api_url = "https://localhost:8443"
config_path = "/config"

[provider.opnsense]
api_url = "https://192.168.1.1"
api_key = "..."
api_secret = "..."
```

---

## 🏗️ Build & CI/CD

### GitHub Actions

```yaml
name: Build Multi-Arch Container

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: packages/agent/Dockerfile
          platforms: linux/amd64,linux/arm64,linux/arm/v7
          tags: |
            ghcr.io/danielbodnar/ngfw-agent:latest
            ghcr.io/danielbodnar/ngfw-agent:${{ github.sha }}
          push: true
```

### Multi-Architecture Support

```dockerfile
# Support multiple platforms
FROM --platform=$BUILDPLATFORM rust:alpine AS builder
ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN case "$TARGETPLATFORM" in \
  "linux/amd64")   rustup target add x86_64-unknown-linux-musl ;; \
  "linux/arm64")   rustup target add aarch64-unknown-linux-musl ;; \
  "linux/arm/v7")  rustup target add armv7-unknown-linux-musleabihf ;; \
esac
```

---

## 📊 Comparison: Container vs Native

| Aspect | Native Build | Container |
|--------|-------------|-----------|
| **Size** | ~500MB (with Rust toolchain) | ~20MB (binary only) |
| **Build Time** | 5-10 minutes | 2-3 minutes (cached) |
| **Portability** | OS-specific | Works everywhere |
| **Updates** | Rebuild + redeploy | Pull new image |
| **Security** | Full system access | Isolated |
| **Debugging** | Easy (direct access) | Container logs |

---

## 🔄 Migration Plan

### Phase 1: Containerize Agent (This Week)
- [x] Create Dockerfile (Alpine-based)
- [x] Create docker-compose.yml (agent mode)
- [x] Create docker-compose.gateway.yml (VPC mode)
- [ ] Test locally with Docker
- [ ] Test on Vultr with Docker

### Phase 2: Update Deployment (Next Week)
- [ ] Update Vultr instance to use container
- [ ] Create GitHub Actions for multi-arch builds
- [ ] Publish to ghcr.io
- [ ] Update documentation

### Phase 3: QEMU Integration (Week 3)
- [ ] Create OCI → VM rootfs converter
- [ ] Test QEMU boot from container image
- [ ] Document QEMU deployment process

### Phase 4: Router Integration (Week 4)
- [ ] Test Entware + Docker on ASUS Merlin
- [ ] Create native binary extraction process
- [ ] Update router deployment guide

### Phase 5: Plugin Architecture (Month 2)
- [ ] Define RouterProvider trait
- [ ] Implement AsusMerlinProvider
- [ ] Implement VyOSProvider
- [ ] Implement GenericLinuxProvider
- [ ] Create provider selection logic

---

## 🎯 Success Metrics

1. **Single Image:** One OCI image works on Docker, QEMU, Cloud, Router
2. **Size:** < 25MB total image size
3. **Build Time:** < 3 minutes from cache
4. **Multi-Arch:** Support amd64, arm64, armv7
5. **Zero Config:** Works out-of-box with volume-mounted config

---

## 📚 References

- [OCI Image Spec](https://github.com/opencontainers/image-spec)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Alpine Linux](https://alpinelinux.org/)
- [VyOS Installation](https://docs.vyos.io/en/latest/installation/install.html)
- [Flatcar Container Linux](https://www.flatcar.org/)

---

**Next Steps:** Build and test container locally, then update Vultr deployment to use containerized approach.
