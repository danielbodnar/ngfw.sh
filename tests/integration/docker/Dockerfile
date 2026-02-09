# Stage 1: Build the agent binary for aarch64-unknown-linux-musl
FROM rust:1.85-bookworm AS builder

# Install cross-compilation toolchain for aarch64 musl
RUN apt-get update && apt-get install -y --no-install-recommends \
    musl-tools \
    gcc-aarch64-linux-gnu \
    && rm -rf /var/lib/apt/lists/*

RUN rustup target add aarch64-unknown-linux-musl

WORKDIR /build

# Copy entire workspace
COPY . .

# Build the agent binary targeting aarch64 musl
ENV CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_LINKER=aarch64-linux-gnu-gcc
RUN cargo build -p ngfw-agent --release --target aarch64-unknown-linux-musl

# Copy the binary to a known location
RUN cp /build/target/aarch64-unknown-linux-musl/release/ngfw-agent /ngfw-agent

# Stage 2: Runtime image
FROM --platform=linux/arm64 alpine:3.21

# Install wget for healthcheck and API readiness polling
RUN apk add --no-cache wget

# Copy the agent binary
COPY --from=builder /ngfw-agent /usr/local/bin/ngfw-agent

# Copy mock binaries and mock sysfs fixtures
COPY tests/integration/mock-bins /mock-bins
COPY tests/integration/mock-sysfs /mock-sysfs

# Copy agent configuration
COPY tests/integration/docker/config.toml /etc/ngfw/config.toml

# Copy entrypoint script
COPY tests/integration/docker/entrypoint.sh /entrypoint.sh

# Ensure executables have correct permissions
RUN chmod +x /usr/local/bin/ngfw-agent /entrypoint.sh \
    && chmod -R +x /mock-bins

# Create non-root user for test container
RUN addgroup -g 1000 ngfw && adduser -D -u 1000 -G ngfw ngfw
USER ngfw

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep -f ngfw-agent || exit 1

ENTRYPOINT ["/entrypoint.sh"]
