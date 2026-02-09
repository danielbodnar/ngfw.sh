# Portal Test Suite Analysis and Fixes

## Executive Summary

Successfully diagnosed and partially fixed portal React/Vitest test issues. The API tests now pass completely (19/19), but React hook tests with fake timers require additional configuration changes.

## Issues Identified

### 1. Missing Dependencies (FIXED)
- **Problem**: `jsdom` was listed in package.json but not installed
- **Solution**: Ran `bun install` to install missing dependencies
- **Status**: ✅ RESOLVED

### 2. E2E Tests Mixed with Unit Tests (FIXED)
- **Problem**: Playwright e2e tests in `e2e/` directory were being picked up by Vitest
- **Solution**: Added `e2e/` to Vitest exclude patterns in `vitest.config.ts`
- **Status**: ✅ RESOLVED

### 3. API URL Mismatch (FIXED)
- **Problem**: Test setup used `https://test-api.ngfw.sh` but code expects `https://specs.ngfw.sh`
- **Solution**: Updated `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/test/setup.ts` to use correct URL
- **Status**: ✅ RESOLVED

### 4. Clerk Mock Not Imported (FIXED)
- **Problem**: Clerk authentication mock wasn't being loaded in test setup
- **Solution**: Added `import './mocks/clerk'` to test setup file
- **Status**: ✅ RESOLVED

### 5. Fake Timers with Async Operations (PARTIAL)
- **Problem**: Tests using `vi.useFakeTimers()` timeout because `setInterval` creates infinite loops with `vi.runAllTimersAsync()`
- **Root Cause**: The `useDeviceStatus` hook uses `setInterval` for polling, which creates an infinite loop when fake timers try to run all timers
- **Status**: ⚠️ REQUIRES CONFIGURATION CHANGE

##Test Results

### API Tests (`src/api.test.ts`)
**Status: ✅ ALL PASSING (19/19)**

```
✓ listDevices - should fetch devices with authentication
✓ listDevices - should work without token
✓ listDevices - should remove trailing slashes from base URL
✓ listDevices - should throw ApiError on 401 Unauthorized
✓ listDevices - should throw ApiError on 500 Server Error
✓ listDevices - should fall back to statusText if error body is not JSON
✓ registerDevice - should register device with name and model
✓ registerDevice - should register device with only name
✓ registerDevice - should throw ApiError on validation failure
✓ getDeviceStatus - should fetch device status with metrics
✓ getDeviceStatus - should URL encode device ID
✓ getDeviceStatus - should handle offline device
✓ getDeviceStatus - should throw ApiError on 404 Not Found
✓ deleteDevice - should delete device and return void
✓ deleteDevice - should URL encode device ID
✓ deleteDevice - should throw ApiError on 404 Not Found
✓ deleteDevice - should throw ApiError on 403 Forbidden
✓ ApiError - should create error with status and message
✓ ApiError - should be throwable and catchable
```

### Hook Tests (`src/hooks/useDevices.test.ts`)
**Status: ⚠️ PARTIAL (12/21 passing)**

**Passing Tests:**
- ✅ useDevices - all 6 tests passing
- ✅ useDeviceStatus - should not poll when deviceId is null
- ✅ useRegisterDevice - 4/5 tests passing

**Failing Tests:**
- ❌ useDeviceStatus - 7 tests failing (timeout issues with fake timers)
- ❌ useRegisterDevice - should set loading state during registration

## Files Modified

### 1. `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/vitest.config.ts`
**Changes:**
- Added `exclude` array to prevent Vitest from running e2e tests
- Added `e2e/` to coverage exclusions

```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/e2e/**',  // ← NEW
    '**/.{git,cache,output,temp}/**',
  ],
  // ...
}
```

### 2. `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/test/setup.ts`
**Changes:**
- Imported Clerk mocks to ensure they're loaded
- Fixed API URL from `https://test-api.ngfw.sh` to `https://specs.ngfw.sh`

```typescript
import './mocks/clerk';  // ← NEW

process.env.VITE_API_URL = 'https://specs.ngfw.sh';  // ← FIXED
```

### 3. `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/hooks/useDevices.test.ts`
**Changes:**
- Imported `act` from `@testing-library/react`
- Removed calls to `vi.runAllTimersAsync()` which causes infinite loops
- Wrapped timer advances in `act()` calls
- Simplified async operations to avoid race conditions

## Recommended Solutions for Remaining Issues

### Option 1: Remove Fake Timers (RECOMMENDED)
The simplest solution is to remove fake timers entirely and let the real timers run with appropriate timeouts:

```typescript
describe('useDeviceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // REMOVE: vi.useFakeTimers();
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    mockGetToken.mockResolvedValue('test-token');
  });

  afterEach(() => {
    // REMOVE: vi.useRealTimers();
  });

  it('should poll every 5 seconds', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockStatus,
    } as Response);

    const { result, unmount } = renderHook(() => useDeviceStatus('device-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Wait for next poll (need to wait slightly more than 5 seconds)
    await new Promise(resolve => setTimeout(resolve, 5100));

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    unmount(); // Clean up
  }, 10000); // Increase timeout to 10s
});
```

### Option 2: Mock setInterval (ALTERNATIVE)
Instead of using fake timers, mock `setInterval` directly:

```typescript
beforeEach(() => {
  vi.spyOn(global, 'setInterval');
  vi.spyOn(global, 'clearInterval');
});

it('should setup polling interval', () => {
  renderHook(() => useDeviceStatus('device-123'));
  expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
});
```

### Option 3: Use Vitest's `vi.advanceTimersToNextTimerAsync()`
This advances only to the next scheduled timer instead of running all:

```typescript
it('should poll every 5 seconds', async () => {
  vi.useFakeTimers();

  const { result } = renderHook(() => useDeviceStatus('device-123'));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(globalThis.fetch).toHaveBeenCalledTimes(1);

  // Advance to next timer only
  await act(async () => {
    await vi.advanceTimersToNextTimerAsync();
  });

  expect(globalThis.fetch).toHaveBeenCalledTimes(2);

  vi.useRealTimers();
});
```

## Connection Issues Analysis

The portal **does NOT have mock API connection issues**. The tests were failing because:

1. Wrong API URL configured in test setup (`test-api.ngfw.sh` vs `specs.ngfw.sh`)
2. Clerk mocks not being imported
3. Fake timer issues preventing async operations from completing

All API client tests now pass, proving the API connection layer works correctly.

## Summary Statistics

- **Total Tests**: 40
- **Passing**: 31 (77.5%)
- **Failing**: 9 (22.5%)
- **Test Files**: 2
  - `src/api.test.ts`: ✅ 19/19 (100%)
  - `src/hooks/useDevices.test.ts`: ⚠️ 12/21 (57%)

## Next Steps

1. **IMMEDIATE**: Implement Option 1 (remove fake timers) for the `useDeviceStatus` tests
2. Fix the loading state test in `useRegisterDevice`
3. Consider adding integration tests that test the full component tree
4. Add test coverage reporting to CI/CD pipeline

## Technical Details

### Why Fake Timers Fail with setInterval

When using `vi.useFakeTimers()`, Vitest replaces native timer functions. The `useDeviceStatus` hook uses:

```typescript
const id = setInterval(() => void poll(), POLL_INTERVAL_MS);
```

When tests call `vi.runAllTimersAsync()`, Vitest tries to execute all pending timers. However, `setInterval` schedules itself repeatedly, creating an infinite loop. Vitest detects this and aborts after 10,000 timer executions.

### Proper Fake Timer Usage

For interval-based code, use one of:
1. `vi.advanceTimersByTime(ms)` - Advance by specific duration
2. `vi.advanceTimersToNextTimerAsync()` - Advance to next timer only
3. `vi.runOnlyPendingTimersAsync()` - Run currently pending timers (not future ones)

**Never use** `vi.runAllTimersAsync()` with `setInterval`.

## Files Referenced

- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/package.json`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/vitest.config.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/test/setup.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/test/mocks/clerk.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/api.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/api.test.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/hooks/useDevices.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal/src/hooks/useDevices.test.ts`

---

**Report Generated**: 2026-02-09
**Test Framework**: Vitest 4.0.18 + React Testing Library 16.3.2
**Status**: API tests passing, hook tests require fake timer removal
