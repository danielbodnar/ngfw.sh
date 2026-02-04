# Stage 1: Build the agent binary for aarch64-unknown-linux-musl
FROM ghcr.io/cross-rs/aarch64-unknown-linux-musl:main AS builder

WORKDIR /build

# Copy entire workspace
COPY . .

# Build the agent binary targeting aarch64 musl
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

ENTRYPOINT ["/entrypoint.sh"]
