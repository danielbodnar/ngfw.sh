# E2E Test Framework Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         E2E Test Framework                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐           ┌──────────────┐                        │
│  │  CLI Runner  │           │  Nu Runner   │                        │
│  │  (cli.ts)    │           │ (runner.nu)  │                        │
│  └──────┬───────┘           └──────┬───────┘                        │
│         │                          │                                 │
│         └──────────┬───────────────┘                                 │
│                    │                                                  │
│                    ▼                                                  │
│         ┌──────────────────────┐                                     │
│         │    Orchestrator      │                                     │
│         │  (orchestrator.ts)   │                                     │
│         └──────────┬───────────┘                                     │
│                    │                                                  │
│         ┌──────────┼───────────┐                                     │
│         │          │           │                                     │
│         ▼          ▼           ▼                                     │
│  ┌──────────┐ ┌────────┐ ┌─────────┐                                │
│  │  Suites  │ │Fixtures│ │ Reports │                                │
│  │(suites.ts│ │ (.json)│ │(JSON/XML│                                │
│  │   )      │ │        │ │  /HTML) │                                │
│  └──────────┘ └────────┘ └─────────┘                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │      Test Execution Environments         │
        ├──────────────────┬──────────────────────┤
        │                  │                       │
        ▼                  ▼                       ▼
   ┌─────────┐      ┌──────────┐          ┌──────────┐
   │  Docker │      │   QEMU   │          │   Both   │
   │Container│      │    VM    │          │Envs      │
   └────┬────┘      └────┬─────┘          └────┬─────┘
        │                │                     │
        └────────────────┴─────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Mock Infrastructure │
              ├──────────────────────┤
              │ • Mock API Server    │
              │ • Mock Binaries      │
              │ • Mock sysfs         │
              │ • Test Agent         │
              └──────────────────────┘
```

## Component Architecture

### 1. Entry Points

```
┌─────────────────────────────────────────────────────────┐
│                     Entry Points                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  TypeScript CLI (cli.ts)         Nushell Runner         │
│  ┌──────────────────────┐        ┌───────────────┐      │
│  │ • Argument parsing   │        │ • Nu idioms   │      │
│  │ • Help generation    │        │ • Pipelines   │      │
│  │ • Filter management  │        │ • Tables      │      │
│  │ • Suite selection    │        │ • Shortcuts   │      │
│  └──────────┬───────────┘        └───────┬───────┘      │
│             │                             │              │
│             └──────────┬──────────────────┘              │
│                        │                                 │
└────────────────────────┼─────────────────────────────────┘
                         ▼
                  E2EOrchestrator
```

### 2. Orchestrator Core

```
┌──────────────────────────────────────────────────────────┐
│                  E2EOrchestrator                          │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  Configuration                 Execution Context          │
│  ┌──────────────┐             ┌──────────────┐           │
│  │ • parallel   │             │ • suites     │           │
│  │ • maxParallel│             │ • results    │           │
│  │ • failFast   │             │ • fixtures   │           │
│  │ • retries    │             │ • config     │           │
│  │ • timeout    │             │ • startTime  │           │
│  │ • env filter │             │ • endTime    │           │
│  │ • tags       │             └──────────────┘           │
│  └──────────────┘                                         │
│                                                            │
│  Core Methods                                             │
│  ┌─────────────────────────────────────────────┐         │
│  │ registerSuite()  - Register test suite      │         │
│  │ loadSuites()     - Load suite definitions   │         │
│  │ run()            - Execute test plan        │         │
│  │ filterSuites()   - Apply filters            │         │
│  │ buildExecutionPlan() - Resolve dependencies │         │
│  │ executePhase()   - Run test phase           │         │
│  │ executeSuite()   - Run single suite         │         │
│  │ generateReports() - Create reports          │         │
│  └─────────────────────────────────────────────┘         │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### 3. Test Execution Flow

```
┌────────────────────────────────────────────────────────────┐
│                  Test Execution Flow                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Initialization                                          │
│     ┌──────────────────────────────────────┐               │
│     │ • Load configuration                 │               │
│     │ • Register test suites               │               │
│     │ • Apply filters (env, tags)          │               │
│     └──────────────┬───────────────────────┘               │
│                    │                                        │
│  2. Planning       ▼                                        │
│     ┌──────────────────────────────────────┐               │
│     │ • Resolve dependencies               │               │
│     │ • Build execution phases             │               │
│     │ • Detect circular dependencies       │               │
│     └──────────────┬───────────────────────┘               │
│                    │                                        │
│  3. Setup          ▼                                        │
│     ┌──────────────────────────────────────┐               │
│     │ • Load fixtures                      │               │
│     │ • Check prerequisites                │               │
│     │ • Setup test infrastructure          │               │
│     └──────────────┬───────────────────────┘               │
│                    │                                        │
│  4. Execution      ▼                                        │
│     ┌──────────────────────────────────────┐               │
│     │ For each phase:                      │               │
│     │   ┌──────────────────────────────┐   │               │
│     │   │ • Batch tests (if parallel)  │   │               │
│     │   │ • Execute test commands      │   │               │
│     │   │ • Capture output/errors      │   │               │
│     │   │ • Retry on failure           │   │               │
│     │   │ • Run teardown               │   │               │
│     │   └──────────────────────────────┘   │               │
│     │   Check fail-fast ───────┐           │               │
│     │                           │           │               │
│     └───────────────────────────┼───────────┘               │
│                    │            │                           │
│  5. Reporting      ▼            ▼                           │
│     ┌──────────────────────────────────────┐               │
│     │ • Aggregate results                  │               │
│     │ • Generate JSON report               │               │
│     │ • Generate JUnit XML                 │               │
│     │ • Generate HTML report               │               │
│     │ • Print summary                      │               │
│     └──────────────────────────────────────┘               │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### 4. Dependency Resolution

```
┌──────────────────────────────────────────────────────┐
│             Dependency Resolution                     │
├──────────────────────────────────────────────────────┤
│                                                        │
│  Input: Test Suites with Dependencies                │
│  ┌─────────────────────────────────────────┐         │
│  │ Suite A: []                             │         │
│  │ Suite B: [A]                            │         │
│  │ Suite C: [A]                            │         │
│  │ Suite D: [B, C]                         │         │
│  │ Suite E: [D]                            │         │
│  └─────────────────────────────────────────┘         │
│                    │                                  │
│                    ▼                                  │
│  Algorithm: Topological Sort                         │
│  ┌─────────────────────────────────────────┐         │
│  │ 1. Find nodes with no dependencies      │         │
│  │ 2. Add to current phase                 │         │
│  │ 3. Mark as resolved                     │         │
│  │ 4. Repeat until all resolved            │         │
│  │ 5. Error if circular dependency         │         │
│  └─────────────────────────────────────────┘         │
│                    │                                  │
│                    ▼                                  │
│  Output: Execution Phases                            │
│  ┌─────────────────────────────────────────┐         │
│  │ Phase 1: [A]                            │         │
│  │ Phase 2: [B, C]         ← Parallel      │         │
│  │ Phase 3: [D]                            │         │
│  │ Phase 4: [E]                            │         │
│  └─────────────────────────────────────────┘         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 5. Parallel Execution

```
┌────────────────────────────────────────────────────┐
│            Parallel Execution Strategy              │
├────────────────────────────────────────────────────┤
│                                                      │
│  Phase: [Test A, Test B, Test C, Test D, Test E]  │
│  Config: maxParallel = 3                           │
│                                                      │
│  Batching:                                          │
│  ┌────────────────────────────────────────┐        │
│  │ Batch 1: [Test A, Test B, Test C]     │        │
│  │          ────────────────────▶         │        │
│  │          ▲       ▲       ▲             │        │
│  │          │       │       │             │        │
│  │        spawn   spawn   spawn           │        │
│  │                                         │        │
│  │          Wait for all to complete      │        │
│  │                                         │        │
│  │ Batch 2: [Test D, Test E]              │        │
│  │          ──────────────▶                │        │
│  │          ▲       ▲                      │        │
│  │          │       │                      │        │
│  │        spawn   spawn                    │        │
│  │                                         │        │
│  │          Wait for all to complete      │        │
│  └────────────────────────────────────────┘        │
│                                                      │
│  Sequential Mode:                                   │
│  ┌────────────────────────────────────────┐        │
│  │ Test A ──▶ Test B ──▶ Test C ──▶       │        │
│  │ Test D ──▶ Test E                      │        │
│  └────────────────────────────────────────┘        │
│                                                      │
└────────────────────────────────────────────────────┘
```

### 6. Test Suite Structure

```
┌────────────────────────────────────────────────────┐
│              Test Suite Definition                  │
├────────────────────────────────────────────────────┤
│                                                      │
│  interface TestSuite {                             │
│    ┌─────────────────────────────────────┐        │
│    │ id: string                          │        │
│    │   Unique identifier                 │        │
│    │                                      │        │
│    │ name: string                        │        │
│    │   Human-readable name               │        │
│    │                                      │        │
│    │ description: string                 │        │
│    │   What the test does                │        │
│    │                                      │        │
│    │ environment: TestEnvironment        │        │
│    │   docker | qemu | both              │        │
│    │                                      │        │
│    │ timeout: number                     │        │
│    │   Max execution time (ms)           │        │
│    │                                      │        │
│    │ retries: number                     │        │
│    │   Retry count on failure            │        │
│    │                                      │        │
│    │ dependencies: string[]              │        │
│    │   List of prerequisite test IDs     │        │
│    │                                      │        │
│    │ tags: string[]                      │        │
│    │   Categories for filtering          │        │
│    │                                      │        │
│    │ fixtures: string[]                  │        │
│    │   Test data to load                 │        │
│    │                                      │        │
│    │ parallel: boolean                   │        │
│    │   Can run in parallel?              │        │
│    │                                      │        │
│    │ command: string                     │        │
│    │   Shell command to execute          │        │
│    │                                      │        │
│    │ setup?: string                      │        │
│    │   Optional setup command            │        │
│    │                                      │        │
│    │ teardown?: string                   │        │
│    │   Optional teardown command         │        │
│    └─────────────────────────────────────┘        │
│  }                                                  │
│                                                      │
└────────────────────────────────────────────────────┘
```

### 7. Report Generation

```
┌────────────────────────────────────────────────────┐
│              Report Generation                      │
├────────────────────────────────────────────────────┤
│                                                      │
│  Test Results                                       │
│  ┌────────────────────────────────────────┐        │
│  │ • Test ID                              │        │
│  │ • Status (passed/failed/skipped)       │        │
│  │ • Duration                             │        │
│  │ • Timestamps                           │        │
│  │ • Error messages                       │        │
│  │ • Output                               │        │
│  └────────────┬───────────────────────────┘        │
│               │                                     │
│               ├──▶ JSON Report                     │
│               │    ┌──────────────────────┐        │
│               │    │ • Full test details  │        │
│               │    │ • Summary stats      │        │
│               │    │ • Recommendations    │        │
│               │    │ • Timestamps         │        │
│               │    └──────────────────────┘        │
│               │                                     │
│               ├──▶ JUnit XML Report                │
│               │    ┌──────────────────────┐        │
│               │    │ • <testsuites>       │        │
│               │    │ • <testsuite>        │        │
│               │    │ • <testcase>         │        │
│               │    │ • <failure>          │        │
│               │    └──────────────────────┘        │
│               │                                     │
│               └──▶ HTML Report                     │
│                    ┌──────────────────────┐        │
│                    │ • Summary dashboard  │        │
│                    │ • Visual indicators  │        │
│                    │ • Detailed results   │        │
│                    │ • Interactive tables │        │
│                    └──────────────────────┘        │
│                                                      │
└────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    Data Flow                         │
├─────────────────────────────────────────────────────┤
│                                                       │
│  1. User Input                                       │
│     ┌──────────────────────────────┐                │
│     │ CLI Arguments / Nu Commands  │                │
│     └────────────┬─────────────────┘                │
│                  │                                   │
│  2. Configuration                                    │
│                  ▼                                   │
│     ┌──────────────────────────────┐                │
│     │ OrchestratorConfig           │                │
│     │ • environments               │                │
│     │ • tags                       │                │
│     │ • parallel                   │                │
│     │ • timeout                    │                │
│     │ • retries                    │                │
│     └────────────┬─────────────────┘                │
│                  │                                   │
│  3. Test Suites                                      │
│                  ▼                                   │
│     ┌──────────────────────────────┐                │
│     │ Registered Test Suites       │                │
│     │ • 25+ suite definitions      │                │
│     │ • Dependencies               │                │
│     │ • Tags                       │                │
│     └────────────┬─────────────────┘                │
│                  │                                   │
│  4. Fixtures                                         │
│                  ▼                                   │
│     ┌──────────────────────────────┐                │
│     │ Loaded Fixtures              │                │
│     │ • test-credentials.json      │                │
│     │ • invalid-credentials.json   │                │
│     └────────────┬─────────────────┘                │
│                  │                                   │
│  5. Execution                                        │
│                  ▼                                   │
│     ┌──────────────────────────────┐                │
│     │ Test Results                 │                │
│     │ • Per-suite status           │                │
│     │ • Timing data                │                │
│     │ • Error details              │                │
│     └────────────┬─────────────────┘                │
│                  │                                   │
│  6. Reports                                          │
│                  ▼                                   │
│     ┌──────────────────────────────┐                │
│     │ Output Artifacts             │                │
│     │ • JSON (API consumption)     │                │
│     │ • XML (CI/CD integration)    │                │
│     │ • HTML (human review)        │                │
│     │ • Console (immediate)        │                │
│     └──────────────────────────────┘                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## Integration Points

```
┌──────────────────────────────────────────────────┐
│           Integration Architecture                │
├──────────────────────────────────────────────────┤
│                                                    │
│  Package.json Scripts                             │
│  ┌──────────────────────────┐                    │
│  │ test:e2e                 │──┐                 │
│  │ test:e2e:smoke           │  │                 │
│  │ test:e2e:docker          │  │                 │
│  │ test:e2e:qemu            │  │                 │
│  │ test:e2e:prereq          │  │                 │
│  │ test:e2e:perf            │  │                 │
│  │ test:e2e:list            │  │                 │
│  └──────────────────────────┘  │                 │
│                                 │                 │
│  GitHub Actions                 │                 │
│  ┌──────────────────────────┐  │                 │
│  │ Prerequisites Check      │  │                 │
│  │ Smoke Tests (Docker)     │  ├──▶ E2E         │
│  │ Full Tests (Docker)      │  │    Framework   │
│  │ Performance Tests        │  │                 │
│  │ QEMU Tests               │  │                 │
│  │ Report Generation        │  │                 │
│  └──────────────────────────┘  │                 │
│                                 │                 │
│  Existing Infrastructure        │                 │
│  ┌──────────────────────────┐  │                 │
│  │ Docker Compose           │  │                 │
│  │ QEMU VM Builder          │  │                 │
│  │ Mock API Server          │  │                 │
│  │ Mock Binaries            │──┘                 │
│  └──────────────────────────┘                    │
│                                                    │
└──────────────────────────────────────────────────┘
```

## Extension Points

```
┌────────────────────────────────────────────────────┐
│              Extension Points                       │
├────────────────────────────────────────────────────┤
│                                                      │
│  1. New Test Suites                                │
│     ┌──────────────────────────────────┐           │
│     │ Add to suites.ts                 │           │
│     │ • Define suite object            │           │
│     │ • Specify dependencies           │           │
│     │ • Add tags                       │           │
│     │ • Register automatically         │           │
│     └──────────────────────────────────┘           │
│                                                      │
│  2. New Fixtures                                    │
│     ┌──────────────────────────────────┐           │
│     │ Add to fixtures/ directory       │           │
│     │ • JSON format                    │           │
│     │ • Reference in suite             │           │
│     │ • Auto-loaded                    │           │
│     └──────────────────────────────────┘           │
│                                                      │
│  3. Custom Reporters                                │
│     ┌──────────────────────────────────┐           │
│     │ Extend generateReports()         │           │
│     │ • Access test results            │           │
│     │ • Format as needed               │           │
│     │ • Write to file or stream        │           │
│     └──────────────────────────────────┘           │
│                                                      │
│  4. New Environments                                │
│     ┌──────────────────────────────────┐           │
│     │ Add to TestEnvironment type      │           │
│     │ • Update orchestrator            │           │
│     │ • Add environment checks         │           │
│     │ • Update CLI options             │           │
│     └──────────────────────────────────┘           │
│                                                      │
└────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **TypeScript + Nushell Dual Interface**
   - Provides flexibility for different user preferences
   - TypeScript for rich tooling and ecosystem
   - Nushell for data pipelines and structured output

2. **Dependency-Based Execution**
   - Ensures correct test order
   - Enables safe parallelization
   - Prevents flaky tests

3. **Per-Suite Configuration**
   - Different tests have different needs
   - QEMU tests need longer timeouts
   - Network tests may need retries

4. **Multiple Report Formats**
   - JSON for machines
   - XML for CI/CD
   - HTML for humans
   - Console for immediate feedback

5. **Fixture-Based Test Data**
   - No hardcoded credentials
   - Easy to update
   - Supports multiple scenarios

6. **Tag-Based Organization**
   - Flexible filtering
   - Multiple categorizations
   - Easy to find related tests
