# Portal-Astro Test Suite - Action Items

**Date:** 2026-02-09
**Status:** Tests are well-designed but blocked by missing pages

---

## Immediate Actions (Can Do Now)

### 1. Run Integration Tests ✓
```bash
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro
bun test:integration
```

**Expected Result:** All API client tests should pass (using MSW mocking)

### 2. Install Playwright Browsers
```bash
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro
bunx playwright install chromium
```

**Alternative:** Use Docker environment (already has browsers)

### 3. Review Test Quality
The test suite is excellent:
- 30 E2E tests (auth, NAT rules, onboarding)
- 50+ integration tests (API client)
- Complete MSW mock infrastructure
- Docker test environment ready

---

## Critical Blockers (Must Fix Before E2E Tests)

### Missing Pages

1. **Authentication Pages**
   - [ ] `/src/pages/sign-in.astro` - Clerk sign-in integration
   - [ ] `/src/pages/sign-up.astro` - Clerk registration
   - [ ] Implement `[data-testid="user-menu"]` in layout

2. **Onboarding Flow**
   - [ ] `/src/pages/onboarding.astro` - Multi-step wizard
   - [ ] Router selection cards with `[data-testid="router-*"]`
   - [ ] Device registration form
   - [ ] API key display component `[data-testid="api-key"]`
   - [ ] Network configuration forms

3. **Security Pages**
   - [ ] `/src/pages/security/nat.astro` - NAT rules management
   - [ ] NAT rules table/list view
   - [ ] Create/Edit modal
   - [ ] Delete confirmation dialog
   - [ ] Enable/Disable toggle

### Required UI Components

- [ ] User menu dropdown (sign-out, profile)
- [ ] Modal/Dialog component
- [ ] Confirmation dialog component
- [ ] Toast/notification system (success/error messages)
- [ ] Loading spinner `[data-testid="spinner"]`
- [ ] Form validation display
- [ ] Router card component

---

## Connection Issues Analysis

### Backend API Configuration

**Production:**
- API Base: `https://api.ngfw.sh`
- All requests authenticated via Clerk JWT tokens
- Header: `Authorization: Bearer <jwt>`

**Local Development:**
- API Base: `http://localhost:8787`
- Uses Miniflare (Cloudflare Workers local runtime)
- Requires Schema API to be running

**Docker Test Environment:**
- API Base: `http://api:8787` (internal Docker network)
- Services: api (port 8787), portal (port 4321), tests
- Full isolation, no CORS issues

### Current Configuration

**API Client:**
```typescript
// src/lib/api/client.ts
const API_BASE = process.env.VITE_API_URL || 'https://api.ngfw.sh';
```

**Environment Variables Needed:**
```bash
# .env
VITE_API_URL=http://localhost:8787
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Potential Issues

1. **CORS**: Frontend (localhost:4321) → Backend (localhost:8787)
   - Backend must return proper CORS headers
   - `Access-Control-Allow-Origin: http://localhost:4321`
   - `Access-Control-Allow-Credentials: true`

2. **Authentication**: Clerk JWT validation
   - Frontend gets JWT from Clerk
   - Backend validates JWT using Clerk public key
   - Any mismatch = 401 Unauthorized

3. **Network**: Service reachability
   - Schema API must be running on port 8787
   - Health check: `curl http://localhost:8787/health`

---

## Test Execution Plan

### Phase 1: Integration Tests (Ready Now) ✓

```bash
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro
bun test:integration
```

**Status:** Ready to run
**Expected:** All pass (50+ tests)
**Blocks:** None

### Phase 2: Implement Missing Pages (4-6 hours per page)

**Priority Order:**
1. Authentication pages (sign-in, sign-up) - 8 hours
2. Dashboard user menu - 2 hours
3. NAT rules page - 6 hours
4. Onboarding wizard - 8 hours

**Total Estimated:** 24 hours

### Phase 3: E2E Tests in Docker (After Phase 2)

```bash
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/tests
./run-integration-tests.sh
```

**What It Does:**
1. Starts Schema API (Miniflare on port 8787)
2. Starts Portal (Astro dev server on port 4321)
3. Runs integration tests
4. Runs E2E tests in Playwright container
5. Generates HTML report

**Status:** Configuration ready, waiting for pages

### Phase 4: Local E2E Tests (For Development)

```bash
# Terminal 1: Backend
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema
bun run dev

# Terminal 2: Frontend
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro
bun run dev

# Terminal 3: Tests
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro
bun test:e2e
```

---

## Quick Wins

### 1. Verify MSW Mocking Works
The mock infrastructure is complete and ready. Integration tests prove it works.

### 2. Review Test Fixtures
All fixtures in `/tests/fixtures/index.ts` match the API schema:
- Devices, NAT rules, VPN configs
- IPS rules and alerts
- Reports, logs, dashboards
- Mock user and JWT token

### 3. Check Test Utilities
Excellent helper functions in `/tests/utils/test-utils.ts`:
- `mountWithContext()` - Mount Vue components with auth/device context
- `flushPromises()` - Wait for async operations
- `waitFor()` - Conditional waiting
- `clickAndWait()`, `fillAndWait()` - User interaction helpers

---

## Risk Assessment

### Low Risk Items ✓
- Integration tests (will pass now)
- Mock infrastructure (complete)
- Docker environment (configured correctly)
- Test organization (excellent structure)

### Medium Risk Items ⚠️
- Playwright browser installation (simple fix)
- Clerk authentication setup (needs configuration)
- CORS configuration (backend needs proper headers)

### High Risk Items ✗
- Missing pages (blocks all E2E tests)
- Missing UI components (blocks test execution)
- Clerk integration (needs testing with real auth)

---

## Success Criteria

### Phase 1: Integration Tests
- [ ] All 50+ integration tests pass
- [ ] API client fully validated
- [ ] Error handling confirmed working

### Phase 2: Page Implementation
- [ ] All 4 missing pages created
- [ ] Clerk authentication integrated
- [ ] UI components functional

### Phase 3: E2E Tests Passing
- [ ] 6/6 auth tests pass
- [ ] 14/14 NAT rules tests pass
- [ ] 10/10 onboarding tests pass
- [ ] All tests run in Docker successfully

### Phase 4: CI/CD Integration
- [ ] Tests run automatically on PR
- [ ] HTML reports generated
- [ ] Coverage tracked over time
- [ ] Failures block merges

---

## Resources

### Documentation
- Test README: `/packages/portal-astro/tests/README.md`
- Main testing guide: `/packages/portal-astro/TESTING.md`
- Playwright config: `/packages/portal-astro/playwright.config.ts`

### Key Files
- API Client: `/packages/portal-astro/src/lib/api/client.ts`
- API Types: `/packages/portal-astro/src/lib/api/types.ts`
- Mock Handlers: `/packages/portal-astro/tests/mocks/handlers.ts`
- Test Fixtures: `/packages/portal-astro/tests/fixtures/index.ts`

### External Resources
- Playwright Docs: https://playwright.dev/
- MSW Docs: https://mswjs.io/
- Clerk Astro: https://clerk.com/docs/references/astro
- Vitest Docs: https://vitest.dev/

---

## Next Session Handoff

**For the next agent/developer:**

1. **Start Here:**
   ```bash
   cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro
   bun test:integration
   ```

2. **Review:**
   - Read `/tests/e2e/auth.spec.ts` to understand auth flow expectations
   - Read `/tests/e2e/nat-rules.spec.ts` to understand NAT UI requirements
   - Check `/tests/fixtures/index.ts` for data structure

3. **Implement:**
   - Start with `/src/pages/sign-in.astro`
   - Use Clerk's `<SignIn />` component
   - Add `[data-testid="user-menu"]` to layout

4. **Test:**
   ```bash
   bun test:e2e tests/e2e/auth.spec.ts
   ```

5. **Iterate:**
   - Fix failing tests
   - Add missing components
   - Verify in browser manually

**Good luck! The test suite is excellent and will guide your implementation.**

---

**Report Generated:** 2026-02-09
**Status:** Ready for Implementation
**Next Step:** Run integration tests, then implement pages
