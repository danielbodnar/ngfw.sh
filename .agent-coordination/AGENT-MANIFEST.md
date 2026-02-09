# Agent Ecosystem Manifest

**Created:** 2026-02-09
**Status:** Active
**Total Agents:** 17

## Agent Categories

### Code Quality & Review (4 agents)
1. **code-review-quality** (opus) - Comprehensive code review and quality control
2. **code-review-compiler** (opus) - Aggregates findings into final reports
3. **integration-coordinator** (opus) - Orchestrates multi-agent workflows
4. **semantic-release-manager** (sonnet) - Version control and release management

### Testing Specialists (3 agents)
5. **playwright-test-runner** (haiku) - E2E UI testing with Playwright
6. **vitest-runner** (haiku) - Unit/integration testing for TypeScript/JavaScript
7. **rust-test-runner** (haiku) - Cargo test execution and analysis

### Linters & Formatters (4 agents)
8. **oxlint-analyzer** (haiku) - JavaScript/TypeScript linting
9. **biome-formatter** (haiku) - All-in-one formatting and linting
10. **rust-clippy-analyzer** (haiku) - Rust idiomatic code analysis
11. **nushell-validator** (haiku) - Nushell script validation

### Static Analysis (2 agents)
12. **typescript-type-checker** (haiku) - TypeScript strict mode validation
13. **dependency-auditor** (haiku) - Security and dependency auditing

### Domain Specialists (4 agents)
14. **portal-test-specialist** (sonnet) - React portal testing
15. **portal-astro-specialist** (sonnet) - Astro portal testing
16. **agent-test-specialist** (sonnet) - Rust agent testing
17. **shell-script-reviewer** (sonnet) - Shell script analysis

## Agent Model Distribution

- **Opus (3):** High-level coordination and comprehensive review
- **Sonnet (5):** Domain expertise and complex analysis
- **Haiku (9):** Fast execution of focused tasks

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Integration Coordinator (Orchestration)             │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
   Testing          Linting        Analysis
   ┌──┴──┐         ┌──┴──┐         ┌──┴──┐
   │     │         │     │         │     │
Playw Vit Rust  Oxlint Biome   TypeChk DepAud
right est est   Clippy NuVal
       │               │               │
       └───────────────┼───────────────┘
                       │
               Domain Specialists
              ┌────────┼────────┐
              │        │        │
           Portal  Astro   Agent/Shell
                       │
               Code Review Compiler
```

## Task Delegation Strategy

### Parallel Execution Groups

**Group 1 - Testing (can run in parallel)**
- playwright-test-runner → Tasks #19, #20
- portal-test-specialist → Tasks #11, #21
- portal-astro-specialist → Tasks #10, #22
- agent-test-specialist → Task #9 (in progress)
- shell-script-reviewer → Task #12

**Group 2 - Code Quality (can run in parallel)**
- oxlint-analyzer → Scan all TS/JS files
- biome-formatter → Format all applicable files
- rust-clippy-analyzer → Analyze all Rust packages
- nushell-validator → Validate all .nu scripts
- typescript-type-checker → Type check all TS projects

**Group 3 - Security & Dependencies (can run in parallel)**
- dependency-auditor → Audit npm and cargo dependencies

**Group 4 - Aggregation (runs after Groups 1-3)**
- code-review-compiler → Task #13 (compile final report)
- code-review-quality → Final quality gate review

**Group 5 - Release Management (final stage)**
- semantic-release-manager → Version and changelog management

## Execution Status

- [x] Agents provisioned in `.claude/agents/`
- [ ] Group 1 - Testing agents deployed
- [ ] Group 2 - Code quality agents deployed
- [ ] Group 3 - Security agents deployed
- [ ] Group 4 - Aggregation complete
- [ ] Group 5 - Release preparation

## Agent Files

All agent definitions located in `.claude/agents/*.md`

```bash
ls .claude/agents/
# agent-test-specialist.md
# biome-formatter.md
# code-review-compiler.md
# code-review-quality.md
# dependency-auditor.md
# integration-coordinator.md
# nushell-validator.md
# oxlint-analyzer.md
# playwright-test-runner.md
# portal-astro-specialist.md
# portal-test-specialist.md
# rust-clippy-analyzer.md
# rust-test-runner.md
# semantic-release-manager.md
# shell-script-reviewer.md
# typescript-type-checker.md
# vitest-runner.md
```

## Communication Protocol

Agents report results to `.agent-coordination/` directory:
- `{agent-name}-{timestamp}.md` for individual reports
- `status/` directory for ongoing status updates
- `FINAL-STATUS-REPORT.md` for completion summary
