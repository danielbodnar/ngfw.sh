#!/usr/bin/env nu

# NGFW Demo Router - Full Lifecycle Automation
# Supports setup, test, and teardown stages for kitchen-sync testing
#
# Usage:
#   nu demo-lifecycle.nu setup     # Provision and configure demo router
#   nu demo-lifecycle.nu test      # Run full test suite against demo
#   nu demo-lifecycle.nu teardown  # Destroy demo router
#   nu demo-lifecycle.nu full      # Run complete lifecycle (setup → test → teardown)

const INSTANCE_LABEL = "ngfw-demo-router"
const REGION = "ewr"
const PLAN = "vc2-1c-1gb"
const OS_ID = 1743  # Ubuntu 22.04 x64
const STATE_FILE = ".demo-state.json"

# Main entry point
def main [command: string] {
    match $command {
        "setup" => { setup }
        "test" => { test_demo }
        "teardown" => { teardown }
        "full" => { full_lifecycle }
        "status" => { status }
        _ => {
            print -e $"Unknown command: ($command)"
            print -e "Usage: nu demo-lifecycle.nu {setup|test|teardown|full|status}"
            error make { msg: $"Unknown command: ($command)" }
        }
    }
}

# Full lifecycle: setup → test → teardown
def full_lifecycle [] {
    print "🎬 Starting full demo lifecycle"
    print ================================

    try {
        setup
        print "\n⏳ Waiting 30 seconds for system to stabilize..."
        sleep 30sec

        test_demo

        print "
🎉 Lifecycle completed successfully!
Keeping instance running for inspection.
Run 'nu demo-lifecycle.nu teardown' to cleanup."
    } catch {|err|
        print -e $"❌ Lifecycle failed: ($err)"
        print -e "⚠️ Instance may still be running. Check with 'status' command."
        error make { msg: $"Lifecycle failed: ($err)" }
    }
}

# Setup: Provision and configure demo router
def setup [] {
    print "🚀 Setting up demo router"
    print =========================

    # Check if instance already exists
    let existing = (check_existing_instance)
    if $existing != null {
        error make {
            msg: $"Instance already exists: ($existing.id)\n   IP: ($existing.main_ip)\n   Status: ($existing.status)\n\nOptions:\n  1. Run 'nu demo-lifecycle.nu teardown' to remove existing\n  2. Run 'nu demo-lifecycle.nu test' to test existing"
        }
    }

    # Create Vultr instance
    print "📦 Creating Vultr instance..."
    let instance = (create_instance)

    # Save state
    save_state $instance

    # Wait for instance to be active
    print "⏳ Waiting for instance to be active..."
    wait_for_active $instance.id

    # Get updated instance info (with IP)
    let instance = (get_instance $instance.id)
    save_state $instance

    print $"✅ Instance created: ($instance.main_ip)"

    # Wait for SSH to be ready
    print "⏳ Waiting for SSH to be ready..."
    wait_for_ssh $instance.main_ip

    # Deploy container
    print "🐳 Deploying NGFW agent container..."
    deploy_container $instance

    # Verify deployment
    print "✅ Verifying deployment..."
    verify_deployment $instance

    print $"
🎉 Demo router setup complete!
   Instance ID: ($instance.id)
   IP Address: ($instance.main_ip)
   Container: Running

Next: Run 'nu demo-lifecycle.nu test' to test"
}


# Test: Run full test suite against demo
def test_demo [] {
    print "🧪 Testing demo router"
    print ======================

    let state = (load_state)
    if $state == null {
        print -e "❌ No demo instance found. Run 'setup' first."
        error make { msg: "No demo instance found. Run 'setup' first." }
    }

    let instance = $state
    print $"Testing instance: ($instance.main_ip)"

    # Test 1: SSH connectivity
    print "\n📡 Test 1: SSH connectivity"
    if (test_ssh $instance.main_ip) {
        print "✅ SSH connection successful"
    } else {
        print -e "❌ SSH connection failed"
        error make { msg: "SSH connection failed" }
    }

    # Test 2: Container running
    print "\n🐳 Test 2: Container status"
    if (test_container $instance) {
        print "✅ Container is running"
    } else {
        print -e "❌ Container is not running"
        error make { msg: "Container is not running" }
    }

    # Test 3: Agent health
    print "\n💚 Test 3: Agent health check"
    if (test_agent_health $instance) {
        print "✅ Agent is healthy"
    } else {
        print -e "❌ Agent health check failed"
        error make { msg: "Agent health check failed" }
    }

    # Test 4: WebSocket connection (if configured)
    print "\n🔌 Test 4: API connectivity"
    let ws_test = (test_websocket_connection $instance)
    if $ws_test {
        print "✅ WebSocket connection successful"
    } else {
        print "⚠️ WebSocket connection not configured (expected)"
    }

    print "\n🎉 All tests passed!"
}

# Teardown: Destroy demo router
def teardown [] {
    print "🗑️ Tearing down demo router"
    print ============================

    let state = (load_state)
    if $state == null {
        print "⚠️ No demo instance found. Nothing to teardown."
        return
    }

    let instance = $state
    print $"Destroying instance: ($instance.id)"
    print $"IP Address: ($instance.main_ip)"

    # Delete instance
    print "🔥 Deleting Vultr instance..."
    vultr instance delete $instance.id

    # Remove state file
    try { rm --force $STATE_FILE }

    print "✅ Demo router destroyed"
}

# Status: Show current demo status
def status [] {
    print "📊 Demo Router Status"
    print =====================

    let state = (load_state)
    if $state == null {
        print "❌ No demo instance found"
        return
    }

    let instance = $state
    print $"Instance ID: ($instance.id)
IP Address: ($instance.main_ip)
Status: ($instance.status)
Created: ($instance.date_created)"

    # Check if instance still exists
    try {
        let current = (get_instance $instance.id)
        print $"Current Status: ($current.status)"
        print $"Power: ($current.power_status)"
    } catch {
        print "⚠️ Instance no longer exists on Vultr"
    }
}

# Helper functions

def check_existing_instance []: nothing -> record {
    let response = try { vultr instance list -o json | from json } catch { return null }
    let instances = ($response.instances? | default [])
    let existing = ($instances | where label == $INSTANCE_LABEL | first)
    if ($existing | is-empty) {
        return null
    } else {
        return $existing
    }
}

def create_instance []: nothing -> record {
    let output = (^vultr instance create
        --region $REGION
        --plan $PLAN
        --os $OS_ID
        --label $INSTANCE_LABEL
        --host $INSTANCE_LABEL
        --tags demo,ngfw,testing,automated
        --ipv6
        -o json
    )
    let response = (try { $output | from json } catch { error make { msg: "Failed to parse instance creation output" } })
    # Vultr CLI wraps instance in {instance: {...}}
    return ($response.instance? | default $response)
}

def get_instance [instance_id: string]: nothing -> record {
    let output = (vultr instance get $instance_id -o json)
    let response = (try { $output | from json } catch { error make { msg: "Failed to parse instance details" } })
    # Vultr CLI wraps instance in {instance: {...}}
    return ($response.instance? | default $response)
}

def wait_for_active [instance_id: string] {
    for retries in 0..60 {
        let instance = (get_instance $instance_id)
        if $instance.status == "active" and $instance.main_ip != "0.0.0.0" {
            return
        }

        if $retries >= 59 {
            print -e "❌ Timeout waiting for instance to be active"
            error make { msg: "Timeout waiting for instance to be active" }
        }

        sleep 5sec
    }
}

def wait_for_ssh [ip: string] {
    for retries in 0..60 {
        let result = (do { ^ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $"root@($ip)" "echo 'SSH ready'" } | complete)
        if $result.exit_code == 0 {
            return
        }

        if $retries >= 59 {
            print -e "❌ Timeout waiting for SSH"
            error make { msg: "Timeout waiting for SSH" }
        }

        sleep 5sec
    }
}

def deploy_container [instance: record] {
    let ip = $instance.main_ip

    # Install Docker
    let result = (do { ^ssh -o StrictHostKeyChecking=no $"root@($ip)" "apt update -qq && apt install -y -qq docker.io docker-compose && systemctl enable docker && systemctl start docker" } | complete)
    if $result.exit_code != 0 {
        error make { msg: $"Failed to install Docker: ($result.stderr)" }
    }

    # Create config directory
    let result = (do { ^ssh -o StrictHostKeyChecking=no $"root@($ip)" "mkdir -p /etc/ngfw" } | complete)
    if $result.exit_code != 0 {
        error make { msg: $"Failed to create config directory: ($result.stderr)" }
    }

    # Create config file
    let config = $"
[agent]
device_id = \"demo-router-001\"
api_url = \"wss://api.ngfw.sh/agent/ws\"
api_key = \"demo-key-will-be-configured\"
owner_id = \"demo-owner\"

[mode]
default = \"shadow\"

[adapters]
nvram = true
iptables = true
dnsmasq = true
wireless = true
wireguard = true
system = true
"

    # Upload config
    $config | ^ssh -o StrictHostKeyChecking=no $"root@($ip)" "cat > /etc/ngfw/config.toml"

    # Run container
    let result = (do { ^ssh -o StrictHostKeyChecking=no $"root@($ip)" "docker run -d --name ngfw-agent --restart unless-stopped -v /etc/ngfw/config.toml:/etc/ngfw/config.toml:ro ghcr.io/danielbodnar/ngfw-agent:latest || true" } | complete)
    if $result.exit_code != 0 {
        error make { msg: $"Failed to start container: ($result.stderr)" }
    }
}

def verify_deployment [instance: record]: nothing -> bool {
    let ip = $instance.main_ip
    let result = (do { ^ssh -o StrictHostKeyChecking=no $"root@($ip)" "docker ps --filter name=ngfw-agent --format '{{.Status}}'" } | complete)

    if $result.exit_code != 0 {
        print -e "❌ Container not running"
        error make { msg: "Container not running" }
    }

    if ($result.stdout | str contains "Up") {
        return true
    } else {
        print -e "❌ Container not running"
        error make { msg: "Container not running" }
    }
}

def test_ssh [ip: string]: nothing -> bool {
    let result = (do { ^ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $"root@($ip)" "echo 'test'" } | complete)
    return ($result.exit_code == 0)
}

def test_container [instance: record]: nothing -> bool {
    let ip = $instance.main_ip
    try {
        let result = (do { ^ssh -o StrictHostKeyChecking=no $"root@($ip)" "docker ps --filter name=ngfw-agent --format '{{.Status}}'" } | complete)
        return ($result.exit_code == 0 and ($result.stdout | str contains "Up"))
    } catch {
        return false
    }
}

def test_agent_health [instance: record]: nothing -> bool {
    let ip = $instance.main_ip
    try {
        let result = (do { ^ssh -o StrictHostKeyChecking=no $"root@($ip)" "docker logs ngfw-agent --tail 50" } | complete)
        # Check if agent started successfully
        return ($result.exit_code == 0 and ($result.stdout | str contains "agent"))
    } catch {
        return false
    }
}

def test_websocket_connection [instance: record]: nothing -> bool {
    # Placeholder - would test actual WebSocket connection
    return false
}

def save_state [instance: record] {
    try { $instance | to json | save --force $STATE_FILE } catch {|err|
        print -e $"Warning: Failed to save state: ($err)"
    }
}

def load_state []: nothing -> record {
    if not ($STATE_FILE | path exists) {
        return null
    }
    try { open $STATE_FILE | from json } catch { return null }
}
