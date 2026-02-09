# Nushell Scripts - Critical Fixes Guide

This document provides concrete fixes for the critical issues found in demo-lifecycle.nu.

---

## Fix #1: Wrap external vultr API calls (Line 182)

### Current Code
```nushell
^vultr instance delete $instance.id
```

### Fixed Code
```nushell
try {
    ^vultr instance delete $instance.id
} catch {|err|
    print $"❌ Error deleting instance ($instance.id): ($err.msg)"
    exit 1
}
```

**Why:** Deletion failures should not silently pass. Users need to know if cleanup failed.

---

## Fix #2: Add error handling to check_existing_instance (Line 220)

### Current Code
```nushell
def check_existing_instance [] {
    let instances = (^vultr instance list -o json | from json)
    let existing = ($instances | where label == $INSTANCE_LABEL | first)
    if ($existing | is-empty) {
        return null
    } else {
        return $existing
    }
}
```

### Fixed Code
```nushell
def check_existing_instance [] {
    let instances = (try {
        ^vultr instance list -o json | from json
    } catch {|err|
        print $"❌ Error fetching instances: ($err.msg)"
        exit 1
    })

    let existing = ($instances
        | where label == $INSTANCE_LABEL
        | first -n 1)

    if ($existing | length) == 0 {
        null
    } else {
        $existing
    }
}
```

**Why:** Both external command and JSON parsing need error handling. Removes unreliable `is-empty` check.

---

## Fix #3: Add error handling to create_instance (Lines 230-241)

### Current Code
```nushell
def create_instance [] {
    let output = (^vultr instance create
        --region $REGION
        --plan $PLAN
        --os $OS_ID
        --label $INSTANCE_LABEL
        --host $INSTANCE_LABEL
        --tags "demo,ngfw,testing,automated"
        --ipv6
        -o json
    )
    return ($output | from json)
}
```

### Fixed Code
```nushell
def create_instance [] {
    let output = (try {
        ^vultr instance create
            --region $REGION
            --plan $PLAN
            --os $OS_ID
            --label $INSTANCE_LABEL
            --host $INSTANCE_LABEL
            --tags "demo,ngfw,testing,automated"
            --ipv6
            -o json
    } catch {|err|
        print $"❌ Error creating instance: ($err.msg)"
        exit 1
    })

    try {
        ($output | from json)
    } catch {|err|
        print $"❌ Failed to parse instance creation response: ($err.msg)"
        print $"Raw output: ($output)"
        exit 1
    }
}
```

**Why:** Catch both command failures and JSON parse errors with clear context.

---

## Fix #4: Add error handling to get_instance (Lines 243-246)

### Current Code
```nushell
def get_instance [instance_id: string] {
    let output = (^vultr instance get $instance_id -o json)
    return ($output | from json)
}
```

### Fixed Code
```nushell
def get_instance [instance_id: string] {
    let output = (try {
        ^vultr instance get $instance_id -o json
    } catch {|err|
        print $"❌ Error fetching instance ($instance_id): ($err.msg)"
        exit 1
    })

    try {
        ($output | from json)
    } catch {|err|
        print $"❌ Failed to parse instance data: ($err.msg)"
        exit 1
    }
}
```

**Why:** Consistent error handling across all API calls.

---

## Fix #5: Replace loop pattern with while (Lines 248-264)

### Current Code
```nushell
def wait_for_active [instance_id: string] {
    mut retries = 0
    loop {
        let instance = (get_instance $instance_id)
        if $instance.status == "active" and $instance.main_ip != "0.0.0.0" {
            break
        }

        $retries = $retries + 1
        if $retries > 60 {
            print "❌ Timeout waiting for instance to be active"
            exit 1
        }

        sleep 5sec
    }
}
```

### Fixed Code
```nushell
def wait_for_active [instance_id: string] {
    mut retries = 0
    while {$retries < 60} {
        let instance = (get_instance $instance_id)
        if $instance.status == "active" and $instance.main_ip != "0.0.0.0" {
            return
        }

        $retries += 1
        sleep 5sec
    }

    print "❌ Timeout waiting for instance to be active (60 attempts)"
    exit 1
}
```

**Why:** `while` is more idiomatic for Nushell; clearer intent.

---

## Fix #6: Add error handling to wait_for_ssh (Lines 266-281)

### Current Code
```nushell
def wait_for_ssh [ip: string] {
    mut retries = 0
    loop {
        try {
            ^ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$ip "echo 'SSH ready'" o+e>| ignore
            break
        } catch {
            $retries = $retries + 1
            if $retries > 60 {
                print "❌ Timeout waiting for SSH"
                exit 1
            }
            sleep 5sec
        }
    }
}
```

### Fixed Code (mostly good, minor improvements)
```nushell
def wait_for_ssh [ip: string] {
    mut retries = 0
    while {$retries < 60} {
        if (try {
            ^ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$ip "echo SSH ready" o+e>| null
            true
        } catch {
            false
        }) {
            return
        }

        $retries += 1
        sleep 5sec
    }

    print $"❌ Timeout waiting for SSH to ($ip) after 60 attempts"
    exit 1
}
```

**Why:** Use `while` for consistency; better null handling; clearer success/failure logic.

---

## Fix #7: Remove Bash-isms from deploy_container SSH (Lines 285-290)

### Current Code (PROBLEMATIC)
```nushell
^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "
    apt update -qq &&
    apt install -y -qq docker.io docker-compose &&
    systemctl enable docker &&
    systemctl start docker
"
```

### Fixed Code (Option A: Let remote shell handle it)
```nushell
try {
    ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip bash -s <<'REMOTE_SCRIPT'
set -e
apt update -qq
apt install -y -qq docker.io docker-compose
systemctl enable docker
systemctl start docker
REMOTE_SCRIPT
} catch {|err|
    print $"❌ Error setting up Docker: ($err.msg)"
    exit 1
}
```

### Fixed Code (Option B: Create remote script first)
```nushell
let setup_script = @"
#!/bin/bash
set -e
apt update -qq
apt install -y -qq docker.io docker-compose
systemctl enable docker
systemctl start docker
"@

try {
    # Upload script
    $setup_script | ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "cat > /tmp/setup-docker.sh && chmod +x /tmp/setup-docker.sh && /tmp/setup-docker.sh"
} catch {|err|
    print $"❌ Error setting up Docker: ($err.msg)"
    exit 1
}
```

**Why:** Bash-isms embedded in remote commands should be wrapped with Nushell error handling, not silently swallowed.

---

## Fix #8: Safe file upload for config (Line 316)

### Current Code (PROBLEMATIC)
```nushell
echo $config | ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "cat > /etc/ngfw/config.toml"
```

### Fixed Code
```nushell
try {
    $config | ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "cat > /etc/ngfw/config.toml"
} catch {|err|
    print $"❌ Error uploading config: ($err.msg)"
    exit 1
}
```

**Why:** Remove `echo` (external command); add error handling; `print` already outputs strings.

---

## Fix #9: Safe container verification (Line 329)

### Current Code (NO ERROR HANDLER)
```nushell
def verify_deployment [instance: record] {
    let container_status = (^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "docker ps --filter name=ngfw-agent --format '{{.Status}}'")

    if ($container_status | str contains "Up") {
        return true
    } else {
        print "❌ Container not running"
        exit 1
    }
}
```

### Fixed Code
```nushell
def verify_deployment [instance: record] {
    let container_status = (try {
        ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "docker ps --filter name=ngfw-agent --format '{{.Status}}'"
    } catch {|err|
        print $"❌ Error checking container status: ($err.msg)"
        exit 1
    })

    if ($container_status =~ Up) {
        true
    } else {
        print "❌ Container not running"
        exit 1
    }
}
```

**Why:** Add error handler; use `=~` operator instead of `str contains` for clarity; explicit return values.

---

## Fix #10: Safe test functions (Lines 339-365)

### Current Code (No handlers)
```nushell
def test_ssh [ip: string] -> bool {
    try {
        ^ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$ip "echo 'test'" o+e>| ignore
        return true
    } catch {
        return false
    }
}
```

### Fixed Code
```nushell
def test_ssh [ip: string] -> bool {
    try {
        ^ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$ip "echo test" o+e>| ignore
        true
    } catch {
        false
    }
}
```

**Why:** Simplify; remove quotes inside SSH command; consistent error handling.

---

## Summary of Changes

| Fix | Type | Difficulty | Files |
|-----|------|-----------|-------|
| Error handling on vultr delete | Error Handler | Easy | demo-lifecycle.nu:182 |
| Error handling on API calls | Error Handler | Medium | demo-lifecycle.nu:220, 230, 244 |
| Replace loop with while | Code Quality | Easy | demo-lifecycle.nu:250, 268 |
| Remove SSH bash-isms | Anti-pattern | Hard | demo-lifecycle.nu:286, 319 |
| Safe file operations | Best Practice | Easy | demo-lifecycle.nu:316 |
| Improve test functions | Best Practice | Easy | demo-lifecycle.nu:339-365 |

---

## Implementation Order

1. **Phase 1 (Easy - 30 minutes):**
   - Fix #1: Add error handler to vultr delete
   - Fix #8: Remove echo, add error handler to config upload
   - Fix #10: Simplify test functions

2. **Phase 2 (Medium - 1 hour):**
   - Fix #2: Add error handling to check_existing_instance
   - Fix #3: Add error handling to create_instance
   - Fix #4: Add error handling to get_instance

3. **Phase 3 (Medium - 45 minutes):**
   - Fix #5: Replace loop with while in wait_for_active
   - Fix #6: Improve wait_for_ssh with while
   - Fix #9: Add error handler to verify_deployment

4. **Phase 4 (Hard - 1 hour):**
   - Fix #7: Refactor deploy_container to handle Bash-isms properly

---

## Validation After Fixes

Run syntax check:
```nushell
nu --ide-check /workspaces/code/github.com/danielbodnar/ngfw.sh/scripts/demo-lifecycle.nu
```

Run linter:
```nushell
nu --lsp /workspaces/code/github.com/danielbodnar/ngfw.sh
```

Test functionality:
```nushell
nu /workspaces/code/github.com/danielbodnar/ngfw.sh/scripts/demo-lifecycle.nu status
```
