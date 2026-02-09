#!/usr/bin/env nu
# E2E Test Runner (Nushell)
#
# Alternative Nushell-based test runner with structured data handling.
# Provides better data pipeline integration and native table output.
#
# Usage:
#   ./runner.nu [options]
#
# Options:
#   --environment <docker|qemu|both>  Test environment
#   --tag <tag>                       Filter by tag
#   --smoke                           Run smoke tests only
#   --list                            List all test suites
#   --report                          Generate and display report
#   --help                            Show help

def main [
  --environment: string = "both"  # Test environment (docker, qemu, or both)
  --tag: string = ""              # Filter by tag
  --smoke                         # Run smoke tests only
  --list                          # List all test suites
  --report                        # Generate and display report
  --help                          # Show help
]: nothing -> nothing {
  if $help {
    print-help
    return
  }

  if $list {
    list-suites
    return
  }

  if $report {
    display-latest-report
    return
  }

  # Run the TypeScript CLI
  let args = build-cli-args $environment $tag $smoke

  print $"Running E2E tests with environment: ($environment)"

  try {
    bun run ([$env.PWD tests/e2e/cli.ts] | path join) ...$args
  } catch {|err|
    error make {msg: $"Error running tests: ($err.msg)"}
  }
}

# Build CLI arguments based on Nushell parameters
def build-cli-args [
  test_env: string
  tag: string
  smoke: bool
]: nothing -> list<string> {
  mut args = []

  if $test_env != both {
    $args ++= [--env $test_env]
  }

  if $tag != "" {
    $args ++= [--tag $tag]
  }

  if $smoke {
    $args ++= [--smoke]
  }

  $args
}

# Print help message
def print-help []: nothing -> nothing {
  print "
E2E Test Runner (Nushell)

Usage:
  ./runner.nu [options]

Options:
  --environment <docker|qemu|both>  Test environment (default: both)
  --tag <tag>                       Filter by tag
  --smoke                           Run smoke tests only
  --list                            List all test suites
  --report                          Generate and display report
  --help                            Show help

Examples:
  ./runner.nu --environment docker --smoke
  ./runner.nu --tag agent
  ./runner.nu --list
  ./runner.nu --report
"
}

# List all test suites in table format
def list-suites []: nothing -> nothing {
  print "Fetching test suites..."

  try {
    bun run ([$env.PWD tests/e2e/cli.ts] | path join) --list
  } catch {|err|
    error make {msg: $"Error listing suites: ($err.msg)"}
  }
}

# Display latest test report
def display-latest-report []: nothing -> nothing {
  let results_dir = ([$env.PWD test-results/e2e] | path join)

  if not ($results_dir | path exists) {
    print "No test results found"
    return
  }

  let latest_json = try {
    ls $"($results_dir)/*.json"
    | sort-by modified
    | reverse
    | first
    | get name
  } catch {
    null
  }

  if ($latest_json == null) {
    print "No JSON reports found"
    return
  }

  print $"Reading report: ($latest_json)"

  let report = try {
    open $latest_json
  } catch {
    error make {msg: "Failed to open report file"}
  }

  let summary = $report.summary

  print $"\n=== E2E Test Results Summary ===
Total:    ($summary.total)
Passed:   ($summary.passed) \(($summary.passRate | into string | str substring 0..4)%\)
Failed:   ($summary.failed)
Skipped:  ($summary.skipped)
Duration: ($summary.duration / 1000 | into string | str substring 0..6)s
Status:   (if $summary.success { '✓ SUCCESS' } else { '✗ FAILURE' })

=== Individual Results ==="

  $report.results
  | select name environment status duration
  | update duration {|row| $row.duration / 1000 | into string | str substring 0..6 }
  | each {|row|
      {
        name: $row.name
        environment: $row.environment
        status: $row.status
        duration: $"($row.duration)s"
      }
    }
  | table
}

# Run smoke tests (shortcut)
export def smoke [--test_env: string = "both"]: nothing -> nothing {
  main --environment $test_env --smoke
}

# Run prerequisite checks (shortcut)
export def prereq [--test_env: string = "both"]: nothing -> nothing {
  try {
    bun run ([$env.PWD tests/e2e/cli.ts] | path join) --prereq --env $test_env
  } catch {|err|
    error make {msg: $"Error running prerequisite checks: ($err.msg)"}
  }
}

# Run performance tests (shortcut)
export def perf [--test_env: string = "both"]: nothing -> nothing {
  try {
    bun run ([$env.PWD tests/e2e/cli.ts] | path join) --performance --env $test_env
  } catch {|err|
    error make {msg: $"Error running performance tests: ($err.msg)"}
  }
}

# Watch test results directory and display reports as they complete
export def watch []: nothing -> nothing {
  let results_dir = ([$env.PWD test-results/e2e] | path join)

  if not ($results_dir | path exists) {
    try {
      mkdir $results_dir
    }
  }

  print $"Watching for new test reports in: ($results_dir)"
  print "Press Ctrl+C to stop"

  mut last_count = try {
    ls $"($results_dir)/*.json" | length
  } catch {
    0
  }

  loop {
    sleep 2sec

    let current_count = try {
      ls $"($results_dir)/*.json" | length
    } catch {
      0
    }

    if $current_count > $last_count {
      print "\n🔔 New test report detected!"
      display-latest-report
      $last_count = $current_count
    }
  }
}

# Clean test results directory
export def clean []: nothing -> nothing {
  let results_dir = ([$env.PWD test-results/e2e] | path join)

  if ($results_dir | path exists) {
    try {
      rm --recursive --force $results_dir
      print $"Cleaned: ($results_dir)"
    } catch {|err|
      error make {msg: $"Failed to clean: ($err.msg)"}
    }
  } else {
    print "No results directory to clean"
  }
}

# Compare two test reports
export def compare [
  report1: path   # Path to first report JSON
  report2: path   # Path to second report JSON
]: nothing -> table {
  let r1 = try {
    open $report1
  } catch {
    error make {msg: $"Failed to open ($report1)"}
  }

  let r2 = try {
    open $report2
  } catch {
    error make {msg: $"Failed to open ($report2)"}
  }

  print $"\n=== Test Report Comparison ===
\nReport 1: ($report1)
Report 2: ($report2)

--- Summary Comparison ---"

  [
    {
      metric: Total
      report1: $r1.summary.total
      report2: $r2.summary.total
      diff: ($r2.summary.total - $r1.summary.total)
    }
    {
      metric: Passed
      report1: $r1.summary.passed
      report2: $r2.summary.passed
      diff: ($r2.summary.passed - $r1.summary.passed)
    }
    {
      metric: Failed
      report1: $r1.summary.failed
      report2: $r2.summary.failed
      diff: ($r2.summary.failed - $r1.summary.failed)
    }
    {
      metric: "Duration (s)"
      report1: ($r1.summary.duration / 1000)
      report2: ($r2.summary.duration / 1000)
      diff: (($r2.summary.duration - $r1.summary.duration) / 1000)
    }
  ]
  | table
}
