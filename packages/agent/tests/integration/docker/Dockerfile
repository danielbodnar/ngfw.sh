# Stage 1: Cross-compile agent for aarch64
FROM ghcr.io/cross-rs/aarch64-unknown-linux-musl:main AS builder
WORKDIR /src
COPY . .
RUN cargo build -p ngfw-agent --release --target aarch64-unknown-linux-musl
RUN cp target/aarch64-unknown-linux-musl/release/ngfw-agent /ngfw-agent

# Stage 2: Runtime (Alpine aarch64 via QEMU user-mode)
FROM --platform=linux/arm64 alpine:3.21
RUN apk add --no-cache wget
COPY --from=builder /ngfw-agent /usr/local/bin/ngfw-agent
COPY tests/integration/mock-bins/ /mock-bins/
COPY tests/integration/mock-sysfs/ /mock-sysfs/
COPY tests/integration/docker/config.toml /etc/ngfw/config.toml
COPY tests/integration/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /mock-bins/* /entrypoint.sh /usr/local/bin/ngfw-agent

ENTRYPOINT ["/entrypoint.sh"]
