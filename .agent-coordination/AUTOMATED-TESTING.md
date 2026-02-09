# NGFW Demo Router - Automated Testing

**100% Automated** - No human intervention required

---

## 🎯 Overview

Complete **kitchen-sync** testing lifecycle:
1. **Setup** - Provision Vultr instance + deploy container
2. **Test** - Run full test suite against live demo
3. **Teardown** - Destroy instance and cleanup

---

## 🚀 Quick Start

### Local Testing

```bash
# Full lifecycle (setup → test → teardown)
nu scripts/demo-lifecycle.nu full

# Individual stages
nu scripts/demo-lifecycle.nu setup      # Create demo
nu scripts/demo-lifecycle.nu test       # Test demo
nu scripts/demo-lifecycle.nu teardown   # Destroy demo
nu scripts/demo-lifecycle.nu status     # Check status
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/demo-test.yml
# Runs automatically on:
# - Every PR to main
# - Nightly at 2 AM UTC
# - Manual workflow dispatch
```

---

## 📋 Test Stages

### Stage 1: Setup (5-10 minutes)

**What it does:**
1. Create Vultr instance (vc2-1c-1gb, Ubuntu 22.04)
2. Wait for instance to be active
3. Wait for SSH to be ready
4. Install Docker
5. Deploy NGFW agent container
6. Save instance state to `.demo-state.json`

**Success criteria:**
- Instance created with IP address
- SSH connection established
- Docker installed and running
- Container deployed and running

### Stage 2: Test (2-3 minutes)

**Test Suite:**

#### Test 1: SSH Connectivity ✅
```bash
ssh root@<instance-ip> "echo 'test'"
```

#### Test 2: Container Status ✅
```bash
docker ps --filter name=ngfw-agent
# Expected: Status "Up"
```

#### Test 3: Agent Health ✅
```bash
docker logs ngfw-agent --tail 50
# Expected: Agent started successfully
```

#### Test 4: API Connectivity ⚠️
```bash
# Test WebSocket connection (if configured)
# Expected: Connection successful or not configured
```

### Stage 3: Teardown (1 minute)

**What it does:**
1. Read instance state from `.demo-state.json`
2. Delete Vultr instance
3. Remove state file
4. Cleanup complete

---

## 🔧 Configuration

### Environment Variables

```bash
# Required for automated deployment
export VULTR_API_KEY="your-api-key"

# Optional overrides
export NGFW_REGION="ewr"           # Default: ewr (New Jersey)
export NGFW_PLAN="vc2-1c-1gb"      # Default: 1 CPU, 1GB RAM
export NGFW_OS_ID="1743"           # Default: Ubuntu 22.04
```

### State Management

```json
// .demo-state.json (auto-generated)
{
  "id": "<INSTANCE_ID>",
  "main_ip": "<PUBLIC_IP>",
  "status": "active",
  "label": "ngfw-demo-router",
  "date_created": "2026-02-09T19:02:48+00:00",
  "password": "..."
}
```

---

## 🎪 Usage Examples

### Example 1: Quick Test

```bash
# Run full lifecycle
nu scripts/demo-lifecycle.nu full

# Output:
# 🎬 Starting full demo lifecycle
# 🚀 Setting up demo router
# 📦 Creating Vultr instance...
# ✅ Instance created: <PUBLIC_IP>
# 🐳 Deploying NGFW agent container...
# ✅ Demo router setup complete!
#
# 🧪 Testing demo router
# ✅ SSH connection successful
# ✅ Container is running
# ✅ Agent is healthy
#
# 🎉 Lifecycle completed successfully!
```

### Example 2: Persistent Demo

```bash
# Setup and keep running
nu scripts/demo-lifecycle.nu setup

# Test multiple times
nu scripts/demo-lifecycle.nu test
nu scripts/demo-lifecycle.nu test

# Destroy when done
nu scripts/demo-lifecycle.nu teardown
```

### Example 3: CI/CD Integration

```yaml
# GitHub Actions
- name: E2E Test
  run: nu scripts/demo-lifecycle.nu full
  env:
    VULTR_API_KEY: ${{ secrets.VULTR_API_KEY }}
```

---

## 🐛 Troubleshooting

### Issue: Instance already exists

```bash
# Error: Instance already exists: 89e10c79...
# Solution: Teardown first
nu scripts/demo-lifecycle.nu teardown
nu scripts/demo-lifecycle.nu setup
```

### Issue: SSH timeout

```bash
# Error: Timeout waiting for SSH
# Cause: Instance not fully booted or network issue
# Solution: Check Vultr dashboard, verify instance is running
vultr instance list
vultr instance get <instance-id>
```

### Issue: Container not starting

```bash
# Check instance logs
nu scripts/demo-lifecycle.nu status

# SSH into instance
ssh root@<instance-ip>
docker logs ngfw-agent
docker ps -a
```

### Issue: Test failures

```bash
# Run tests with verbose output
nu scripts/demo-lifecycle.nu test

# Check specific test
ssh root@<instance-ip> "docker logs ngfw-agent --tail 100"
```

---

## 📊 Performance Metrics

| Stage | Duration | Cost |
|-------|----------|------|
| Setup | 5-10 min | $0.00 |
| Test | 2-3 min | $0.00 |
| Teardown | 1 min | $0.00 |
| **Total** | **8-14 min** | **$0.00** |

**Note:** Vultr charges hourly (~$0.007/hour), so full lifecycle costs < $0.01

---

## 🔄 Integration with Test Kitchen

### Kitchen-Sync Style Testing

The lifecycle script mimics Test Kitchen's workflow:

```ruby
# Conceptual mapping to Test Kitchen
kitchen create   → nu demo-lifecycle.nu setup
kitchen converge → (included in setup)
kitchen verify   → nu demo-lifecycle.nu test
kitchen destroy  → nu demo-lifecycle.nu teardown
kitchen test     → nu demo-lifecycle.nu full
```

### Future: Multi-Platform Testing

```bash
# Test on multiple platforms
nu scripts/demo-lifecycle.nu full --platform vultr
nu scripts/demo-lifecycle.nu full --platform aws
nu scripts/demo-lifecycle.nu full --platform gcp
nu scripts/demo-lifecycle.nu full --platform docker
nu scripts/demo-lifecycle.nu full --platform qemu
```

---

## 🎯 Success Criteria

### ✅ Setup Success
- [ ] Instance created on Vultr
- [ ] SSH connection established
- [ ] Docker installed
- [ ] Container running
- [ ] State file saved

### ✅ Test Success
- [ ] SSH connectivity working
- [ ] Container status "Up"
- [ ] Agent logs show startup
- [ ] No error messages in logs

### ✅ Teardown Success
- [ ] Instance deleted from Vultr
- [ ] State file removed
- [ ] No resources left behind

---

## 📚 Related Documentation

- [Container Deployment Strategy](./CONTAINER-DEPLOYMENT-STRATEGY.md)
- [Vultr Instance Details](./VULTR-INSTANCE-DETAILS.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)

---

## 🔗 CI/CD Workflow

```
┌─────────────────────────────────────────┐
│ GitHub Actions Trigger                  │
│ (PR, Schedule, Manual)                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Setup: Install Nushell + Vultr CLI      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Execute: nu demo-lifecycle.nu full      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 1. Setup    (5-10 min)              │ │
│ │    - Create instance                │ │
│ │    - Deploy container               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 2. Test     (2-3 min)               │ │
│ │    - SSH connectivity               │ │
│ │    - Container status               │ │
│ │    - Agent health                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 3. Teardown (1 min)                 │ │
│ │    - Delete instance                │ │
│ │    - Cleanup state                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Report Results                          │
│ ✅ All tests passed                     │
│ ❌ Tests failed (with logs)             │
└─────────────────────────────────────────┘
```

---

**Last Updated:** 2026-02-09
**Status:** Ready for testing
**Automation Level:** 100%
