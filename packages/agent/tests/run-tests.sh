#!/usr/bin/env bash
# NGFW Agent Integration Test Runner
#
# Runs the comprehensive integration test suite with proper environment setup,
# mock binaries, and cleanup. Supports multiple test environments (native, Docker, QEMU).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOCK_BINS="$SCRIPT_DIR/integration/mock-bins"
MOCK_SYSFS="$SCRIPT_DIR/integration/mock-sysfs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_THREADS="${TEST_THREADS:-1}"
RUST_LOG="${RUST_LOG:-info}"
TIMEOUT="${TIMEOUT:-300}"

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Setup test environment
setup_environment() {
    log_info "Setting up test environment..."

    # Make mock binaries executable
    if [[ -d "$MOCK_BINS" ]]; then
        chmod +x "$MOCK_BINS"/*
        log_success "Mock binaries prepared"
    else
        log_warn "Mock binaries directory not found: $MOCK_BINS"
    fi

    # Verify mock sysfs structure
    if [[ -d "$MOCK_SYSFS" ]]; then
        log_success "Mock sysfs available"
    else
        log_warn "Mock sysfs directory not found: $MOCK_SYSFS"
    fi

    # Add mock binaries to PATH
    export PATH="$MOCK_BINS:$PATH"

    # Set test environment variables
    export RUST_LOG="$RUST_LOG"
    export RUST_BACKTRACE=1
    export TEST_MODE=1

    log_success "Environment ready"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."

    # Kill any lingering test processes
    pkill -f "ngfw-agent.*test" || true

    # Remove PID files
    rm -f /tmp/ngfw-agent*.pid || true

    log_success "Cleanup complete"
}

# Trap cleanup on exit
trap cleanup EXIT

# Run specific test suite
run_test_suite() {
    local suite=$1
    local description=$2

    log_info "Running $description..."

    if cargo test --test "$suite" -- --test-threads="$TEST_THREADS" --nocapture; then
        log_success "$description passed"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Run all tests
run_all_tests() {
    local failed=0

    log_info "Running all integration tests..."
    echo ""

    # WebSocket connection tests
    run_test_suite "integration_websocket" "WebSocket Connection Tests" || ((failed++))
    echo ""

    # Dispatcher tests
    run_test_suite "integration_dispatcher" "Message Dispatcher Tests" || ((failed++))
    echo ""

    # Adapter tests
    run_test_suite "integration_adapters" "Firmware Adapter Tests" || ((failed++))
    echo ""

    # Metrics tests
    run_test_suite "integration_metrics" "Metrics Collection Tests" || ((failed++))
    echo ""

    # E2E tests
    run_test_suite "integration_e2e" "End-to-End Tests" || ((failed++))
    echo ""

    return $failed
}

# Generate coverage report
generate_coverage() {
    log_info "Generating coverage report..."

    if command -v cargo-tarpaulin &> /dev/null; then
        cargo tarpaulin --tests --out Html --output-dir coverage
        log_success "Coverage report generated in coverage/"
    else
        log_warn "cargo-tarpaulin not installed, skipping coverage"
        log_info "Install with: cargo install cargo-tarpaulin"
    fi
}

# Print usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] [TEST_SUITE]

Run NGFW agent integration tests.

OPTIONS:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose logging (DEBUG level)
    -c, --coverage      Generate coverage report
    -t, --threads N     Number of test threads (default: 1)
    --timeout N         Test timeout in seconds (default: 300)

TEST_SUITE:
    all                 Run all test suites (default)
    websocket           WebSocket connection tests
    dispatcher          Message dispatcher tests
    adapters            Firmware adapter tests
    metrics             Metrics collection tests
    e2e                 End-to-end tests

EXAMPLES:
    $0                  # Run all tests
    $0 websocket        # Run only WebSocket tests
    $0 -v dispatcher    # Run dispatcher tests with verbose logging
    $0 -c               # Run all tests and generate coverage

ENVIRONMENT:
    RUST_LOG            Set log level (default: info)
    TEST_THREADS        Number of test threads (default: 1)
    TIMEOUT             Test timeout in seconds (default: 300)
EOF
}

# Main execution
main() {
    local suite="all"
    local coverage=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                RUST_LOG="debug"
                shift
                ;;
            -c|--coverage)
                coverage=true
                shift
                ;;
            -t|--threads)
                TEST_THREADS="$2"
                shift 2
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            all|websocket|dispatcher|adapters|metrics|e2e)
                suite="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Setup environment
    setup_environment

    # Change to project directory
    cd "$PROJECT_ROOT"

    # Run tests
    local exit_code=0

    case $suite in
        all)
            run_all_tests || exit_code=$?
            ;;
        websocket)
            run_test_suite "integration_websocket" "WebSocket Connection Tests" || exit_code=$?
            ;;
        dispatcher)
            run_test_suite "integration_dispatcher" "Message Dispatcher Tests" || exit_code=$?
            ;;
        adapters)
            run_test_suite "integration_adapters" "Firmware Adapter Tests" || exit_code=$?
            ;;
        metrics)
            run_test_suite "integration_metrics" "Metrics Collection Tests" || exit_code=$?
            ;;
        e2e)
            run_test_suite "integration_e2e" "End-to-End Tests" || exit_code=$?
            ;;
    esac

    # Generate coverage if requested
    if [[ "$coverage" == true ]]; then
        generate_coverage
    fi

    # Summary
    echo ""
    if [[ $exit_code -eq 0 ]]; then
        log_success "All tests passed!"
    else
        log_error "$exit_code test suite(s) failed"
    fi

    exit $exit_code
}

main "$@"
