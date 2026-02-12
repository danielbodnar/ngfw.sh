# ngfw-protocol

Shared RPC protocol types for NGFW.sh agent-server communication.

This crate provides the canonical definitions for all message types exchanged over WebSocket between the router agent (`ngfw-agent`) and the cloud API (`ngfw-api`).

## Features

| Feature  | Description                                          |
| -------- | ---------------------------------------------------- |
| `js`     | UUID v4 generation for WASM targets (Cloudflare Workers) |
| `native` | UUID v4 generation for native targets (router agent) |

## Dependencies

- **serde** / **serde_json** — Serialization and deserialization of protocol types
- **uuid** — Device and message identifiers
- **utoipa** — OpenAPI 3.1 schema generation from Rust types (with `uuid` and `chrono` support)

## Usage

Add the dependency with the appropriate feature flag:

```toml
# For Cloudflare Workers (WASM)
ngfw-protocol = { path = "../protocol", features = ["js"] }

# For native targets (router agent)
ngfw-protocol = { path = "../protocol", features = ["native"] }
```

## Modules

| Module   | Description                                  |
| -------- | -------------------------------------------- |
| `rpc`    | RPC message envelope and message types       |
| `agent`  | Agent mode and configuration types           |
| `fleet`  | Fleet management models (devices, commands, webhooks) |
| `system` | System status, hardware, and firmware models |
