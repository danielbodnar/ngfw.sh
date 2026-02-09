# NGFW Router Agent - Multi-stage Container Build
#
# This Dockerfile creates a minimal OCI image that can be deployed to:
# - Docker (local development)
# - QEMU (VM testing)
# - Cloud VMs (Vultr, AWS, GCP as VPC gateway)
# - Routers (via Entware + Docker)
#
# Build:
#   docker build -t ngfw-agent:latest .
#
# Run:
#   docker run -v ./config.toml:/etc/ngfw/config.toml ngfw-agent:latest

# ============================================================================
# Stage 1: Builder
# ============================================================================
FROM rust:1.85-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    openssl-dev \
    openssl-libs-static \
    pkgconfig

# Set working directory
WORKDIR /build

# Copy workspace dependencies first (for layer caching)
COPY Cargo.toml Cargo.lock ./
COPY packages/protocol/Cargo.toml ./packages/protocol/
COPY packages/agent/Cargo.toml ./packages/agent/

# Create dummy source files to cache dependencies
RUN mkdir -p packages/protocol/src packages/agent/src && \
    echo "fn main() {}" > packages/agent/src/main.rs && \
    echo "pub fn dummy() {}" > packages/protocol/src/lib.rs

# Build dependencies (cached layer)
RUN cargo build --release --manifest-path packages/agent/Cargo.toml

# Remove dummy source
RUN rm -rf packages/protocol/src packages/agent/src

# Copy actual source
COPY packages/protocol ./packages/protocol
COPY packages/agent ./packages/agent

# Build agent (with static linking for portability)
RUN cargo build --release --manifest-path packages/agent/Cargo.toml && \
    strip packages/agent/target/release/ngfw-agent

# ============================================================================
# Stage 2: Runtime
# ============================================================================
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    tini

# Create non-root user (security)
RUN addgroup -g 1000 ngfw && \
    adduser -D -u 1000 -G ngfw ngfw

# Copy agent binary from builder
COPY --from=builder /build/packages/agent/target/release/ngfw-agent /usr/local/bin/ngfw-agent
RUN chmod +x /usr/local/bin/ngfw-agent

# Create config directory
RUN mkdir -p /etc/ngfw && chown ngfw:ngfw /etc/ngfw

# Set working directory
WORKDIR /etc/ngfw

# Use tini as init (proper signal handling)
ENTRYPOINT ["/sbin/tini", "--"]

# Run as non-root (can override with --user root if needed)
USER ngfw

# Default command
CMD ["/usr/local/bin/ngfw-agent", "--config", "/etc/ngfw/config.toml"]

# Metadata
LABEL maintainer="daniel.bodnar@gmail.com"
LABEL version="0.1.0"
LABEL description="NGFW Router Agent - Multi-platform firewall/router management"
LABEL org.opencontainers.image.source="https://github.com/danielbodnar/ngfw.sh"
