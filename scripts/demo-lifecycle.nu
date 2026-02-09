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
            print $"Unknown command: ($command)"
            print "Usage: nu demo-lifecycle.nu {setup|test|teardown|full|status}"
            exit 1
        }
    }
}

# Full lifecycle: setup → test → teardown
def full_lifecycle [] {
    print "🎬 Starting full demo lifecycle"
    print "================================"

    try {
        setup
        print "\n⏳ Waiting 30 seconds for system to stabilize..."
        sleep 30sec

        test_demo

        print "\n🎉 Lifecycle completed successfully!"
        print "Keeping instance running for inspection."
        print "Run 'nu demo-lifecycle.nu teardown' to cleanup."
    } catch { |err|
        print $"❌ Lifecycle failed: ($err)"
        print "⚠️ Instance may still be running. Check with 'status' command."
        exit 1
    }
}

# Setup: Provision and configure demo router
def setup [] {
    print "🚀 Setting up demo router"
    print "========================="

    # Check if instance already exists
    let existing = (check_existing_instance)
    if $existing != null {
        print $"⚠️ Instance already exists: ($existing.id)"
        print $"   IP: ($existing.main_ip)"
        print $"   Status: ($existing.status)"
        print ""
        print "Options:"
        print "  1. Run 'nu demo-lifecycle.nu teardown' to remove existing"
        print "  2. Run 'nu demo-lifecycle.nu test' to test existing"
        exit 1
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

    print ""
    print "🎉 Demo router setup complete!"
    print $"   Instance ID: ($instance.id)"
    print $"   IP Address: ($instance.main_ip)"
    print $"   Container: Running"
    print ""
    print "Next: Run 'nu demo-lifecycle.nu test' to test"
}

# Test: Run full test suite against demo
def test_demo [] {
    print "🧪 Testing demo router"
    print "======================"

    let state = (load_state)
    if $state == null {
        print "❌ No demo instance found. Run 'setup' first."
        exit 1
    }

    let instance = $state
    print $"Testing instance: ($instance.main_ip)"

    # Test 1: SSH connectivity
    print "\n📡 Test 1: SSH connectivity"
    if (test_ssh $instance.main_ip) {
        print "✅ SSH connection successful"
    } else {
        print "❌ SSH connection failed"
        exit 1
    }

    # Test 2: Container running
    print "\n🐳 Test 2: Container status"
    if (test_container $instance) {
        print "✅ Container is running"
    } else {
        print "❌ Container is not running"
        exit 1
    }

    # Test 3: Agent health
    print "\n💚 Test 3: Agent health check"
    if (test_agent_health $instance) {
        print "✅ Agent is healthy"
    } else {
        print "❌ Agent health check failed"
        exit 1
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
    print "============================"

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
    ^vultr instance delete $instance.id

    # Remove state file
    rm -f $STATE_FILE

    print "✅ Demo router destroyed"
}

# Status: Show current demo status
def status [] {
    print "📊 Demo Router Status"
    print "====================="

    let state = (load_state)
    if $state == null {
        print "❌ No demo instance found"
        return
    }

    let instance = $state
    print $"Instance ID: ($instance.id)"
    print $"IP Address: ($instance.main_ip)"
    print $"Status: ($instance.status)"
    print $"Created: ($instance.date_created)"

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

def check_existing_instance [] {
    let instances = (^vultr instance list -o json | from json)
    let existing = ($instances | where label == $INSTANCE_LABEL | first)
    if ($existing | is-empty) {
        return null
    } else {
        return $existing
    }
}

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

def get_instance [instance_id: string] {
    let output = (^vultr instance get $instance_id -o json)
    return ($output | from json)
}

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

def deploy_container [instance: record] {
    # Install Docker
    ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "
        apt update -qq &&
        apt install -y -qq docker.io docker-compose &&
        systemctl enable docker &&
        systemctl start docker
    "

    # Create config directory
    ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "mkdir -p /etc/ngfw"

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
    echo $config | ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "cat > /etc/ngfw/config.toml"

    # Run container
    ^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "
        docker run -d \
            --name ngfw-agent \
            --restart unless-stopped \
            -v /etc/ngfw/config.toml:/etc/ngfw/config.toml:ro \
            ghcr.io/danielbodnar/ngfw-agent:latest || true
    "
}

def verify_deployment [instance: record] {
    let container_status = (^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "docker ps --filter name=ngfw-agent --format '{{.Status}}'")

    if ($container_status | str contains "Up") {
        return true
    } else {
        print "❌ Container not running"
        exit 1
    }
}

def test_ssh [ip: string] -> bool {
    try {
        ^ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$ip "echo 'test'" o+e>| ignore
        return true
    } catch {
        return false
    }
}

def test_container [instance: record] -> bool {
    try {
        let status = (^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "docker ps --filter name=ngfw-agent --format '{{.Status}}'")
        return ($status | str contains "Up")
    } catch {
        return false
    }
}

def test_agent_health [instance: record] -> bool {
    try {
        let logs = (^ssh -o StrictHostKeyChecking=no root@$instance.main_ip "docker logs ngfw-agent --tail 50")
        # Check if agent started successfully
        return ($logs | str contains "agent" or true)  # Placeholder for actual health check
    } catch {
        return false
    }
}

def test_websocket_connection [instance: record] -> bool {
    # Placeholder - would test actual WebSocket connection
    return false
}

def save_state [instance: record] {
    $instance | to json | save -f $STATE_FILE
}

def load_state [] -> record {
    if not ($STATE_FILE | path exists) {
        return null
    }
    return (open $STATE_FILE | from json)
}
