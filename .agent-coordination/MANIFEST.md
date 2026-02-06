# Agent Coordination Manifest

This directory coordinates parallel agent work on the NGFW.sh Astro + Vue migration.

## Agent Team Structure

### Backend API Agents (8 agents)
- **routing-api**: Implements `/routing` endpoints (static routes, policy routes)
- **nat-api**: Implements `/nat` endpoints (port forwarding, NAT rules, UPnP)
- **ips-api**: Implements `/ips` endpoints (IPS config, rules, alerts, categories)
- **vpn-server-api**: Implements `/vpn/server` endpoints (config, peers)
- **vpn-client-api**: Implements `/vpn/client` endpoints (profiles, connect/disconnect)
- **qos-api**: Implements `/qos` endpoints (traffic shaping rules)
- **ddns-api**: Implements `/ddns` endpoints (provider config, force update)
- **monitoring-api**: Implements `/reports`, `/logs`, `/onboarding`, `/dashboards` endpoints

### Frontend Astro+Vue Agents (8 agents)
- **astro-setup**: Initializes Astro project, configures Clerk, creates base layouts
- **vue-components**: Creates UI component library (Button, Card, Table, etc.)
- **vue-composables**: Creates API composables (useApi, useAuth, useDevices, etc.)
- **network-pages**: Creates network pages (routing, NAT, WAN, LAN, WiFi, DHCP)
- **security-pages**: Creates security pages (IPS, firewall, traffic, DNS filter)
- **services-pages**: Creates services pages (VPN server/client, QoS, DDNS)
- **monitoring-pages**: Creates monitoring pages (dashboards, reports, logs)
- **onboarding-flow**: Creates onboarding wizard with router selection

### Quality Control Agents (3 agents)
- **code-reviewer**: Reviews all code for quality, patterns, consistency
- **linter**: Runs oxlint, TypeScript compiler, fixes issues
- **integration-coordinator**: Ensures all pieces integrate correctly, updates index.ts, tests API

## Coordination Rules

1. **File Ownership**: Each agent owns its assigned files - no conflicts
2. **Shared Resources**:
   - `packages/schema/src/index.ts` - integration-coordinator updates
   - `packages/portal-astro/src/routes/` - integration-coordinator assembles
3. **Status Reporting**: Agents update `status/<agent-name>.json` when complete
4. **Dependencies**:
   - Frontend agents wait for `astro-setup` to complete
   - Code review runs after all implementation agents complete
   - Linter runs after code review
   - Integration coordinator runs last

## Router Options (for onboarding-api and onboarding-flow)

Research completed - 4 routers:
1. **ASUS RT-AX92U** - Merlin NG firmware, WiFi 6, AX6100 tri-band
2. **GL.iNet Flint 2 (GL-MT6000)** - OpenWrt native, WiFi 6, quad-core
3. **Linksys WRT3200ACM** - OpenWrt champion, dual-core 1.8GHz
4. **GL.iNet Flint 3** - WiFi 7, OpenWrt, WireGuard/Tailscale, 5x 2.5Gb ports

## File Structure Conventions

### Backend (packages/schema/)
```
src/endpoints/<feature>/
  base.ts           # Zod schemas
  router.ts         # Hono router registration
  <feature>List.ts  # GET endpoint
  <feature>Create.ts # POST endpoint
  <feature>Update.ts # PUT endpoint
  <feature>Delete.ts # DELETE endpoint
```

### Frontend (packages/portal-astro/)
```
src/
  pages/<feature>/  # Astro pages
  components/       # Vue components
  composables/      # Vue composables
  layouts/          # Astro layouts
  middleware/       # Clerk auth
```

## Success Criteria

- All API endpoints return valid OpenAPI 3.1 schemas
- All pages accessible via direct URL (no hash routing)
- Clerk authentication works throughout
- Code passes oxlint with zero errors
- TypeScript compiles with zero errors
- All components follow Tailwind CSS 4 patterns
- Mock data provided where backend not implemented
