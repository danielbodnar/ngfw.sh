# NGFW.sh Portal (React)

Cloud-managed next-generation firewall web portal built with React 19, Vite, and TailwindCSS 4.

> **Status:** This is the original React portal. The project is migrating to Astro+Vue in `packages/portal-astro`. This portal remains functional and fully tested.

## Features

### ✅ Production Features

These features are connected to real APIs and fully functional:

- **Authentication:** Clerk.com integration with JWT tokens
- **Device Management:** Register, list, view, and delete devices
- **Real-Time Monitoring:** Live metrics polling (5-second interval)
- **Device Status:** Online/offline/provisioning status badges
- **Metrics Display:** CPU, memory, temperature, load, connections, uptime

### 🎨 UI Mockups

These features have complete UI implementations with mock data (not connected to APIs):

- Dashboard with graphs and statistics
- Firewall rule management
- Traffic and DNS query logs
- DHCP lease management
- WiFi network configuration
- VPN server and client setup
- QoS traffic shaping
- Dynamic DNS configuration
- Billing and subscription management
- User profile settings

## Architecture

```
src/
├── api.ts                    # Typed API client for Schema API
├── hooks/
│   └── useDevices.ts         # React hooks for device management
├── main.tsx                  # Application entry point with ClerkProvider
├── App.tsx                   # Main application component (1000+ lines)
├── test/
│   ├── setup.ts              # Vitest test configuration
│   └── mocks/
│       └── clerk.ts          # Clerk authentication mocks
├── api.test.ts               # API client unit tests (23 tests)
└── hooks/
    └── useDevices.test.ts    # React hooks unit tests (26 tests)

e2e/
├── auth.spec.ts              # Authentication flow tests
├── device-registration.spec.ts
├── device-list.spec.ts
├── device-metrics.spec.ts
└── device-deletion.spec.ts

scripts/
├── test-docker.sh            # Run tests in Docker
└── test-qemu.sh              # Run tests in QEMU VM
```

## API Integration

### Schema API (specs.ngfw.sh)

All API calls go through the typed client in `src/api.ts`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/fleet/devices` | GET | List user's devices |
| `/fleet/devices` | POST | Register new device |
| `/fleet/devices/:id` | DELETE | Delete device |
| `/fleet/devices/:id/status` | GET | Get device status and metrics |

### Authentication

- **Provider:** Clerk.com
- **Instance:** `tough-unicorn-25.clerk.accounts.dev`
- **Token:** JWT via `Authorization: Bearer` header
- **Session:** Managed by ClerkProvider

## Testing

### Test Suite Overview

- **Unit Tests:** 49 tests across API client and React hooks
- **E2E Tests:** 40+ tests covering all user flows
- **Integration Tests:** Docker and QEMU environments
- **Coverage:** 100% of API integrations

### Running Tests

```bash
# Install dependencies
bun install

# Unit and integration tests
bun run test              # Run once
bun run test:watch        # Watch mode
bun run test:ui           # Interactive UI
bun run test:coverage     # With coverage report

# E2E tests
bun run test:e2e          # All Playwright tests
bunx playwright test --ui # Interactive mode
bunx playwright test --headed # Watch browser

# Docker integration tests
bun run test:docker       # Full Docker environment
./scripts/test-docker.sh

# QEMU integration tests
bun run test:qemu         # Full system emulation
./scripts/test-qemu.sh
```

### Test Files

**Unit Tests:**
- `src/api.test.ts` - API client tests (23 tests)
  - HTTP methods (GET, POST, DELETE)
  - Authentication headers
  - Error handling
  - Response parsing
- `src/hooks/useDevices.test.ts` - React hooks tests (26 tests)
  - `useDevices()` - Device list fetching
  - `useDeviceStatus()` - Metrics polling
  - `useRegisterDevice()` - Device registration

**E2E Tests:**
- `e2e/auth.spec.ts` - Sign-in flows
- `e2e/device-registration.spec.ts` - Device registration wizard
- `e2e/device-list.spec.ts` - Device list display
- `e2e/device-metrics.spec.ts` - Real-time monitoring
- `e2e/device-deletion.spec.ts` - Device deletion

### Test Infrastructure

**Docker Environment:**
```bash
docker-compose.test.yml
├── mock-api       # Mock Schema API (port 8787)
├── portal         # Portal dev server (port 5173)
└── playwright     # Test runner
```

**QEMU Environment:**
- Full ARM64 system emulation
- Real router agent running
- Actual WebSocket connections
- Integration with existing `tests/integration/` setup

### Mock API Server

Uses the existing mock server from `tests/integration/mock-api`:

- WebSocket RPC protocol support
- Device registration endpoint
- Status and metrics endpoints
- Configurable responses

## Development

### Prerequisites

- Bun 1.2+
- Node.js 20+ (for Playwright)
- Docker (for integration tests)
- QEMU (optional, for full system tests)

### Setup

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

### Environment Variables

Create `.env.local`:

```bash
VITE_API_URL=https://specs.ngfw.sh
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
DEMO_INSTANCE=false
```

For testing, use `.env.test` (already configured).

### Component Structure

The main `App.tsx` contains:
- Navigation sidebar with 25+ menu items
- Device management dashboard
- Metrics visualization components
- Mock UI for future features

Key React hooks:
- `useDevices()` - Fetch and manage device list
- `useDeviceStatus(deviceId)` - Poll device metrics every 5s
- `useRegisterDevice()` - Register new devices

## Deployment

### Cloudflare Pages

```bash
# Build
bun run build

# Deploy
bun run deploy
# or
wrangler pages deploy dist
```

### Configuration

Cloudflare Workers configuration in `wrangler.toml`:

```toml
name = "ngfw-portal"
compatibility_date = "2026-01-10"
pages_build_output_dir = "dist"
```

## Test Results

### Coverage Summary

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| API Client | 1 | 23 | 100% |
| React Hooks | 1 | 26 | 100% |
| E2E Flows | 5 | 40+ | All critical paths |

### CI/CD

Tests run on:
- ✅ GitHub Actions (unit tests)
- ✅ Docker environment (integration tests)
- ✅ QEMU environment (full system tests)

## Feature Parity

See [FEATURE_PARITY.md](./FEATURE_PARITY.md) for detailed comparison with `portal-astro`.

**Summary:**
- ✅ All API integrations: Feature parity
- ✅ All test coverage: React portal only
- 🎨 UI mockups: React portal only
- 🔄 Modern architecture: portal-astro (Astro+Vue)

## Known Issues

- Large monolithic App.tsx (1000+ lines) - refactor recommended
- Mock data mixed with real API calls - needs separation
- No component-level unit tests - only hooks tested
- TypeScript strict mode violations in App.tsx

## Migration Notes

This portal is being replaced by `packages/portal-astro` which offers:
- Better architecture (Astro + Vue 3)
- Modular component structure
- Cleaner separation of concerns
- Same functionality for API integrations

The comprehensive test suite created here is **portable** to portal-astro:
- E2E tests work without modification
- Unit tests need adaptation (React → Vue)
- Docker/QEMU infrastructure is reusable

## Documentation

- [Test Plan](./TEST_PLAN.md) - Comprehensive testing strategy
- [Feature Parity](./FEATURE_PARITY.md) - Comparison with portal-astro
- [Architecture](../../ARCHITECTURE.md) - System-wide architecture
- [Project Status](../../PROJECT.md) - Development roadmap

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact: daniel.bodnar@gmail.com
