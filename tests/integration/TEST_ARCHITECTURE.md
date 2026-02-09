# Test Architecture Diagram

Visual representation of the Docker-based integration test environment.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NGFW.sh Integration Tests                         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   Docker Test Network                          │ │
│  │                                                                 │ │
│  │  ┌──────────────────┐         ┌──────────────────┐            │ │
│  │  │   Mock API       │         │   Agent          │            │ │
│  │  │   (Bun)          │◄───────►│   (aarch64)      │            │ │
│  │  │                  │         │                  │            │ │
│  │  │  WebSocket RPC   │  WS/TLS │  Rust Binary     │            │ │
│  │  │  - AUTH          │         │  - Adapters      │            │ │
│  │  │  - STATUS        │         │  - Collectors    │            │ │
│  │  │  - METRICS       │         │  - Handlers      │            │ │
│  │  │  - PING/PONG     │         │                  │            │ │
│  │  │                  │         │  Mock Firmware:  │            │ │
│  │  │  :8787           │         │  - nvram         │            │ │
│  │  └──────────────────┘         │  - wl            │            │ │
│  │                                │  - ip            │            │ │
│  │                                │  - iptables      │            │ │
│  │                                │  - service       │            │ │
│  │                                │                  │            │ │
│  │                                │  Mock Sysfs:     │            │ │
│  │                                │  - thermal       │            │ │
│  │                                │  - network       │            │ │
│  │                                └──────────────────┘            │ │
│  │                                                                 │ │
│  │  ┌──────────────────┐         ┌──────────────────┐            │ │
│  │  │   Schema API     │         │   Portal         │            │ │
│  │  │   (Optional)     │         │   (Optional)     │            │ │
│  │  │                  │         │                  │            │ │
│  │  │  Hono + Chanfana │         │  Astro + Vue     │            │ │
│  │  │  :8788           │         │  :4321           │            │ │
│  │  └──────────────────┘         └──────────────────┘            │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Test Runner                               │ │
│  │  - Shell scripts (run-docker.sh, test-*.sh)                   │ │
│  │  - Validates responses, checks logs, generates reports        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Test Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Test Layers                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Layer 1: Firmware Simulation                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Mock Binaries          Mock Sysfs                          │   │
│  │  - nvram                - /sys/class/thermal/               │   │
│  │  - wl                   - /sys/class/net/                   │   │
│  │  - ip                                                       │   │
│  │  - iptables                                                 │   │
│  │  - service                                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            ▲                                          │
│                            │                                          │
│  Layer 2: Agent (Rust)                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  System Adapters:                                           │   │
│  │  - FirewallAdapter      - collect_firewall_rules()          │   │
│  │  - NetworkAdapter       - collect_interface_stats()         │   │
│  │  - WiFiAdapter          - collect_radio_status()            │   │
│  │  - SystemAdapter        - collect_system_metrics()          │   │
│  │                                                              │   │
│  │  WebSocket Client:                                          │   │
│  │  - Connection management                                    │   │
│  │  - Authentication                                           │   │
│  │  - Message serialization                                    │   │
│  │  - Reconnection logic                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            ▲                                          │
│                            │ WebSocket + RPC                          │
│  Layer 3: API Server (Mock)                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Message Handlers:                                          │   │
│  │  - handleAuth()         - handleMetrics()                   │   │
│  │  - handleStatus()       - handlePing()                      │   │
│  │  - handleLog()          - handleAlert()                     │   │
│  │                                                              │   │
│  │  State Management:                                          │   │
│  │  - Device registry (Map<device_id, state>)                 │   │
│  │  - Connection tracking                                      │   │
│  │  - Message history                                          │   │
│  │                                                              │   │
│  │  HTTP Endpoints:                                            │   │
│  │  - GET /health          - GET /status                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            ▲                                          │
│                            │ HTTP / WebSocket                         │
│  Layer 4: Test Validation                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Test Scripts:                                              │   │
│  │  - Connection validation                                    │   │
│  │  - Authentication checks                                    │   │
│  │  - Message format validation                                │   │
│  │  - Performance benchmarks                                   │   │
│  │  - Load testing                                             │   │
│  │  - Error scenario testing                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Test Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Test Execution Sequence                           │
└─────────────────────────────────────────────────────────────────────┘

1. SETUP PHASE
   │
   ├─► Register QEMU binfmt (aarch64 emulation)
   │
   ├─► Build agent container
   │   └─► Cross-compile Rust → aarch64-musl
   │
   ├─► Start mock API server
   │   └─► Health check: GET /health
   │
   └─► Start agent container
       └─► Wait for healthy status

2. CONNECTION PHASE
   │
   ├─► Agent: Open WebSocket
   │   └─► ws://mock-api:8787/agent/ws
   │
   ├─► Agent: Send AUTH message
   │   └─► { id, type: "AUTH", payload: { device_id, api_key, ... } }
   │
   ├─► Mock API: Validate credentials
   │   └─► Respond: { type: "AUTH_OK", ... }
   │
   └─► Test: Verify authentication
       └─► curl http://localhost:8787/status

3. DATA COLLECTION PHASE
   │
   ├─► Agent: Collect system metrics
   │   ├─► Read mock binaries (nvram, wl, ip, iptables)
   │   ├─► Read mock sysfs (thermal, network)
   │   └─► Parse and aggregate
   │
   ├─► Agent: Send STATUS message
   │   └─► { type: "STATUS", payload: { uptime, cpu, memory, ... } }
   │
   ├─► Mock API: Store status
   │   └─► device_states.set(device_id, payload)
   │
   ├─► Agent: Send METRICS (every 5s)
   │   └─► { type: "METRICS", payload: { cpu, memory, interfaces, ... } }
   │
   └─► Mock API: Update metrics
       └─► device_states.get(device_id).last_metrics = payload

4. VALIDATION PHASE
   │
   ├─► Test: Query device status
   │   └─► curl http://localhost:8787/status | jq
   │
   ├─► Test: Verify data format
   │   ├─► Check authentication: true
   │   ├─► Check device_id matches
   │   ├─► Check firmware_version present
   │   ├─► Check last_status present
   │   ├─► Check last_metrics present
   │   └─► Check messages_received > 0
   │
   ├─► Test: Check agent logs
   │   └─► docker compose logs agent | grep -i "error"
   │
   └─► Test: Check API logs
       └─► docker compose logs mock-api | grep "AUTH_OK\|STATUS_OK"

5. CLEANUP PHASE
   │
   ├─► Stop containers
   │   └─► docker compose down
   │
   ├─► Generate report
   │   └─► Output test results
   │
   └─► Exit with status
       ├─► 0 = success
       └─► 1 = failure
```

## Test Suite Organization

```
tests/integration/
│
├── docker/                          # Docker-based tests
│   ├── compose.yaml                 # Basic: Mock API + Agent
│   ├── compose-full.yaml            # Full: + Schema API + Portal
│   ├── compose-ci.yaml              # CI: Optimized for pipelines
│   │
│   ├── Dockerfile                   # Agent container build
│   ├── config.toml                  # Agent test configuration
│   ├── entrypoint.sh                # Agent container startup
│   │
│   ├── run-all-tests.sh             # Run all test suites
│   ├── test-firmware-adapter.sh     # Mock binary tests
│   ├── test-full-stack.sh           # Full API integration
│   ├── test-performance.sh          # Performance benchmarks
│   └── test-load.sh                 # Load testing
│
├── mock-api/                        # WebSocket API simulator
│   ├── server.ts                    # Bun WebSocket server
│   └── package.json                 # Dependencies
│
├── mock-bins/                       # Firmware command simulators
│   ├── nvram                        # NVRAM reads
│   ├── wl                           # WiFi status
│   ├── ip                           # Network interfaces
│   ├── iptables                     # Firewall rules
│   └── service                      # Service control
│
├── mock-sysfs/                      # Kernel sysfs simulator
│   └── class/
│       ├── thermal/                 # Temperature sensors
│       └── net/                     # Network statistics
│
├── qemu/                            # QEMU VM-based tests
│   ├── build-image.sh               # Create VM image
│   ├── launch.sh                    # Start VM
│   └── user-data.yaml               # Cloud-init config
│
├── run-docker.sh                    # Quick Docker test
├── run-qemu.sh                      # Quick QEMU test
├── run-ci.sh                        # CI/CD runner
│
└── Documentation
    ├── DOCKER_TESTING.md            # Comprehensive guide
    ├── QUICK_START.md               # 5-minute guide
    ├── TESTING_SUMMARY.md           # Implementation summary
    └── TEST_ARCHITECTURE.md         # This file
```

## CI/CD Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                           │
└─────────────────────────────────────────────────────────────────────┘

Trigger: Push to main, Pull Request
   │
   ▼
Setup Environment
   ├─► Checkout code
   ├─► Set up QEMU (arm64 support)
   ├─► Set up Docker Buildx
   ├─► Install Bun
   └─► Cache Docker layers
   │
   ▼
Run Tests
   ├─► export CI=true
   ├─► bun run test:integration:docker
   │   │
   │   ├─► Register QEMU binfmt
   │   ├─► Build agent (--no-cache in CI)
   │   ├─► Start services
   │   ├─► Wait for authentication (120s timeout)
   │   ├─► Verify metrics
   │   ├─► Check logs for errors
   │   └─► Output JSON summary
   │
   └─► Generate artifacts
       ├─► Test results (JSON)
       ├─► Test logs
       └─► Performance metrics
   │
   ▼
Report Results
   ├─► Upload artifacts (30 day retention)
   ├─► Comment on PR with results
   └─► Set workflow status (pass/fail)
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Message Flow: Agent → API                         │
└─────────────────────────────────────────────────────────────────────┘

Agent Container                          Mock API Container
     │                                           │
     │  1. WebSocket Upgrade                    │
     ├──────────────────────────────────────────►
     │                                           │
     │  2. AUTH { device_id, api_key }          │
     ├──────────────────────────────────────────►
     │                                           │
     │                          Validate         │
     │                          Credentials      │
     │                                           │
     │  3. AUTH_OK { success: true }            │
     ◄──────────────────────────────────────────┤
     │                                           │
     │  4. STATUS { uptime, cpu, memory, ... }  │
     ├──────────────────────────────────────────►
     │                                           │
     │                          Store Status     │
     │                          in Map           │
     │                                           │
     │  5. STATUS_OK {}                         │
     ◄──────────────────────────────────────────┤
     │                                           │
     │  [Every 5 seconds]                       │
     │  6. METRICS { cpu, memory, interfaces }  │
     ├──────────────────────────────────────────►
     │                                           │
     │                          Update           │
     │                          Metrics          │
     │                                           │
     │  [Keepalive every 30s]                   │
     │  7. PING {}                              │
     ├──────────────────────────────────────────►
     │                                           │
     │  8. PONG {}                              │
     ◄──────────────────────────────────────────┤
     │                                           │

Test Script
     │
     │  9. HTTP GET /status
     ├──────────────────────────────────────────►
     │                                           │
     │  10. JSON { authenticated, device_id,    │
     │            last_status, last_metrics }   │
     ◄──────────────────────────────────────────┤
     │                                           │
     │  Validate Response                       │
     │  - Check fields present                  │
     │  - Verify data format                    │
     │  - Assert values                         │
     │                                           │
```

## Component Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Component Dependencies                            │
└─────────────────────────────────────────────────────────────────────┘

Cross Compiler (cross-rs)
     │
     ▼
Agent Build (Rust → aarch64-musl)
     │
     ▼
Agent Container (Alpine ARM64)
     │
     ├─► Mock Binaries (nvram, wl, ip, iptables, service)
     ├─► Mock Sysfs (/sys/class/thermal, /sys/class/net)
     └─► Config (/etc/ngfw/config.toml)
     │
     ▼
Docker Network (bridge)
     │
     ├─► Mock API (Bun WebSocket server)
     │   └─► Health Check (/health endpoint)
     │
     ├─► Schema API (Optional, Hono + Wrangler)
     │   └─► Health Check (/health endpoint)
     │
     └─► Portal (Optional, Astro dev server)
         └─► Health Check (/ endpoint)
     │
     ▼
Test Scripts (Shell + curl + jq)
     │
     ├─► Query API (/status endpoint)
     ├─► Check Logs (docker compose logs)
     ├─► Validate Data (grep + jq)
     └─► Generate Report (echo + printf)
     │
     ▼
CI/CD (GitHub Actions)
     │
     ├─► Artifacts (logs, reports)
     ├─► PR Comments (test results)
     └─► Workflow Status (pass/fail)
```

---

## Summary

This architecture provides:

1. **Isolation**: Each component in separate containers
2. **Reproducibility**: Fixed test data and configurations
3. **Speed**: Fast feedback (~60s basic test)
4. **Reliability**: Deterministic results
5. **Observability**: Comprehensive logging and metrics
6. **Scalability**: Easy to add more test scenarios
7. **Maintainability**: Clear structure and documentation

The test environment closely mirrors production while remaining fast and easy to use for development.

---

*Created: 2026-02-09*
