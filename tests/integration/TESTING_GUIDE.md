# Integration Testing Guide

Comprehensive guide for writing and running integration tests in the ngfw.sh project.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Framework Architecture](#framework-architecture)
4. [Writing Tests](#writing-tests)
5. [Test Patterns](#test-patterns)
6. [Mock Infrastructure](#mock-infrastructure)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Overview

The integration test framework provides comprehensive testing infrastructure for all system boundaries in ngfw.sh:

- **API <-> Agent** - WebSocket protocol and RPC communication
- **Agent <-> Firmware** - Router system adapters
- **UI <-> API** - REST API client integration
- **API <-> Storage** - D1/KV/R2 data layer
- **End-to-End** - Complete system workflows

## Getting Started

### Installation

```bash
cd tests/integration
bun install
```

### Running Tests

```bash
# Run all integration tests
bun test

# Run specific test suite
bun test:api-agent
bun test:agent-firmware
bun test:ui-api
bun test:api-storage
bun test:e2e

# Run with coverage
bun test:coverage

# Watch mode
bun test:watch
```

### Quick Example

```typescript
import { describe, it, expect } from 'bun:test';
import { createMockApiServer, createMockAgentClient, deviceFixture } from '../framework';

describe('My Integration Test', () => {
  it('should connect and authenticate', async () => {
    const device = deviceFixture.build();
    const server = createMockApiServer();
    const client = createMockAgentClient({
      deviceId: device.id,
      apiKey: device.api_key,
      ownerId: device.owner_id,
      wsUrl: 'ws://localhost:8787/agent/ws',
    });

    await server.start();
    await client.connect();
    await client.authenticate();

    expect(client.isAuthenticated()).toBe(true);

    client.disconnect();
    await server.stop();
  });
});
```

## Framework Architecture

### Core Components

```
framework/
├── core/               # Base types and test builder
├── mocks/              # Mock implementations
├── fixtures/           # Test data generators
├── assertions/         # Custom assertions
└── isolation/          # Test isolation strategies
```

### Key Classes

- **IntegrationTestBuilder** - Fluent API for test setup
- **MockApiServer** - WebSocket/REST API mock
- **MockAgentClient** - Router agent simulator
- **MockFirmwareAdapter** - System adapter mock
- **FixtureBuilders** - Test data generators
- **Assertions** - Custom validation logic
- **IsolationManager** - Test independence

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { /* imports */ } from '../framework';

describe('Feature Name', () => {
  // Setup
  beforeAll(async () => {
    // One-time setup
  });

  afterAll(async () => {
    // One-time cleanup
  });

  beforeEach(() => {
    // Per-test setup
  });

  describe('Specific Behavior', () => {
    it('should do something specific', async () => {
      // Arrange
      const data = deviceFixture.build();

      // Act
      const result = await performAction(data);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Using Fixtures

```typescript
// Device fixtures
const device = deviceFixture.build();
const devices = deviceFixture.buildList(5);
const offlineDevice = deviceFixture.offline().build();

// User fixtures
const user = userFixture.build();
const proUser = userFixture.pro().build();

// Metrics fixtures
const metrics = metricsFixture.build();
const highCpuMetrics = metricsFixture.highCpu().build();
const idleMetrics = metricsFixture.idle().build();

// Network config fixtures
const config = networkConfigFixture.build();
const staticWan = networkConfigFixture.withStaticWan('10.0.0.1', '10.0.0.254').build();
```

### Using Mocks

#### Mock API Server

```typescript
const server = createMockApiServer({
  port: 8787,
  verbose: true,
  credentials: [
    {
      deviceId: 'test-device-001',
      apiKey: 'test-api-key',
      ownerId: 'test-owner-001',
    },
  ],
});

await server.start();

// Get server state
const state = server.getState();
expect(state.authenticated).toBe(true);

// Get messages
const messages = server.getMessages();
const authMessages = server.getMessagesByType('AUTH');

// Register custom handler
server.onMessage('CUSTOM_TYPE', (msg) => {
  console.log('Custom message:', msg);
});

await server.stop();
```

#### Mock Agent Client

```typescript
const client = createMockAgentClient({
  deviceId: 'test-device-001',
  apiKey: 'test-api-key',
  ownerId: 'test-owner-001',
  wsUrl: 'ws://localhost:8787/agent/ws',
  autoReconnect: true,
  verbose: true,
});

await client.connect();
await client.authenticate();

// Send status
await client.sendStatus({
  online: true,
  uptime: 86400,
  firmware_version: '388.1_0',
  wan_connected: true,
});

// Send metrics
await client.sendMetrics(metricsFixture.build());

// Ping/pong
const latency = await client.ping();

// Wait for message
const response = await client.waitForMessage('CONFIG_UPDATE', 5000);

client.disconnect();
```

#### Mock Firmware Adapter

```typescript
const firmware = createMockFirmwareAdapter({
  verbose: true,
  mockSysFS: true,
});

// Execute commands
const result = firmware.executeCommand('nvram get model');
expect(result.exitCode).toBe(0);
expect(result.stdout).toBe('RT-AX86U');

// Access adapters directly
firmware.nvram.set('test_key', 'test_value');
firmware.iptables.addRule('INPUT', '-p tcp --dport 80 -j ACCEPT');
firmware.dnsmasq.start();

// System information
const hostname = firmware.system.getHostname();
const uptime = firmware.system.getUptime();
const memory = firmware.system.getMemory();

// Command history
const history = firmware.getCommandHistory();
firmware.clearCommandHistory();

// Reset state
firmware.reset();
```

### Using Assertions

```typescript
import { wsAssertions, stateAssertions, storageAssertions } from '../framework';

// WebSocket assertions
wsAssertions.assertMessageType(message, 'AUTH_OK');
wsAssertions.assertMessagePayload(message, { success: true });
wsAssertions.assertAuthSuccess(message);
wsAssertions.assertMessageOrder(messages, ['AUTH', 'STATUS', 'METRICS']);

// State assertions
stateAssertions.assertDeviceOnline(device);
stateAssertions.assertDeviceRecentlySeen(device, 60000);
stateAssertions.assertMetricsInRange(metrics, {
  cpu: [0, 100],
  memory: [0, 100],
  temperature: [0, 100],
});
stateAssertions.assertSystemIdle(metrics);

// Storage assertions
storageAssertions.assertKeyExists(storage, 'device:001');
storageAssertions.assertStorageValue(storage, 'key', expectedValue);
storageAssertions.assertStorageEmpty(storage);
```

### Using Test Builder

```typescript
import { IntegrationTestBuilder } from '../framework';

const test = new IntegrationTestBuilder()
  .withMockApi()
  .withMockAgent()
  .withCleanup()
  .withTimeout(30000)
  .withIsolation('namespace')
  .withLifecycle({
    beforeEach: async () => {
      // Setup logic
    },
    afterEach: async () => {
      // Cleanup logic
    },
  })
  .build();

await test.setup();
// Run test
await test.cleanup();
await test.teardown();
```

## Test Patterns

### Pattern 1: Simple Connection Test

```typescript
it('should connect to API server', async () => {
  const server = createMockApiServer();
  await server.start();

  const client = createMockAgentClient({
    deviceId: 'test-001',
    apiKey: 'test-key',
    ownerId: 'test-owner',
    wsUrl: 'ws://localhost:8787/agent/ws',
  });

  await client.connect();
  expect(client.isConnected()).toBe(true);

  client.disconnect();
  await server.stop();
});
```

### Pattern 2: Authentication Flow

```typescript
it('should authenticate successfully', async () => {
  const device = deviceFixture.build();
  const server = createMockApiServer({
    credentials: [
      {
        deviceId: device.id,
        apiKey: device.api_key,
        ownerId: device.owner_id,
      },
    ],
  });

  await server.start();

  const client = createMockAgentClient({
    deviceId: device.id,
    apiKey: device.api_key,
    ownerId: device.owner_id,
    wsUrl: 'ws://localhost:8787/agent/ws',
  });

  await client.connect();
  await client.authenticate();

  const messages = server.getMessagesByType('AUTH');
  expect(messages).toHaveLength(1);
  wsAssertions.assertMessagePayload(messages[0], {
    device_id: device.id,
    api_key: device.api_key,
  });

  client.disconnect();
  await server.stop();
});
```

### Pattern 3: Data Flow Validation

```typescript
it('should send and receive metrics', async () => {
  const device = deviceFixture.build();
  const server = createMockApiServer();
  await server.start();

  const client = createMockAgentClient({
    deviceId: device.id,
    apiKey: device.api_key,
    ownerId: device.owner_id,
    wsUrl: 'ws://localhost:8787/agent/ws',
  });

  await client.connect();
  await client.authenticate();

  const metrics = metricsFixture.build();
  await client.sendMetrics(metrics);

  await TestUtils.sleep(100);

  const state = server.getState();
  expect(state.latestMetrics).toMatchObject(metrics);

  client.disconnect();
  await server.stop();
});
```

### Pattern 4: Error Handling

```typescript
it('should handle authentication failure', async () => {
  const server = createMockApiServer();
  await server.start();

  const client = createMockAgentClient({
    deviceId: 'invalid',
    apiKey: 'invalid',
    ownerId: 'invalid',
    wsUrl: 'ws://localhost:8787/agent/ws',
  });

  await client.connect();

  try {
    await client.authenticate();
    expect.unreachable('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('Authentication failed');
  }

  client.disconnect();
  await server.stop();
});
```

### Pattern 5: Timing and Performance

```typescript
it('should respond to ping quickly', async () => {
  const server = createMockApiServer();
  await server.start();

  const client = createMockAgentClient({
    deviceId: 'test-001',
    apiKey: 'test-key',
    ownerId: 'test-owner',
    wsUrl: 'ws://localhost:8787/agent/ws',
  });

  await client.connect();
  await client.authenticate();

  const latency = await client.ping();
  expect(latency).toBeLessThan(1000);

  client.disconnect();
  await server.stop();
});
```

## Mock Infrastructure

### Mock API Server Features

- WebSocket protocol implementation
- REST endpoint simulation
- Message history tracking
- Custom message handlers
- State inspection
- Configurable credentials

### Mock Agent Client Features

- WebSocket connection management
- Authentication flow
- Status/metrics reporting
- Ping/pong keepalive
- Message handlers
- Auto-reconnect support

### Mock Firmware Adapter Features

- NVRAM simulation
- IPTables rule management
- Dnsmasq service control
- Network interface simulation
- Wireless configuration
- System information
- Command history tracking

## Best Practices

### 1. Use Fixtures

Always use fixtures for test data instead of hard-coding values.

```typescript
// Good
const device = deviceFixture.build();

// Avoid
const device = {
  id: 'test-001',
  name: 'Test Router',
  // ...
};
```

### 2. Clean Up Resources

Always clean up resources in afterEach or afterAll hooks.

```typescript
afterEach(() => {
  client.disconnect();
  server.reset();
});

afterAll(async () => {
  await server.stop();
});
```

### 3. Use Isolation Strategies

Use appropriate isolation strategies for test independence.

```typescript
const test = new IntegrationTestBuilder()
  .withIsolation('namespace')
  .withCleanup()
  .build();
```

### 4. Test One Thing

Each test should verify one specific behavior.

```typescript
// Good
it('should authenticate with valid credentials', async () => {
  // Test authentication only
});

it('should send status updates', async () => {
  // Test status updates only
});

// Avoid
it('should authenticate and send status and metrics', async () => {
  // Too much in one test
});
```

### 5. Use Descriptive Names

Test names should clearly describe what is being tested.

```typescript
// Good
it('should reject connection with invalid API key', async () => {});

// Avoid
it('test1', async () => {});
```

### 6. Handle Async Properly

Always await async operations and handle errors.

```typescript
// Good
try {
  await client.authenticate();
  expect.unreachable('Should have thrown');
} catch (err) {
  expect(err).toBeInstanceOf(Error);
}

// Avoid
client.authenticate(); // Missing await
```

### 7. Use Timeouts

Set appropriate timeouts for long-running operations.

```typescript
const test = new IntegrationTestBuilder()
  .withTimeout(30000)
  .build();
```

### 8. Verify State Changes

Always verify that actions produce expected state changes.

```typescript
await client.sendStatus(status);
await TestUtils.sleep(100);

const state = server.getState();
expect(state.latestStatus).toMatchObject(status);
```

## Troubleshooting

### Tests Hanging

- Check for missing await keywords
- Verify server/client cleanup in afterEach
- Check WebSocket connection state
- Increase timeout values

### Flaky Tests

- Add proper wait conditions (TestUtils.waitFor)
- Use TestUtils.sleep for async operations
- Check for race conditions
- Ensure proper test isolation

### Mock Not Working

- Verify mock server is started
- Check port conflicts
- Verify credentials match
- Enable verbose logging

### Memory Leaks

- Ensure all connections are closed
- Call cleanup handlers
- Reset mock state between tests
- Use isolation strategies

### Connection Refused

- Verify server is listening
- Check port availability
- Ensure proper startup order
- Wait for server to be ready

## Example Test Suites

See the following for complete examples:

- `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/suites/api-agent/websocket-protocol.test.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/suites/agent-firmware/system-adapters.test.ts`

## Contributing

When adding new tests:

1. Identify the integration boundary
2. Create appropriate fixtures
3. Use existing mocks or create new ones
4. Write clear, focused tests
5. Add cleanup logic
6. Document complex scenarios
7. Run tests locally before committing

## License

MIT
