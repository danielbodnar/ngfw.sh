# ADR 001: Rust → OpenAPI → Zod Architecture

## Status

**Accepted** — Prototype validated, recommended for production adoption.

## Context

The NGFW.sh platform has two API servers (Rust workers-rs API and TypeScript Hono API) with separate type definitions that must stay synchronized. Manual type synchronization between Rust protocol types and TypeScript frontend types is error-prone and creates maintenance burden.

We evaluated an architecture where **Rust types are the single source of truth**, generating OpenAPI 3.1 specs that then generate TypeScript/Zod schemas for the portal frontend.

## Decision

Adopt the Rust → OpenAPI → Zod pipeline:

```
packages/protocol/src/*.rs          (source of truth)
    │ #[derive(ToSchema)]
    ▼ utoipa (compile-time)
packages/portal-astro/src/lib/api/generated/openapi.json
    │
    ▼ openapi-zod-client (build-time)
packages/portal-astro/src/lib/api/generated/client.ts
    ├── Zod schemas (runtime validation)
    ├── TypeScript types (compile-time safety)
    └── Zodios API client (type-safe HTTP calls)
```

### Generation Command

```bash
# From packages/portal-astro:
npm run generate:api

# From repository root:
npm run generate:api
```

This single command:
1. Compiles the `generate-openapi` binary from `packages/protocol`
2. Runs it to produce `openapi.json` (OpenAPI 3.1 spec)
3. Feeds it to `openapi-zod-client` to produce `client.ts`

## Architecture Components

### 1. Rust Protocol Types (`packages/protocol/`)

All shared types derive `ToSchema` alongside `Serialize` and `Deserialize`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Device {
    /// Unique device identifier
    pub id: Uuid,
    /// Human-readable device name
    pub name: String,
    /// Current device status
    pub status: DeviceStatus,
}
```

Doc comments (`///`) become OpenAPI `description` fields, which become JSDoc in TypeScript.

### 2. OpenAPI Spec Generator (`packages/protocol/src/bin/generate-openapi.rs`)

A native Rust binary that mirrors the `ApiDoc` struct from the WASM API crate but compiles without `worker` dependencies. Outputs the OpenAPI 3.1 JSON to stdout.

### 3. Generated TypeScript (`packages/portal-astro/src/lib/api/generated/`)

- `openapi.json` — The OpenAPI 3.1 specification (59KB, 50+ schemas)
- `client.ts` — Zod schemas + Zodios API client (563 lines, 60 schemas)
- `index.ts` — Re-exports for clean imports

### 4. CI Validation (`.github/workflows/openapi-generate.yml`)

Validates on every push/PR that touches protocol or API source:
- Protocol compiles with all feature combinations (default, js, native)
- ToSchema derive count ≥ 30
- API compiles for WASM target
- OpenAPI types are properly registered

## Build Time Measurements

| Step | Time | Notes |
|------|------|-------|
| Protocol clean build | ~2.1s | From scratch with `cargo clean -p` |
| Protocol incremental | ~0.1s | No changes, cached |
| Spec generation (runtime) | ~0.1s | Running the binary |
| TypeScript generation | ~1.1s | openapi-zod-client |
| **Total (clean)** | **~3.3s** | Well under 30s target |
| **Total (incremental)** | **~1.3s** | Typical developer workflow |

## Pros

1. **Single source of truth** — Rust types define the contract; TypeScript is derived
2. **Compile-time safety** — utoipa derives catch schema issues at Rust compile time
3. **Runtime validation** — Generated Zod schemas validate API responses at runtime
4. **Fast generation** — Full pipeline runs in ~3 seconds
5. **No manual sync** — Type changes in Rust automatically propagate to TypeScript
6. **Documentation propagation** — Rust doc comments become OpenAPI descriptions become JSDoc
7. **Toolchain maturity** — utoipa v5 and openapi-zod-client v1.18 are stable, well-maintained

## Cons

1. **Duplicate OpenAPI definition** — The `generate-openapi` binary duplicates the `ApiDoc` struct from the WASM API crate because `workers-rs` can't compile natively. Changes must be synchronized between both.
2. **No path definitions yet** — OpenAPI `paths` are empty; only `components/schemas` are generated. Full endpoint specs require `#[utoipa::path]` annotations on handlers.
3. **Empty endpoint array** — Generated Zodios client has no endpoints because there are no paths; schemas must be imported individually until paths are added.
4. **Portal-specific types missing** — Types like Route, NATRule, QoS, IPS, VPN, DDNS, Report, Log, Dashboard are not yet in the Rust protocol and must remain as manual TypeScript definitions.

## Edge Cases and Limitations

1. **`serde_json::Value` maps to `z.unknown()`** — Fields typed as `Value` (like `ConfigPush.config`) lose type information in the generated output.
2. **Optional fields** — Rust `Option<T>` correctly maps to `z.union([T, z.null()]).optional()` in Zod.
3. **Enum variants** — Rust `#[serde(rename_all = "snake_case")]` enums correctly produce string literal unions in Zod.
4. **UUID fields** — Mapped to `z.string().uuid()` via utoipa's `uuid` feature.
5. **Timestamps as i64** — Remain as `z.number().int()` in Zod; no chrono dependency needed.

## Alternatives Considered

### OpenAPI-First (Issue #61)
Write OpenAPI spec manually, generate both Rust and TypeScript from it.
- **Rejected because**: Adds a third artifact to maintain; Rust types already exist and are the natural source of truth for a Rust API.

### Manual Type Sync
Continue maintaining TypeScript types separately.
- **Rejected because**: Error-prone, doesn't scale, already caused sync bugs.

### TypeShare / ts-rs
Generate TypeScript directly from Rust without OpenAPI intermediary.
- **Not chosen because**: Loses the OpenAPI spec as documentation artifact; no runtime validation via Zod.

## Recommendation

**Adopt for production.** The prototype validates the core architecture:

1. ✅ Single `generate:api` command produces working client
2. ✅ Type changes in Rust propagate to TypeScript
3. ✅ Generated Zod schemas provide runtime validation
4. ✅ No manual type synchronization required
5. ✅ Build time impact < 5 seconds (well under 30s target)

### Next Steps

1. Add `#[utoipa::path]` annotations to API handlers to populate OpenAPI paths
2. Migrate portal-specific types (Route, NATRule, etc.) to Rust protocol
3. Replace manual TypeScript types with generated imports
4. Add CI step to auto-regenerate client on protocol changes
5. Consider extracting shared OpenAPI definition to avoid `ApiDoc` duplication

## References

- [utoipa documentation](https://docs.rs/utoipa/latest/utoipa/)
- [openapi-zod-client](https://github.com/astahmer/openapi-zod-client)
- [Zodios](https://www.zodios.org/)
- Issue #58 (this spike)
- Issues #53, #54, #55 (Rust foundation)
- Issues #59, #56 (TypeScript generation and CI/CD)
