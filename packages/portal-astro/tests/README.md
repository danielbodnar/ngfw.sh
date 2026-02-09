# Portal-Astro Test Suite

Comprehensive testing infrastructure for the NGFW portal-astro frontend application.

## Quick Start

```bash
# Install dependencies
cd packages/portal-astro
bun install

# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run with UI
bun test:ui

# Run E2E tests
bun test:e2e

# Generate coverage report
bun test:coverage
```

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── fixtures/                   # Test data fixtures
│   └── index.ts               # Mock devices, rules, configs
├── mocks/                      # API mocking
│   └── handlers.ts            # MSW request handlers
├── utils/                      # Test utilities
│   └── test-utils.ts          # Helper functions
├── integration/                # Integration tests
│   ├── api-client.test.ts     # API client tests
│   └── composables.test.ts    # Composable tests
├── e2e/                        # End-to-end tests
│   ├── auth.spec.ts           # Authentication flows
│   ├── nat-rules.spec.ts      # NAT management
│   └── onboarding.spec.ts     # User onboarding
├── docker-compose.test.yml     # Docker test environment
├── run-integration-tests.sh    # Docker test runner
└── run-qemu-tests.sh          # QEMU test runner
```

## Test Types

### Unit Tests

Test individual functions and composables in isolation.

```bash
bun test tests/unit
```

### Integration Tests

Test API client integration and composable data flows.

```bash
bun test:integration
```

**Coverage:**
- API client authentication
- Device management API calls
- NAT rule CRUD operations
- VPN configuration
- IPS management
- Composable state management
- Error handling

### E2E Tests

Test complete user journeys in a real browser.

```bash
bun test:e2e
```

**Coverage:**
- Authentication (sign-in, sign-out, session persistence)
- NAT rule management (create, edit, delete, toggle)
- User onboarding (device registration, configuration)
- Dashboard navigation
- Error states and recovery

## Test Environments

### Local Development

Tests run against mocked API (MSW) for fast iteration.

```bash
bun test
```

### Docker Environment

Full stack in containers: Schema API + Portal + Tests

```bash
./tests/run-integration-tests.sh
```

**Components:**
- Miniflare (Cloudflare Workers local runtime)
- D1 database (SQLite)
- Astro dev server
- Playwright test runner

### QEMU Environment

Complete system test with ARM64 emulation and agent.

```bash
./tests/run-qemu-tests.sh
```

**Requirements:**
- QEMU system ARM64
- Pre-built VM image
- 2GB RAM, 2 CPUs

## Writing Tests

### Composable Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { setupMockServer, flushPromises } from '../utils/test-utils';
import { useDevices } from '@/composables/useDevices';

setupMockServer();

describe('useDevices', () => {
  it('fetches devices on mount', async () => {
    const TestComponent = {
      setup() {
        return useDevices();
      },
      template: '<div></div>',
    };

    const wrapper = mount(TestComponent);
    await flushPromises();

    const { data, loading } = wrapper.vm as any;
    expect(loading.value).toBe(false);
    expect(data.value).toHaveLength(2);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('creates NAT rule', async ({ page }) => {
  await page.goto('/security/nat');
  await page.click('button:has-text("Add Rule")');

  await page.fill('input[name="name"]', 'SSH');
  await page.fill('input[name="external_port"]', '22');
  await page.click('button:has-text("Create")');

  await expect(page.locator('text=SSH')).toBeVisible();
});
```

## Test Fixtures

Reusable test data in `/tests/fixtures/index.ts`:

```typescript
import { devices, natRules, mockUser, mockToken } from '../fixtures';

// Use in tests
expect(result).toEqual(devices);
```

## Mocking APIs

MSW handlers in `/tests/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

http.get('https://api.ngfw.sh/fleet/devices', () => {
  return HttpResponse.json(devices);
});
```

## Coverage Reports

```bash
# Generate coverage
bun test:coverage

# View HTML report
open coverage/index.html
```

**Targets:**
- Lines: 70%
- Functions: 70%
- Branches: 65%
- Statements: 70%

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Tests
  run: |
    cd packages/portal-astro
    bun install
    bun test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

### Pre-commit Hook

```bash
#!/bin/sh
cd packages/portal-astro
bun test --run
```

## Debugging

### Interactive Test UI

```bash
bun test:ui
```

### Debug E2E Tests

```bash
bun test:e2e:debug
```

### View E2E Test Report

```bash
bun test:e2e:report
```

### Run Single Test File

```bash
bun test tests/integration/api-client.test.ts
```

### Run Tests with Verbose Output

```bash
bun test --reporter=verbose
```

## Common Issues

### Tests Fail with "Network Error"

- Check MSW handlers are properly set up
- Verify `setupMockServer()` is called in test file
- Ensure API base URL matches mock handlers

### E2E Tests Timeout

- Increase timeout in `playwright.config.ts`
- Check dev server is running
- Verify network connectivity in Docker/QEMU

### Flaky Tests

- Add explicit waits: `await page.waitForSelector()`
- Use `flushPromises()` after async operations
- Avoid time-based waits, use condition-based waits

### Component Tests Fail

- Check Vue Test Utils version compatibility
- Verify component imports are correct
- Ensure global mocks are set up in `tests/setup.ts`

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Use Fixtures**: Reuse test data across tests
3. **Mock External Services**: Don't rely on real APIs
4. **Test User Behavior**: Focus on what users do
5. **Descriptive Names**: Test names should describe scenarios
6. **Async Handling**: Always await async operations
7. **Cleanup**: Reset state between tests
8. **Accessibility**: Test keyboard navigation and screen readers
9. **Performance**: Keep tests fast (<100ms unit, <1s integration)
10. **Documentation**: Comment complex test scenarios

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Main Testing Guide](../TESTING.md)

## Support

For questions or issues:
1. Check the main [TESTING.md](../TESTING.md) guide
2. Review test examples in `tests/` directory
3. Check CI logs for error patterns
4. Open an issue with test output
