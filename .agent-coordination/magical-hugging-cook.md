# Plan: Fix Rust API Diagnostics (121 Clippy Warnings)

## Summary

The `packages/api` Rust codebase has 121 Clippy warnings that need to be addressed. These fall into several categories:

## Warning Categories

### 1. Dead Code Warnings (~100 warnings)
**Files affected:** All model files, middleware, handlers, RPC

These are structs, enums, functions, and methods that are defined but never used. This is expected in a scaffolded codebase where the API structure is defined but handlers aren't fully implemented yet.

**Strategy:** Add `#[allow(dead_code)]` at the module level for model files since these types are intentionally defined for future use and API documentation. For middleware/handler code that should be used, we'll either use them or remove them.

### 2. Clippy Lint Fixes (~12 warnings)
These are code quality issues that should be fixed:

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `handlers/router.rs:194` | Redundant closure | Replace `\|\| Response::empty()` with `Response::empty` |
| `handlers/agent.rs:39-43` | Collapsible if | Combine nested if with `&&` |
| `handlers/agent.rs:41` | Manual strip | Use `strip_prefix()` instead of manual slicing |
| `handlers/agent.rs:51-55` | Collapsible if | Combine nested if with `&&` |
| `models/network.rs:126` | Enum variant names | All variants end with `Ghz` - rename variants |
| `rpc/agent_connection.rs:116` | RefCell held across await | Drop borrow before await |
| `storage/mod.rs:230` | Needless borrow | Remove `&` from format! |
| `storage/mod.rs:240` | Double-ended iterator | Use `next_back()` instead of `last()` |
| `storage/mod.rs:313` | Needless borrow | Remove `&` from serialized string |
| `storage/mod.rs:662` | Collapsible if | Combine nested if with `&&` |
| `storage/mod.rs:689` | Needless borrow | Remove `&` from serialized string |

### 3. Unused Macro
- `storage/mod.rs:481` - `placeholder_impl` macro is unused

## Implementation Plan

### Step 1: Add module-level `#[allow(dead_code)]` for model files
These files define API types that will be used as the handlers are implemented:
- `src/models/fleet.rs`
- `src/models/network.rs`
- `src/models/rpc.rs`
- `src/models/security.rs`
- `src/models/services.rs`
- `src/models/system.rs`
- `src/models/user.rs`
- `src/models/error.rs` (partial - some constructors)

### Step 2: Add `#[allow(dead_code)]` for scaffolded middleware
- `src/middleware/rate_limit.rs` - entire module is scaffolded
- `src/middleware/cors.rs` - `apply` and `with_cors` functions
- `src/middleware/auth.rs` - `get_plan` method, `email` field

### Step 3: Fix Clippy lints in handlers/agent.rs
- Collapse nested if statements
- Use `strip_prefix()` pattern

### Step 4: Fix Clippy lints in handlers/router.rs
- Replace redundant closure with function reference

### Step 5: Fix Clippy lints in rpc/agent_connection.rs
- Fix RefCell borrow held across await (potential runtime panic)
- Add `#[allow(dead_code)]` for message handler methods

### Step 6: Fix Clippy lints in storage/mod.rs
- Remove needless borrows
- Use `next_back()` instead of `last()`
- Collapse nested if
- Remove unused macro

### Step 7: Fix enum variant naming in models/network.rs
- Rename `WifiBand` variants to remove redundant `Ghz` suffix

## Verification

After all fixes:
```bash
cd packages/api && cargo clippy 2>&1 | grep -c warning
# Expected: 0
```

## Files to Modify

1. `src/models/mod.rs` or individual model files - add `#[allow(dead_code)]`
2. `src/middleware/rate_limit.rs` - add `#[allow(dead_code)]`
3. `src/middleware/cors.rs` - add `#[allow(dead_code)]`
4. `src/middleware/auth.rs` - add `#[allow(dead_code)]`
5. `src/handlers/agent.rs` - fix collapsible if, manual strip
6. `src/handlers/router.rs` - fix redundant closure, add allow for unused fn
7. `src/rpc/agent_connection.rs` - fix RefCell across await, add allows
8. `src/storage/mod.rs` - fix borrows, iterator, collapsible if, remove macro
9. `src/models/network.rs` - rename WifiBand variants
