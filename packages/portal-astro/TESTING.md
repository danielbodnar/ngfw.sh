# Portal-Astro Testing Strategy

## Overview

This document outlines the comprehensive testing approach for the portal-astro frontend application, including integration tests for UI<->API communication, authentication flows, and end-to-end user journeys.

## Architecture

### Frontend Stack
- **Framework**: Astro 5.x with Vue 3.5+ integration
- **Authentication**: Clerk (via `@clerk/astro`)
- **API Client**: Custom fetch-based client (`lib/api/client.ts`)
- **State Management**: Vue Composition API with composables
- **Deployment**: Cloudflare Pages (SSR)

### API Integration Points

#### Authentication Flow
1. **Server-Side Auth**: Astro pages use `Astro.locals.auth()` for server-side authentication
2. **Client-Side Auth**: Vue components use `useAuth()` composable
3. **Token Management**: JWT tokens fetched from `/api/session-token` endpoint
4. **Token Caching**: 5-minute cache in `useAuth` composable

#### API Communication
- **Base URL**: `https://api.ngfw.sh` (configurable via `VITE_API_URL`)
- **Authentication**: Bearer token in `Authorization` header
- **Error Handling**: Custom `ApiError` class with HTTP status codes
- **Type Safety**: Full TypeScript types matching OpenAPI spec

### Key API Endpoints

#### Fleet Management
- `GET /fleet/devices` - List user's devices
- `POST /fleet/devices` - Register new device
- `GET /fleet/devices/:id/status` - Get device status with metrics
- `DELETE /fleet/devices/:id` - Delete device

#### Routing
- `GET /routing/routes?device_id=:id` - List routes for device
- `POST /routing/routes` - Create new route
- `PUT /routing/routes/:id` - Update route
- `DELETE /routing/routes/:id` - Delete route

#### NAT
- `GET /nat/rules?device_id=:id` - List NAT rules
- `POST /nat/rules` - Create NAT rule
- `PUT /nat/rules/:id` - Update NAT rule
- `DELETE /nat/rules/:id` - Delete NAT rule

#### IPS (Intrusion Prevention)
- `GET /ips/config?device_id=:id` - Get IPS configuration
- `PUT /ips/config?device_id=:id` - Update IPS config
- `GET /ips/rules?device_id=:id` - List IPS rules
- `GET /ips/alerts?device_id=:id` - List IPS alerts

#### VPN Server
- `GET /vpn/server/config?device_id=:id` - Get VPN server config
- `PUT /vpn/server/config?device_id=:id` - Update VPN config
- `GET /vpn/server/peers?device_id=:id` - List VPN peers
- `POST /vpn/server/peers` - Create VPN peer
- `DELETE /vpn/server/peers/:id` - Delete peer

#### VPN Client
- `GET /vpn/client/profiles?device_id=:id` - List VPN client profiles
- `POST /vpn/client/profiles` - Create profile
- `PUT /vpn/client/profiles/:id` - Update profile
- `DELETE /vpn/client/profiles/:id` - Delete profile
- `GET /vpn/client/profiles/:id/status` - Get connection status
- `POST /vpn/client/profiles/:id/connect` - Connect VPN
- `POST /vpn/client/profiles/:id/disconnect` - Disconnect VPN

#### QoS (Quality of Service)
- `GET /qos/rules?device_id=:id` - List QoS rules
- `POST /qos/rules` - Create rule
- `PUT /qos/rules/:id` - Update rule
- `DELETE /qos/rules/:id` - Delete rule

#### DDNS (Dynamic DNS)
- `GET /ddns/configs?device_id=:id` - List DDNS configs
- `POST /ddns/configs` - Create config
- `PUT /ddns/configs/:id` - Update config
- `DELETE /ddns/configs/:id` - Delete config
- `POST /ddns/configs/:id/update` - Force update

#### Reporting & Logs
- `GET /reports?device_id=:id` - List reports
- `POST /reports` - Create report
- `GET /reports/:id` - Get report details
- `DELETE /reports/:id` - Delete report
- `GET /logs?device_id=:id&level=:level` - Query logs

#### Dashboards
- `GET /dashboards` - List user's dashboards
- `POST /dashboards` - Create dashboard
- `PUT /dashboards/:id` - Update dashboard
- `DELETE /dashboards/:id` - Delete dashboard

## Test Structure

### 1. Unit Tests (Composables & Utilities)
Test individual composables and utility functions in isolation.

**Location**: `packages/portal-astro/tests/unit/`

**Coverage**:
- `useApi.test.ts` - API client factory
- `useAuth.test.ts` - Authentication state management
- `useDevices.test.ts` - Device management composable
- `useNAT.test.ts` - NAT rules composable
- `useVPNServer.test.ts` - VPN server composable
- API error handling and retry logic
- Token caching and expiration

### 2. Integration Tests (UI <-> API)
Test the full data flow from Vue components through API client to backend.

**Location**: `packages/portal-astro/tests/integration/`

**Coverage**:
- Authentication flow (login, token fetch, API calls)
- Device registration and management
- CRUD operations for all resource types
- Error handling and user feedback
- Real-time polling and state updates
- Form validation and submission

### 3. E2E Tests (User Journeys)
Test complete user workflows from browser perspective.

**Location**: `packages/portal-astro/tests/e2e/`

**Coverage**:
- Onboarding: Sign up → Device registration → Initial configuration
- NAT Management: Create rule → Edit rule → Toggle rule → Delete rule
- VPN Setup: Configure server → Add peer → Test connection
- Security: Configure IPS → Review alerts → Adjust rules
- Monitoring: View dashboards → Generate reports → Query logs

## Test Environments

### 1. Mock API (Development)
- **Tool**: MSW (Mock Service Worker)
- **Use Case**: Fast unit/integration tests without real backend
- **Setup**: Mock handlers for all API endpoints
- **Data**: Fixtures with realistic test data

### 2. Docker Test Environment
- **Tool**: Docker Compose
- **Components**:
  - Astro dev server
  - Schema API (Cloudflare Workers via Miniflare)
  - D1 database (SQLite)
  - Mock Clerk service
- **Use Case**: Integration tests with real API
- **Script**: `tests/integration/run-docker.sh`

### 3. QEMU Test Environment
- **Tool**: QEMU with ARM64 emulation
- **Components**:
  - Full NGFW stack (agent, API, portal)
  - Simulated router environment
- **Use Case**: Full system integration tests
- **Script**: `tests/integration/run-qemu.sh`

## Test Tools & Frameworks

### Core Testing
- **Vitest**: Fast unit test runner with Vue support
- **@vue/test-utils**: Vue component testing utilities
- **Playwright**: E2E browser automation
- **MSW**: API mocking for integration tests

### Assertions & Utilities
- **Zod**: Runtime validation of API responses
- **@testing-library/vue**: User-centric component testing
- **happy-dom** or **jsdom**: DOM environment for Node

### Code Coverage
- **v8** (Vitest built-in): Coverage reporting
- **Target**: 80% coverage for composables, 70% for components

## Test Implementation

### Setup Files

#### `tests/setup/mocks.ts`
Global mocks for Clerk, fetch, and browser APIs.

#### `tests/setup/fixtures.ts`
Reusable test data fixtures for all resource types.

#### `tests/setup/test-utils.ts`
Helper functions for mounting components with proper context.

### Test Patterns

#### 1. Composable Testing Pattern
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { useDevices } from '@/composables/useDevices';

describe('useDevices', () => {
  it('fetches devices on mount', async () => {
    const { data, loading, error } = useDevices();

    expect(loading.value).toBe(true);
    await flushPromises();
    expect(loading.value).toBe(false);
    expect(data.value).toHaveLength(2);
  });
});
```

#### 2. Component Integration Testing Pattern
```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { setupMockAPI } from '../setup/mocks';
import NATRulesApp from '@/components/security/NATRulesApp.vue';

describe('NATRulesApp Integration', () => {
  it('creates NAT rule via API', async () => {
    const mockAPI = setupMockAPI();
    const wrapper = mount(NATRulesApp, {
      global: { provide: { deviceId: 'test-device' } }
    });

    await wrapper.find('[data-testid="add-rule"]').trigger('click');
    await wrapper.find('[name="name"]').setValue('SSH');
    await wrapper.find('[name="external_port"]').setValue('22');
    await wrapper.find('[data-testid="save"]').trigger('click');

    expect(mockAPI.createNATRule).toHaveBeenCalledWith({
      device_id: 'test-device',
      name: 'SSH',
      // ...
    });
  });
});
```

#### 3. E2E Testing Pattern
```typescript
import { test, expect } from '@playwright/test';

test('complete NAT rule lifecycle', async ({ page }) => {
  await page.goto('https://app.ngfw.sh/sign-in');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.goto('/security/nat');
  await page.click('text=Add Rule');
  await page.fill('[name="name"]', 'SSH Forward');
  await page.fill('[name="external_port"]', '22');
  await page.fill('[name="internal_ip"]', '192.168.1.100');
  await page.fill('[name="internal_port"]', '22');
  await page.click('text=Create');

  await expect(page.locator('text=SSH Forward')).toBeVisible();
});
```

## Critical Test Scenarios

### Authentication Flow
1. **Sign In**
   - Valid credentials → Dashboard redirect
   - Invalid credentials → Error message
   - Already signed in → Dashboard redirect

2. **Token Management**
   - Token fetch on first API call
   - Token caching (5 minutes)
   - Token refresh on expiration
   - Unauthorized → Sign-in redirect

3. **Sign Out**
   - Clear auth state
   - Redirect to sign-in
   - Subsequent API calls fail

### Device Management
1. **Device Registration**
   - Valid device data → Success response with API key
   - Display API key once
   - Add to device list
   - WebSocket connection established

2. **Device Selection**
   - Select device → Update global state
   - All composables use selected device
   - Persist selection in localStorage

3. **Device Status**
   - Poll status every 30 seconds
   - Display metrics (CPU, memory, connections)
   - Update connection state (online/offline)
   - Handle stale data

### NAT Rule Management
1. **Create Rule**
   - Validate form inputs
   - Submit to API
   - Refresh list on success
   - Display success toast

2. **Edit Rule**
   - Load existing values into form
   - Submit updates
   - Optimistic UI update
   - Rollback on error

3. **Toggle Rule**
   - Immediate UI feedback
   - API call to enable/disable
   - Update badge state
   - Handle toggle failures

4. **Delete Rule**
   - Confirmation dialog
   - Remove from list
   - API call to delete
   - Show error if deletion fails

### VPN Configuration
1. **Server Setup**
   - Configure protocol, port, subnet
   - Generate server keys
   - Enable/disable server
   - Update DNS settings

2. **Peer Management**
   - Add peer with public key
   - Generate QR code for config
   - Monitor last handshake
   - Remove peer

3. **Client Connection**
   - Import VPN profile
   - Connect/disconnect
   - Display connection status
   - Show bandwidth stats

### Error Scenarios
1. **Network Errors**
   - API unreachable → Retry with backoff
   - Timeout → Show timeout message
   - Network disconnect → Queue requests

2. **Validation Errors**
   - Display field-level errors
   - Prevent form submission
   - Clear errors on input change

3. **Permission Errors**
   - 401 → Redirect to sign-in
   - 403 → Show permission denied message
   - 404 → Resource not found message

## Running Tests

### Unit Tests
```bash
cd packages/portal-astro
bun test
```

### Integration Tests (Docker)
```bash
bun test:integration:docker
# or from root
bun run test:integration:docker
```

### Integration Tests (QEMU)
```bash
bun test:integration:qemu
# or from root
bun run test:integration:qemu
```

### E2E Tests
```bash
cd packages/portal-astro
bun test:e2e
```

### Coverage Report
```bash
cd packages/portal-astro
bun test:coverage
```

## CI/CD Integration

### GitHub Actions Workflow
1. **Unit Tests**: Run on every PR
2. **Integration Tests**: Run on merge to main
3. **E2E Tests**: Run on staging deployment
4. **Coverage**: Upload to Codecov

### Test Matrix
- Node versions: 20.x, 22.x
- Browsers: Chrome, Firefox, Safari (Playwright)
- Environments: Docker, QEMU

## Debugging Tests

### Interactive Mode
```bash
bun test --ui
```

### Debug Single Test
```bash
bun test --reporter=verbose tests/integration/nat.test.ts
```

### Playwright Debug
```bash
bun test:e2e --debug
```

### View Test Coverage
```bash
bun test:coverage
open coverage/index.html
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Use Fixtures**: Reuse test data across tests
3. **Mock External Services**: Don't rely on real Clerk/API in unit tests
4. **Test User Behavior**: Focus on what users do, not implementation
5. **Descriptive Names**: Test names should describe the scenario
6. **Arrange-Act-Assert**: Structure tests consistently
7. **Async Handling**: Use `await` and `flushPromises()` correctly
8. **Cleanup**: Reset state between tests
9. **Accessibility**: Test with screen readers and keyboard navigation
10. **Performance**: Keep tests fast (<100ms for unit, <1s for integration)

## Maintenance

### Adding New Features
1. Write test first (TDD)
2. Implement feature
3. Verify test passes
4. Add integration/E2E test if needed

### Updating API
1. Update types in `lib/api/types.ts`
2. Update client in `lib/api/client.ts`
3. Update mock handlers
4. Update affected tests
5. Verify all tests pass

### Refactoring
1. Ensure tests pass before refactoring
2. Refactor code
3. Verify tests still pass
4. Update tests if behavior changed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Library](https://testing-library.com/docs/vue-testing-library/intro/)
