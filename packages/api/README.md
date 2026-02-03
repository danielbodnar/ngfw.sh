# NGFW.sh API Server (Rust)

> **Status: Work in Progress**
>
> This Rust-based API server is not yet functional. The codebase was migrated from the BitRouter project and requires updates to compile with current versions of the `workers-rs` crate.

## Overview

This package contains a Rust implementation of the NGFW.sh API designed to run on Cloudflare Workers. It provides:

- RESTful API endpoints for router management (as defined in AGENTS.md)
- WebSocket RPC for real-time communication with router agents
- Authentication via Clerk JWT validation
- Storage via Cloudflare KV, D1, and R2

## Required Work

### 1. Update to workers-rs v0.7+

The current code was written for an older version of `workers-rs`. The v0.7 release includes breaking changes:

- `DurableObject::fetch()` signature changed from `&mut self` to `&self`
- Requires interior mutability patterns (e.g., `RefCell`, `Mutex`) for state management
- The `#[durable_object]` macro is no longer required on impl blocks (only on struct)

### 2. Fix AgentConnection Durable Object

The `AgentConnection` Durable Object needs refactoring:

- Remove `get_web_sockets()` calls (API doesn't exist)
- Update state management to use interior mutability
- Update WebSocket handling to match current API

### 3. Implement Error Conversions

Add `From<worker::Error>` implementation for `ApiError`.

### 4. Fix Type Mismatches

Several handler functions have type mismatches that need resolution.

## Deployment Configuration

The `wrangler.toml` is configured with:

- **Route**: `api.ngfw.sh`
- **D1 Database**: `ngfw-db` (49752c13-9ae5-416d-9e69-bc34cc603c8d)
- **KV Namespaces**: DEVICES, CONFIGS, SESSIONS, CACHE
- **R2 Buckets**: ngfw-firmware, ngfw-backups, ngfw-reports
- **Durable Objects**: AgentConnection (for WebSocket handling)

## Alternative: Use TypeScript API

While this Rust API is being fixed, the TypeScript schema package at `packages/schema` provides:

- OpenAPI documentation at `specs.ngfw.sh`
- Sample endpoint implementations
- Can be extended to implement the full API if needed

## Development

Once fixed, development commands:

```bash
# Build
bun run build:api

# Local development
bun run dev:api

# Deploy
bun run deploy:api
```
