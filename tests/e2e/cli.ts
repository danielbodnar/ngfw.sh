#!/usr/bin/env bun

/**
 * E2E Test CLI Runner
 *
 * Command-line interface for running E2E tests with various options.
 *
 * Usage:
 *   bun run tests/e2e/cli.ts [options]
 *
 * Options:
 *   --env <docker|qemu|both>     Test environment (default: both)
 *   --tag <tag>                  Filter by tag (can be used multiple times)
 *   --exclude-tag <tag>          Exclude by tag (can be used multiple times)
 *   --parallel                   Run tests in parallel (default: true)
 *   --sequential                 Run tests sequentially
 *   --max-parallel <n>           Max parallel tests (default: 3)
 *   --fail-fast                  Stop on first failure
 *   --retries <n>                Number of retries (default: 1)
 *   --timeout <ms>               Test timeout in milliseconds (default: 600000)
 *   --verbose                    Verbose output
 *   --smoke                      Run only smoke tests
 *   --prereq                     Run only prerequisite checks
 *   --performance                Run only performance tests
 *   --list                       List all available test suites
 *   --help                       Show this help message
 *
 * Examples:
 *   bun run tests/e2e/cli.ts --env docker --smoke
 *   bun run tests/e2e/cli.ts --tag agent --tag metrics --parallel
 *   bun run tests/e2e/cli.ts --env qemu --sequential --verbose
 *   bun run tests/e2e/cli.ts --exclude-tag performance --fail-fast
 *
 * @module e2e/cli
 */

import type { TestEnvironment } from "./orchestrator";
import { E2EOrchestrator } from "./orchestrator";
import {
	getPerformanceSuites,
	getPrerequisiteSuites,
	getSmokeSuites,
	testSuites,
} from "./suites";

interface CLIOptions {
	env: TestEnvironment[];
	tags: string[];
	excludeTags: string[];
	parallel: boolean;
	maxParallel: number;
	failFast: boolean;
	retries: number;
	timeout: number;
	verbose: boolean;
	smoke: boolean;
	prereq: boolean;
	performance: boolean;
	list: boolean;
	help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
	const options: CLIOptions = {
		env: [],
		tags: [],
		excludeTags: [],
		parallel: true,
		maxParallel: 3,
		failFast: false,
		retries: 1,
		timeout: 600000,
		verbose: false,
		smoke: false,
		prereq: false,
		performance: false,
		list: false,
		help: false,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case "--env":
				options.env.push(args[++i] as TestEnvironment);
				break;
			case "--tag":
				options.tags.push(args[++i]);
				break;
			case "--exclude-tag":
				options.excludeTags.push(args[++i]);
				break;
			case "--parallel":
				options.parallel = true;
				break;
			case "--sequential":
				options.parallel = false;
				break;
			case "--max-parallel":
				options.maxParallel = Number.parseInt(args[++i], 10);
				break;
			case "--fail-fast":
				options.failFast = true;
				break;
			case "--retries":
				options.retries = Number.parseInt(args[++i], 10);
				break;
			case "--timeout":
				options.timeout = Number.parseInt(args[++i], 10);
				break;
			case "--verbose":
				options.verbose = true;
				break;
			case "--smoke":
				options.smoke = true;
				break;
			case "--prereq":
				options.prereq = true;
				break;
			case "--performance":
				options.performance = true;
				break;
			case "--list":
				options.list = true;
				break;
			case "--help":
				options.help = true;
				break;
			default:
				console.error(`Unknown option: ${arg}`);
				process.exit(1);
		}
	}

	return options;
}

function printHelp(): void {
	console.log(`
E2E Test CLI Runner

Usage:
  bun run tests/e2e/cli.ts [options]

Options:
  --env <docker|qemu|both>     Test environment (default: both)
  --tag <tag>                  Filter by tag (can be used multiple times)
  --exclude-tag <tag>          Exclude by tag (can be used multiple times)
  --parallel                   Run tests in parallel (default: true)
  --sequential                 Run tests sequentially
  --max-parallel <n>           Max parallel tests (default: 3)
  --fail-fast                  Stop on first failure
  --retries <n>                Number of retries (default: 1)
  --timeout <ms>               Test timeout in milliseconds (default: 600000)
  --verbose                    Verbose output
  --smoke                      Run only smoke tests
  --prereq                     Run only prerequisite checks
  --performance                Run only performance tests
  --list                       List all available test suites
  --help                       Show this help message

Examples:
  bun run tests/e2e/cli.ts --env docker --smoke
  bun run tests/e2e/cli.ts --tag agent --tag metrics --parallel
  bun run tests/e2e/cli.ts --env qemu --sequential --verbose
  bun run tests/e2e/cli.ts --exclude-tag performance --fail-fast

Available Tags:
  infrastructure, prerequisites, build, agent, connectivity, auth, security,
  metrics, monitoring, websocket, protocol, firmware, detection, sequencing,
  performance, e2e, integration, cross-platform, smoke, docker, qemu

Available Environments:
  docker  - Fast, CI-friendly Docker-based testing
  qemu    - Full system emulation with QEMU VM
  both    - Run tests in both environments
  `);
}

function listSuites(): void {
	console.log("\nAvailable Test Suites:\n");
	console.log("=".repeat(100));

	const grouped = new Map<string, typeof testSuites>();

	for (const suite of testSuites) {
		const category = suite.tags[0] || "other";
		if (!grouped.has(category)) {
			grouped.set(category, []);
		}
		grouped.get(category)!.push(suite);
	}

	for (const [category, suites] of Array.from(grouped.entries()).sort()) {
		console.log(`\n${category.toUpperCase()}`);
		console.log("-".repeat(100));

		for (const suite of suites) {
			const deps =
				suite.dependencies.length > 0
					? ` (deps: ${suite.dependencies.length})`
					: "";
			const parallel = suite.parallel ? " [parallel]" : " [sequential]";
			console.log(
				`  ${suite.id.padEnd(40)} ${suite.environment.padEnd(8)} ${suite.timeout / 1000}s${deps}${parallel}`,
			);
			console.log(`    ${suite.description}`);
			console.log(`    Tags: ${suite.tags.join(", ")}`);
			console.log();
		}
	}

	console.log("=".repeat(100));
	console.log(`\nTotal: ${testSuites.length} test suites\n`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const options = parseArgs(args);

	if (options.help) {
		printHelp();
		process.exit(0);
	}

	if (options.list) {
		listSuites();
		process.exit(0);
	}

	// Create orchestrator
	const orchestrator = new E2EOrchestrator({
		parallel: options.parallel,
		maxParallel: options.maxParallel,
		failFast: options.failFast,
		retries: options.retries,
		timeout: options.timeout,
		environments: options.env.length > 0 ? options.env : ["both"],
		tags: options.tags,
		excludeTags: options.excludeTags,
		verbose: options.verbose,
	});

	// Determine which suites to load
	let suitesToLoad = testSuites;

	if (options.smoke) {
		suitesToLoad = getSmokeSuites();
		console.log("Running smoke tests only");
	} else if (options.prereq) {
		suitesToLoad = getPrerequisiteSuites();
		console.log("Running prerequisite checks only");
	} else if (options.performance) {
		suitesToLoad = getPerformanceSuites();
		console.log("Running performance tests only");
	}

	// Load suites
	orchestrator.loadSuites(suitesToLoad);

	// Run tests
	try {
		const results = await orchestrator.run();

		// Exit with appropriate code
		const failed = results.filter((r) => r.status === "failed").length;
		process.exit(failed > 0 ? 1 : 0);
	} catch (error) {
		console.error("Fatal error during test execution:");
		console.error(error);
		process.exit(1);
	}
}

main();
