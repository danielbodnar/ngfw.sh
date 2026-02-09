# Testing Developer Guide

Practical guide for writing and running tests in the NGFW.sh platform.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Writing Tests](#writing-tests)
3. [Running Tests](#running-tests)
4. [Test Patterns](#test-patterns)
5. [Debugging Tests](#debugging-tests)
6. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
bun run setup

# Verify test environment
cd packages/schema
bun run test --version
```

### Run All Tests

```bash
# From repository root
bun run test                      # Schema API tests only
bun run test:schema               # Explicit Schema API tests
bun run test:integration:docker   # RT-AX92U simulation (Docker)
bun run test:integration:qemu     # RT-AX92U simulation (QEMU)

# From individual packages
cd packages/schema && bun run test
cd packages/api && cargo test
```

### First Test Run

```bash
# 1. Apply migrations locally
bun run db:migrate:local

# 2. Run schema tests
cd packages/schema
bun run test

# 3. Run Rust tests
cd ../api
cargo test --workspace

# 4. Run integration tests
cd ../..
bun run test:integration:docker
```

---

## Writing Tests

### Schema API Tests (TypeScript + Vitest)

#### Basic Test Structure

```typescript
import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Feature Name", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe("Specific Behavior", () => {
    it("should do something specific", async () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const response = await SELF.fetch("http://local.test/api/endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });
});
```

#### Testing Authenticated Endpoints

```typescript
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Authenticated Endpoints", () => {
  const mockToken = "mock-jwt-token";

  it("should require authentication", async () => {
    const response = await SELF.fetch("http://local.test/api/fleet/devices");

    expect(response.status).toBe(401);
  });

  it("should accept valid JWT", async () => {
    const response = await SELF.fetch("http://local.test/api/fleet/devices", {
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    });

    expect(response.status).toBe(200);
  });
});
```

#### Testing CRUD Operations

```typescript
describe("Device CRUD", () => {
  let deviceId: number;

  it("should create a device", async () => {
    const device = {
      name: "Test Router",
      model: "RT-AX92U",
      serial_number: "TEST12345",
    };

    const response = await SELF.fetch("http://local.test/api/fleet/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(device),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    deviceId = body.result.id;
    expect(body.result.api_key).toBeDefined();
  });

  it("should read the device", async () => {
    const response = await SELF.fetch(
      `http://local.test/api/fleet/devices/${deviceId}`
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.name).toBe("Test Router");
  });

  it("should update the device", async () => {
    const update = { name: "Updated Router" };

    const response = await SELF.fetch(
      `http://local.test/api/fleet/devices/${deviceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.name).toBe("Updated Router");
  });

  it("should delete the device", async () => {
    const response = await SELF.fetch(
      `http://local.test/api/fleet/devices/${deviceId}`,
      {
        method: "DELETE",
      }
    );

    expect(response.status).toBe(200);
  });

  it("should return 404 after deletion", async () => {
    const response = await SELF.fetch(
      `http://local.test/api/fleet/devices/${deviceId}`
    );

    expect(response.status).toBe(404);
  });
});
```

#### Testing Validation Errors

```typescript
describe("Input Validation", () => {
  it("should reject invalid email", async () => {
    const invalidData = {
      name: "Test",
      email: "not-an-email",
    };

    const response = await SELF.fetch("http://local.test/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidData),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors).toBeInstanceOf(Array);
    expect(body.errors[0]).toMatchObject({
      field: "email",
      message: expect.stringContaining("email"),
    });
  });
});
```

#### Testing Database Operations

```typescript
import { env } from "cloudflare:test";

describe("Database Operations", () => {
  it("should query D1 database", async () => {
    const { results } = await env.DB.prepare(
      "SELECT * FROM devices WHERE user_id = ?"
    )
      .bind("user_123")
      .all();

    expect(results).toBeInstanceOf(Array);
  });

  it("should insert and retrieve", async () => {
    await env.DB.prepare(
      "INSERT INTO devices (name, model, user_id) VALUES (?, ?, ?)"
    )
      .bind("Test Router", "RT-AX92U", "user_123")
      .run();

    const { results } = await env.DB.prepare(
      "SELECT * FROM devices WHERE name = ?"
    )
      .bind("Test Router")
      .all();

    expect(results).toHaveLength(1);
    expect(results[0].model).toBe("RT-AX92U");
  });
});
```

### Rust API Tests

#### Unit Tests

```rust
// src/models/rpc.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_message_serialization() {
        let auth = AuthMessage {
            api_key: "test-key".to_string(),
            device_id: "device-123".to_string(),
        };

        let json = serde_json::to_string(&auth).unwrap();
        assert!(json.contains("test-key"));
        assert!(json.contains("device-123"));
    }

    #[test]
    fn test_status_payload_deserialization() {
        let json = r#"{
            "uptime": 12345,
            "cpu": 23,
            "memory": 41,
            "temperature": 52,
            "load": [0.42, 0.38, 0.35]
        }"#;

        let status: StatusPayload = serde_json::from_str(json).unwrap();
        assert_eq!(status.uptime, 12345);
        assert_eq!(status.cpu, 23);
    }
}
```

#### Integration Tests

```rust
// tests/integration/websocket_protocol.rs
use worker::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_websocket_auth_flow() {
        // Setup test environment
        let api_key = "test-api-key";
        let device_id = "test-device";

        // Simulate WebSocket connection
        let auth_msg = json!({
            "type": "AUTH",
            "payload": {
                "api_key": api_key,
                "device_id": device_id
            }
        });

        // Verify authentication response
        // (Implementation depends on test harness)
    }
}
```

### Frontend Tests (Vue + Vitest)

#### Component Tests

```typescript
// src/components/ui/Button.spec.ts
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Button from './Button.vue';

describe('Button', () => {
  it('renders with default props', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Click me' },
    });

    expect(wrapper.text()).toContain('Click me');
    expect(wrapper.classes()).toContain('btn');
  });

  it('emits click event', async () => {
    const wrapper = mount(Button);

    await wrapper.trigger('click');

    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('applies variant class', () => {
    const wrapper = mount(Button, {
      props: { variant: 'primary' },
    });

    expect(wrapper.classes()).toContain('btn-primary');
  });

  it('disables button when disabled prop is true', () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
    });

    expect(wrapper.attributes('disabled')).toBeDefined();
  });
});
```

#### Composable Tests

```typescript
// src/composables/useDevices.spec.ts
import { describe, expect, it, vi } from 'vitest';
import { useDevices } from './useDevices';

vi.mock('../lib/api', () => ({
  apiClient: {
    fleet: {
      listDevices: vi.fn().mockResolvedValue([
        { id: 1, name: 'Router 1' },
        { id: 2, name: 'Router 2' },
      ]),
    },
  },
}));

describe('useDevices', () => {
  it('fetches devices on mount', async () => {
    const { devices, loading, error } = useDevices();

    expect(loading.value).toBe(true);

    await vi.waitFor(() => expect(loading.value).toBe(false));

    expect(devices.value).toHaveLength(2);
    expect(error.value).toBe(null);
  });
});
```

---

## Running Tests

### Schema API Tests

```bash
cd packages/schema

# Run all tests
bun run test

# Run specific test file
bun run test tests/integration/tasks.test.ts

# Run tests in watch mode
bun run test --watch

# Run with coverage
bun run test --coverage

# Run tests matching pattern
bun run test --grep "should create"

# Dry run (no execution)
wrangler deploy --dry-run
```

### Rust API Tests

```bash
cd packages/api

# Run all tests
cargo test --workspace

# Run specific test
cargo test test_auth_message

# Run tests with output
cargo test -- --nocapture

# Run tests in specific module
cargo test models::

# Run integration tests only
cargo test --test integration

# Run with coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html
```

### Integration Tests

```bash
# Docker approach (recommended for CI)
bun run test:integration:docker

# QEMU approach (full system emulation)
bun run test:integration:qemu

# Clean up test artifacts
docker compose -f tests/integration/docker/compose.yaml down -v
```

### Lint Before Test

```bash
# Lint TypeScript
bun run lint
bun run lint:fix

# Lint Rust
cd packages/api
cargo clippy --workspace
cargo fmt --check
```

---

## Test Patterns

### Pattern 1: Arrange-Act-Assert (AAA)

```typescript
it("should calculate total price", () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(35);
});
```

### Pattern 2: Given-When-Then (BDD)

```typescript
describe("Given a user is authenticated", () => {
  describe("When they request their profile", () => {
    it("Then they should receive their profile data", async () => {
      const response = await SELF.fetch("http://local.test/api/user/profile", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(200);
    });
  });
});
```

### Pattern 3: Test Data Builders

```typescript
class DeviceBuilder {
  private device = {
    name: "Test Router",
    model: "RT-AX92U",
    user_id: "user_123",
  };

  withName(name: string) {
    this.device.name = name;
    return this;
  }

  withModel(model: string) {
    this.device.model = model;
    return this;
  }

  build() {
    return this.device;
  }
}

it("should create device with custom name", async () => {
  const device = new DeviceBuilder()
    .withName("My Router")
    .withModel("GL-MT6000")
    .build();

  const response = await SELF.fetch("http://local.test/api/fleet/devices", {
    method: "POST",
    body: JSON.stringify(device),
  });

  expect(response.status).toBe(201);
});
```

### Pattern 4: Parameterized Tests

```typescript
describe.each([
  { input: "test@example.com", valid: true },
  { input: "invalid-email", valid: false },
  { input: "", valid: false },
  { input: "test@", valid: false },
])("Email validation", ({ input, valid }) => {
  it(`should ${valid ? "accept" : "reject"} ${input}`, () => {
    expect(isValidEmail(input)).toBe(valid);
  });
});
```

### Pattern 5: Mock External Services

```typescript
import { vi } from "vitest";

// Mock Clerk JWT verification
vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn().mockResolvedValue({
    sub: "user_123",
    azp: "app.ngfw.sh",
  }),
}));

it("should verify JWT token", async () => {
  const response = await SELF.fetch("http://local.test/api/fleet/devices", {
    headers: { Authorization: "Bearer mock-token" },
  });

  expect(response.status).toBe(200);
});
```

### Pattern 6: Snapshot Testing

```typescript
it("should render dashboard correctly", () => {
  const dashboard = {
    title: "System Overview",
    widgets: [
      { type: "cpu", value: 23 },
      { type: "memory", value: 41 },
    ],
  };

  expect(dashboard).toMatchSnapshot();
});
```

---

## Debugging Tests

### Enable Debug Logging

```typescript
// tests/vitest.config.mts
export default defineWorkersConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/apply-migrations.ts'],
    // Enable debug logging
    logHeapUsage: true,
    reporters: ['verbose'],
  },
});
```

### Use `console.log()` in Tests

```typescript
it("should debug test", async () => {
  const response = await SELF.fetch("http://local.test/api/endpoint");
  const body = await response.json();

  console.log("Response body:", JSON.stringify(body, null, 2));

  expect(response.status).toBe(200);
});
```

### Rust Test Debugging

```rust
#[test]
fn test_with_debug_output() {
    let value = 42;
    println!("Debug value: {}", value);
    assert_eq!(value, 42);
}
```

Run with output:

```bash
cargo test test_with_debug_output -- --nocapture
```

### Isolate Failing Tests

```bash
# Run only one test
bun run test --grep "specific test name"

# Skip tests
it.skip("should skip this test", () => {});

# Run only this test
it.only("should run only this test", () => {});
```

### Use Debugger

```typescript
it("should debug with breakpoint", async () => {
  debugger; // Set breakpoint here

  const response = await SELF.fetch("http://local.test/api/endpoint");
  expect(response.status).toBe(200);
});
```

Run with debugger:

```bash
node --inspect-brk $(which vitest) run
```

### Check Test Isolation

```typescript
describe("Test isolation check", () => {
  let sharedState: number;

  beforeEach(() => {
    sharedState = 0;
  });

  it("should not leak state (test 1)", () => {
    sharedState = 42;
    expect(sharedState).toBe(42);
  });

  it("should not leak state (test 2)", () => {
    // If isolation works, this should be 0, not 42
    expect(sharedState).toBe(0);
  });
});
```

---

## Best Practices

### DO: Write Descriptive Test Names

✅ **Good:**

```typescript
it("should return 404 when device does not exist", async () => {});
```

❌ **Bad:**

```typescript
it("test device", async () => {});
```

### DO: Test One Thing Per Test

✅ **Good:**

```typescript
it("should create device", async () => {
  // Only tests creation
});

it("should validate device name", async () => {
  // Only tests validation
});
```

❌ **Bad:**

```typescript
it("should create and validate device", async () => {
  // Tests multiple behaviors
});
```

### DO: Use Proper Assertions

✅ **Good:**

```typescript
expect(response.status).toBe(200);
expect(body.result).toHaveLength(3);
expect(device.name).toContain("Router");
```

❌ **Bad:**

```typescript
expect(response.status === 200).toBe(true);
expect(body.result.length).toBe(3); // Less descriptive error
```

### DO: Clean Up After Tests

```typescript
afterEach(async () => {
  vi.restoreAllMocks();
  // Clean up test data
  await env.DB.prepare("DELETE FROM devices WHERE user_id = ?")
    .bind("test_user")
    .run();
});
```

### DON'T: Use Hardcoded Delays

❌ **Bad:**

```typescript
it("should wait for async operation", async () => {
  triggerAsyncOperation();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Flaky!
  expect(result).toBe("done");
});
```

✅ **Good:**

```typescript
it("should wait for async operation", async () => {
  const promise = triggerAsyncOperation();
  const result = await promise;
  expect(result).toBe("done");
});
```

### DON'T: Test Implementation Details

❌ **Bad:**

```typescript
it("should call internal method", () => {
  const spy = vi.spyOn(service, "_internalMethod");
  service.publicMethod();
  expect(spy).toHaveBeenCalled();
});
```

✅ **Good:**

```typescript
it("should return correct result", () => {
  const result = service.publicMethod();
  expect(result).toBe(expectedValue);
});
```

### DON'T: Write Tests That Depend On Each Other

❌ **Bad:**

```typescript
let deviceId: number;

it("should create device", async () => {
  deviceId = await createDevice();
});

it("should update device", async () => {
  // Depends on previous test
  await updateDevice(deviceId);
});
```

✅ **Good:**

```typescript
it("should create and update device", async () => {
  const deviceId = await createDevice();
  const updated = await updateDevice(deviceId);
  expect(updated.id).toBe(deviceId);
});
```

### Test Coverage Guidelines

- Aim for 80% line coverage, 75% branch coverage
- 100% coverage for security-critical paths
- Don't chase 100% coverage everywhere
- Focus on business logic, not getters/setters

### Test Performance

- Unit tests should run in < 1 second
- Integration tests should run in < 30 seconds
- Avoid unnecessary database queries
- Mock slow external services

---

## Troubleshooting

### Issue: Tests Pass Locally But Fail in CI

**Possible causes:**
- Environment differences
- Race conditions
- Hardcoded paths or URLs
- Time zone issues

**Solution:**

```typescript
// Use relative paths
const configPath = path.join(__dirname, "config.toml");

// Use environment variables
const apiUrl = process.env.API_URL || "http://localhost:8080";

// Use deterministic timestamps
const now = new Date("2025-01-01T00:00:00Z");
```

### Issue: Vitest Hangs or Times Out

**Solution:**

```typescript
// Set explicit timeout
it("should complete quickly", async () => {
  // ...
}, { timeout: 5000 });

// Or globally
export default defineConfig({
  test: {
    testTimeout: 10000,
  },
});
```

### Issue: Rust Tests Fail to Compile

**Solution:**

```bash
# Clean build artifacts
cargo clean

# Update dependencies
cargo update

# Check for WASM compatibility
cargo build --target wasm32-unknown-unknown
```

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Cloudflare Workers Testing](https://developers.cloudflare.com/workers/testing/)
- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Vue Test Utils](https://test-utils.vuejs.org/)

---

*Last updated: 2026-02-09*
