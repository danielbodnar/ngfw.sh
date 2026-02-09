# Portal Integration Test Plan

## API Integration Analysis

### Identified API Endpoints

Based on `/packages/portal/src/api.ts`, the portal integrates with the following Schema API endpoints:

1. **GET `/fleet/devices`** - List all devices for authenticated user
2. **POST `/fleet/devices`** - Register a new device
3. **GET `/fleet/devices/:id/status`** - Get device status and metrics
4. **DELETE `/fleet/devices/:id`** - Delete a device

### Authentication

- **Method**: Clerk JWT tokens via `Authorization: Bearer` header
- **Token Source**: `useAuth().getToken()` from `@clerk/clerk-react`
- **API Base URL**: `import.meta.env.VITE_API_URL` (defaults to `https://specs.ngfw.sh`)

### Data Models

```typescript
interface Device {
  id: string;
  name: string;
  model: string | null;
  serial: string | null;
  owner_id: string;
  firmware_version: string | null;
  status: 'provisioning' | 'online' | 'offline';
  created_at: number;
  last_seen: number | null;
}

interface DeviceStatus {
  device: Device;
  connection: {
    online: boolean;
    last_seen: number | null;
  } | null;
  metrics: {
    uptime: number;
    cpu: number;
    memory: number;
    temperature: number | null;
    load: [number, number, number];
    connections: number;
  } | null;
}
```

## Critical User Flows

### Flow 1: User Sign-In
**Steps:**
1. User visits portal
2. Sees SignIn component (Clerk)
3. Enters credentials or OAuth
4. Redirected to dashboard
5. JWT token obtained and stored

**Test Coverage:**
- Successful sign-in redirects to dashboard
- Failed sign-in shows error
- Token is properly stored and used in API calls

### Flow 2: Device Registration
**Steps:**
1. User clicks "Register Device" button
2. Modal opens with registration form
3. User enters device name and optional model
4. Submits form
5. API returns device with api_key
6. Modal shows API key and installation instructions
7. Device appears in device list with "provisioning" status

**Test Coverage:**
- Form validation (empty name)
- API success response handling
- API key display (one-time only)
- Installation instructions rendered
- Device list updates after registration

### Flow 3: View Device List
**Steps:**
1. Dashboard loads
2. `useDevices` hook fetches device list
3. Devices displayed with status badges
4. User can click on device to see details

**Test Coverage:**
- Loading state shown while fetching
- Empty state when no devices
- Device cards render with correct data
- Status badges show correct colors
- Error handling for API failures

### Flow 4: View Device Metrics
**Steps:**
1. User selects a device
2. `useDeviceStatus` hook starts polling every 5s
3. Metrics displayed in dashboard
4. Real-time updates as metrics change
5. Polling stops when device deselected

**Test Coverage:**
- Initial metrics load
- Polling interval (5s)
- Metrics update in UI
- Polling cleanup on unmount
- Offline device handling

### Flow 5: Delete Device
**Steps:**
1. User clicks delete button on device
2. Confirmation dialog shown
3. User confirms deletion
4. API DELETE request sent
5. Device removed from list
6. Success message shown

**Test Coverage:**
- Confirmation required before delete
- API success handling
- Device list updates after deletion
- Error handling for API failures
- Cannot delete device with active connection

## React Hooks Testing

### `useDevices()`
**Returns:** `{ devices, loading, error, refetch }`

**Test Scenarios:**
- Initial fetch on mount
- Loading state management
- Success: populates devices array
- Error: sets error message
- Refetch updates device list
- Cleanup on unmount

### `useDeviceStatus(deviceId)`
**Returns:** `{ status, loading, error }`

**Test Scenarios:**
- No polling when deviceId is null
- Starts polling on deviceId change
- Polling interval is 5000ms
- Updates status on each poll
- Stops polling when deviceId becomes null
- Stops polling on unmount
- Error handling doesn't stop polling

### `useRegisterDevice()`
**Returns:** `{ register, loading, error }`

**Test Scenarios:**
- Initial state (not loading, no error)
- Loading state during registration
- Success: returns DeviceRegistrationResponse
- Error: sets error message and throws
- Can register multiple devices sequentially

## API Client Testing

### `createApiClient(getToken)`

**Test Scenarios:**
- Creates client with correct base URL
- Uses env variable VITE_API_URL if set
- Removes trailing slashes from base URL
- Includes Authorization header when token present
- Omits Authorization header when token is null
- Sets Content-Type: application/json
- Handles 204 No Content responses
- Parses JSON responses
- Throws ApiError with status and message
- Extracts error message from response body
- Falls back to statusText on JSON parse failure

### HTTP Methods Coverage
- GET requests (listDevices, getDeviceStatus)
- POST requests (registerDevice)
- DELETE requests (deleteDevice)
- URL encoding for path parameters

## Playwright E2E Tests

### Test 1: Complete Device Registration Flow
1. Sign in with test user
2. Navigate to devices page
3. Click "Register Device"
4. Fill form with device name
5. Submit form
6. Verify API key displayed
7. Copy installation command
8. Close modal
9. Verify device in list with "provisioning" status

### Test 2: Device Metrics Dashboard
1. Sign in with test user
2. Mock device with online status
3. Select device from list
4. Verify metrics load
5. Wait 5 seconds
6. Verify metrics update (polling)
7. Switch to different device
8. Verify new metrics load

### Test 3: Device Deletion
1. Sign in with test user
2. Create test device via API
3. Navigate to devices page
4. Click delete on test device
5. Confirm deletion in dialog
6. Verify device removed from list
7. Verify API DELETE called

### Test 4: Error Handling
1. Mock API to return 401 Unauthorized
2. Attempt to load devices
3. Verify error message shown
4. Mock API to return 500 Server Error
5. Attempt to register device
6. Verify error message shown

## Test Environment Compatibility

### Docker Environment
- Use mock API server from `/tests/integration/mock-api`
- Configure VITE_API_URL to point to mock server
- Mock Clerk authentication
- Seed test devices in mock database

### QEMU Environment
- Full system emulation with agent running
- Real WebSocket connections
- Test actual device status updates
- Verify metrics accuracy

## Feature Parity with portal-astro

### Shared Features to Test
1. Authentication (Clerk)
2. Device list view
3. Device registration
4. Device status display
5. Device metrics polling
6. Device deletion
7. Error handling
8. Loading states
9. Empty states

### Portal-Specific Features
The original portal (React) has a much richer UI with many mock views:
- Dashboard with graphs and charts
- Firewall rules management
- Traffic logs
- DNS query logs
- DHCP leases
- WiFi network management
- VPN configuration
- QoS settings
- Billing page
- Profile page

**Note**: Most of these are mock data displays, not real API integrations. Our integration tests focus on the real API integrations identified above.

## Test Coverage Goals

- **Unit Tests**: 100% coverage for API client and hooks
- **Integration Tests**: All critical user flows covered
- **E2E Tests**: Minimum 5 key scenarios
- **Error Scenarios**: All error paths tested
- **Edge Cases**: Null values, empty responses, network failures

## Test Execution Strategy

### Phase 1: Unit Tests (Vitest)
- Test API client in isolation
- Test hooks with mocked dependencies
- Fast execution, no real network calls

### Phase 2: Integration Tests (Vitest + MSW)
- Mock HTTP requests with MSW
- Test hooks with real React rendering
- Test component integration with hooks

### Phase 3: E2E Tests (Playwright)
- Full browser automation
- Real authentication flow
- Mock API responses at network level
- Visual regression testing

### Phase 4: Docker/QEMU Integration
- Deploy to test environment
- Run against mock API server
- Verify real-time WebSocket updates
- Performance and load testing

## Success Criteria

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Tests run in CI/CD pipeline
- [ ] Tests compatible with Docker environment
- [ ] Tests compatible with QEMU environment
- [ ] Test coverage report generated
- [ ] Documentation complete
