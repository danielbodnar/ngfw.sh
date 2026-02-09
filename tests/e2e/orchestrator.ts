/**
 * E2E Test Orchestrator
 *
 * Unified test runner that coordinates testing across QEMU and Docker environments.
 * Manages test sequencing, parallel execution, fixtures, and result aggregation.
 *
 * @module e2e/orchestrator
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "../..");
const RESULTS_DIR = join(PROJECT_ROOT, "test-results/e2e");
const FIXTURES_DIR = join(__dirname, "fixtures");

// Ensure results directory exists
if (!existsSync(RESULTS_DIR)) {
	mkdirSync(RESULTS_DIR, { recursive: true });
}

/** Test environment types */
type TestEnvironment = "docker" | "qemu" | "both";

/** Test execution status */
type TestStatus = "pending" | "running" | "passed" | "failed" | "skipped";

/** Test result interface */
interface TestResult {
	id: string;
	name: string;
	environment: TestEnvironment;
	status: TestStatus;
	duration: number;
	startTime: number;
	endTime?: number;
	error?: string;
	output?: string;
	artifacts?: string[];
}

/** Test suite configuration */
interface TestSuite {
	id: string;
	name: string;
	description: string;
	environment: TestEnvironment;
	timeout: number;
	retries: number;
	dependencies: string[];
	tags: string[];
	fixtures: string[];
	parallel: boolean;
	command: string;
	setup?: string;
	teardown?: string;
}

/** Orchestrator configuration */
interface OrchestratorConfig {
	parallel: boolean;
	maxParallel: number;
	failFast: boolean;
	retries: number;
	timeout: number;
	environments: TestEnvironment[];
	tags: string[];
	excludeTags: string[];
	verbose: boolean;
}

/** Test execution context */
interface ExecutionContext {
	suites: Map<string, TestSuite>;
	results: Map<string, TestResult>;
	fixtures: Map<string, unknown>;
	config: OrchestratorConfig;
	startTime: number;
	endTime?: number;
}

/**
 * E2E Test Orchestrator
 *
 * Coordinates test execution across multiple environments with support for:
 * - Parallel and sequential execution
 * - Dependency management
 * - Fixture management
 * - Result aggregation and reporting
 */
export class E2EOrchestrator {
	private context: ExecutionContext;
	private suites: TestSuite[] = [];

	constructor(config: Partial<OrchestratorConfig> = {}) {
		this.context = {
			suites: new Map(),
			results: new Map(),
			fixtures: new Map(),
			config: {
				parallel: true,
				maxParallel: 3,
				failFast: false,
				retries: 1,
				timeout: 600000, // 10 minutes
				environments: ["both"],
				tags: [],
				excludeTags: [],
				verbose: false,
				...config,
			},
			startTime: Date.now(),
		};
	}

	/**
	 * Register a test suite
	 */
	registerSuite(suite: TestSuite): void {
		this.suites.push(suite);
		this.context.suites.set(suite.id, suite);
		this.log(`Registered suite: ${suite.name} (${suite.environment})`);
	}

	/**
	 * Load test suites from configuration
	 */
	loadSuites(suitesConfig: TestSuite[]): void {
		for (const suite of suitesConfig) {
			this.registerSuite(suite);
		}
	}

	/**
	 * Run all registered test suites
	 */
	async run(): Promise<TestResult[]> {
		this.log("Starting E2E test orchestration...");
		this.context.startTime = Date.now();

		// Filter suites by environment and tags
		const filtered = this.filterSuites();
		this.log(
			`Running ${filtered.length} of ${this.suites.length} registered suites`,
		);

		// Load fixtures
		await this.loadFixtures(filtered);

		// Execute setup phase
		await this.executeSetupPhase(filtered);

		// Build execution plan with dependency resolution
		const executionPlan = this.buildExecutionPlan(filtered);
		this.log(`Execution plan: ${executionPlan.length} phases`);

		// Execute test suites
		try {
			for (const phase of executionPlan) {
				await this.executePhase(phase);

				// Fail fast if configured
				if (this.context.config.failFast && this.hasFailures()) {
					this.log("Fail-fast mode enabled, stopping execution");
					break;
				}
			}
		} finally {
			// Execute teardown phase
			await this.executeTeardownPhase(filtered);

			// Cleanup fixtures
			await this.cleanupFixtures();
		}

		this.context.endTime = Date.now();

		// Generate reports
		await this.generateReports();

		return Array.from(this.context.results.values());
	}

	/**
	 * Filter suites based on configuration
	 */
	private filterSuites(): TestSuite[] {
		return this.suites.filter((suite) => {
			// Filter by environment
			if (this.context.config.environments.length > 0) {
				const envMatch = this.context.config.environments.some(
					(env) =>
						env === "both" ||
						env === suite.environment ||
						suite.environment === "both",
				);
				if (!envMatch) return false;
			}

			// Filter by included tags
			if (this.context.config.tags.length > 0) {
				const hasTag = this.context.config.tags.some((tag) =>
					suite.tags.includes(tag),
				);
				if (!hasTag) return false;
			}

			// Filter by excluded tags
			if (this.context.config.excludeTags.length > 0) {
				const hasExcludedTag = this.context.config.excludeTags.some((tag) =>
					suite.tags.includes(tag),
				);
				if (hasExcludedTag) return false;
			}

			return true;
		});
	}

	/**
	 * Build execution plan with dependency resolution
	 */
	private buildExecutionPlan(suites: TestSuite[]): TestSuite[][] {
		const plan: TestSuite[][] = [];
		const resolved = new Set<string>();
		const remaining = new Map(suites.map((s) => [s.id, s]));

		let safety = 0;
		const maxIterations = suites.length * 2;

		while (remaining.size > 0 && safety < maxIterations) {
			safety++;

			const phase: TestSuite[] = [];

			for (const [id, suite] of remaining) {
				// Check if all dependencies are resolved
				const depsResolved = suite.dependencies.every((dep) =>
					resolved.has(dep),
				);

				if (depsResolved) {
					phase.push(suite);
					resolved.add(id);
				}
			}

			// Remove resolved suites from remaining
			for (const suite of phase) {
				remaining.delete(suite.id);
			}

			if (phase.length > 0) {
				plan.push(phase);
			} else if (remaining.size > 0) {
				// Circular dependency detected
				const unresolved = Array.from(remaining.keys()).join(", ");
				throw new Error(`Circular dependency detected: ${unresolved}`);
			}
		}

		if (safety >= maxIterations) {
			throw new Error("Infinite loop detected in execution plan building");
		}

		return plan;
	}

	/**
	 * Execute a phase of test suites
	 */
	private async executePhase(phase: TestSuite[]): Promise<void> {
		this.log(`Executing phase with ${phase.length} suites`);

		if (this.context.config.parallel && phase.length > 1) {
			// Parallel execution
			const batches = this.batchSuites(phase, this.context.config.maxParallel);

			for (const batch of batches) {
				await Promise.all(batch.map((suite) => this.executeSuite(suite)));
			}
		} else {
			// Sequential execution
			for (const suite of phase) {
				await this.executeSuite(suite);
			}
		}
	}

	/**
	 * Batch suites for parallel execution
	 */
	private batchSuites(suites: TestSuite[], batchSize: number): TestSuite[][] {
		const batches: TestSuite[][] = [];
		for (let i = 0; i < suites.length; i += batchSize) {
			batches.push(suites.slice(i, i + batchSize));
		}
		return batches;
	}

	/**
	 * Execute a single test suite
	 */
	private async executeSuite(suite: TestSuite): Promise<TestResult> {
		const result: TestResult = {
			id: suite.id,
			name: suite.name,
			environment: suite.environment,
			status: "running",
			duration: 0,
			startTime: Date.now(),
			artifacts: [],
		};

		this.context.results.set(suite.id, result);
		this.log(`Running: ${suite.name}`);

		let attempts = 0;
		const maxAttempts = suite.retries + 1;

		while (attempts < maxAttempts) {
			attempts++;

			try {
				// Run setup if defined
				if (suite.setup) {
					await this.executeCommand(suite.setup, suite.timeout);
				}

				// Run the main test command
				const output = await this.executeCommand(suite.command, suite.timeout);

				result.status = "passed";
				result.output = output;
				result.endTime = Date.now();
				result.duration = result.endTime - result.startTime;

				this.log(`✓ Passed: ${suite.name} (${result.duration}ms)`);
				break;
			} catch (error) {
				result.status = "failed";
				result.error = error instanceof Error ? error.message : String(error);
				result.endTime = Date.now();
				result.duration = result.endTime - result.startTime;

				if (attempts < maxAttempts) {
					this.log(
						`✗ Failed: ${suite.name} (attempt ${attempts}/${maxAttempts}), retrying...`,
					);
					await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait before retry
				} else {
					this.log(`✗ Failed: ${suite.name} after ${attempts} attempts`);
				}
			} finally {
				// Run teardown if defined
				if (suite.teardown) {
					try {
						await this.executeCommand(suite.teardown, suite.timeout);
					} catch (error) {
						this.log(`Warning: Teardown failed for ${suite.name}: ${error}`);
					}
				}
			}
		}

		this.context.results.set(suite.id, result);
		return result;
	}

	/**
	 * Execute a shell command with timeout
	 */
	private executeCommand(command: string, timeout: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const startTime = Date.now();
			let output = "";
			let errorOutput = "";

			const child = spawn("sh", ["-c", command], {
				cwd: PROJECT_ROOT,
				env: { ...process.env },
			});

			child.stdout?.on("data", (data) => {
				output += data.toString();
				if (this.context.config.verbose) {
					process.stdout.write(data);
				}
			});

			child.stderr?.on("data", (data) => {
				errorOutput += data.toString();
				if (this.context.config.verbose) {
					process.stderr.write(data);
				}
			});

			const timeoutHandle = setTimeout(() => {
				child.kill("SIGTERM");
				reject(new Error(`Command timed out after ${timeout}ms`));
			}, timeout);

			child.on("close", (code) => {
				clearTimeout(timeoutHandle);
				const duration = Date.now() - startTime;

				if (code === 0) {
					resolve(output);
				} else {
					reject(
						new Error(
							`Command failed with code ${code}\n${errorOutput || output}`,
						),
					);
				}
			});

			child.on("error", (error) => {
				clearTimeout(timeoutHandle);
				reject(error);
			});
		});
	}

	/**
	 * Load test fixtures
	 */
	private async loadFixtures(suites: TestSuite[]): Promise<void> {
		const fixtureNames = new Set<string>();

		for (const suite of suites) {
			for (const fixture of suite.fixtures) {
				fixtureNames.add(fixture);
			}
		}

		this.log(`Loading ${fixtureNames.size} fixtures...`);

		for (const name of fixtureNames) {
			const fixturePath = join(FIXTURES_DIR, `${name}.json`);

			if (existsSync(fixturePath)) {
				const data = JSON.parse(readFileSync(fixturePath, "utf-8"));
				this.context.fixtures.set(name, data);
				this.log(`Loaded fixture: ${name}`);
			} else {
				this.log(`Warning: Fixture not found: ${name}`);
			}
		}
	}

	/**
	 * Execute setup phase for all suites
	 */
	private async executeSetupPhase(suites: TestSuite[]): Promise<void> {
		this.log("Executing global setup phase...");

		// Ensure test infrastructure is ready
		await this.setupTestInfrastructure();
	}

	/**
	 * Execute teardown phase for all suites
	 */
	private async executeTeardownPhase(suites: TestSuite[]): Promise<void> {
		this.log("Executing global teardown phase...");

		// Cleanup test infrastructure
		await this.cleanupTestInfrastructure();
	}

	/**
	 * Setup test infrastructure
	 */
	private async setupTestInfrastructure(): Promise<void> {
		// Check prerequisites
		this.checkPrerequisites();

		// Ensure Docker BuildKit is available
		if (this.needsDocker()) {
			this.log("Checking Docker availability...");
			try {
				execSync("docker info", { stdio: "pipe" });
			} catch {
				throw new Error("Docker is not available");
			}
		}

		// Ensure QEMU is available
		if (this.needsQEMU()) {
			this.log("Checking QEMU availability...");
			try {
				execSync("qemu-system-aarch64 --version", { stdio: "pipe" });
			} catch {
				throw new Error("QEMU is not available");
			}
		}
	}

	/**
	 * Cleanup test infrastructure
	 */
	private async cleanupTestInfrastructure(): Promise<void> {
		this.log("Cleaning up test infrastructure...");

		// Stop any running Docker containers
		try {
			execSync(
				`docker compose -f ${join(PROJECT_ROOT, "tests/integration/docker/compose.yaml")} down`,
				{
					stdio: "pipe",
				},
			);
		} catch {
			// Ignore errors
		}
	}

	/**
	 * Cleanup loaded fixtures
	 */
	private async cleanupFixtures(): Promise<void> {
		this.context.fixtures.clear();
	}

	/**
	 * Check prerequisites
	 */
	private checkPrerequisites(): void {
		this.log("Checking prerequisites...");

		// Check for cross compiler
		try {
			execSync("cross --version", { stdio: "pipe" });
		} catch {
			throw new Error("cross compiler not found (cargo install cross)");
		}
	}

	/**
	 * Check if Docker environment is needed
	 */
	private needsDocker(): boolean {
		return this.suites.some(
			(s) => s.environment === "docker" || s.environment === "both",
		);
	}

	/**
	 * Check if QEMU environment is needed
	 */
	private needsQEMU(): boolean {
		return this.suites.some(
			(s) => s.environment === "qemu" || s.environment === "both",
		);
	}

	/**
	 * Check if there are any failures
	 */
	private hasFailures(): boolean {
		return Array.from(this.context.results.values()).some(
			(r) => r.status === "failed",
		);
	}

	/**
	 * Generate test reports
	 */
	private async generateReports(): Promise<void> {
		this.log("Generating test reports...");

		const results = Array.from(this.context.results.values());
		const summary = this.generateSummary(results);

		// Console report
		this.printSummary(summary);

		// JSON report
		const jsonReport = {
			summary,
			results,
			config: this.context.config,
			startTime: this.context.startTime,
			endTime: this.context.endTime,
			duration: this.context.endTime! - this.context.startTime,
		};

		const jsonPath = join(RESULTS_DIR, `e2e-results-${Date.now()}.json`);
		writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
		this.log(`JSON report: ${jsonPath}`);

		// JUnit XML report
		const junitXml = this.generateJUnitXML(results);
		const junitPath = join(RESULTS_DIR, `e2e-results-${Date.now()}.xml`);
		writeFileSync(junitPath, junitXml);
		this.log(`JUnit XML report: ${junitPath}`);

		// HTML report
		const htmlReport = this.generateHTMLReport(jsonReport);
		const htmlPath = join(RESULTS_DIR, `e2e-results-${Date.now()}.html`);
		writeFileSync(htmlPath, htmlReport);
		this.log(`HTML report: ${htmlPath}`);
	}

	/**
	 * Generate summary statistics
	 */
	private generateSummary(results: TestResult[]) {
		const total = results.length;
		const passed = results.filter((r) => r.status === "passed").length;
		const failed = results.filter((r) => r.status === "failed").length;
		const skipped = results.filter((r) => r.status === "skipped").length;
		const duration = results.reduce((sum, r) => sum + r.duration, 0);

		return {
			total,
			passed,
			failed,
			skipped,
			duration,
			success: failed === 0,
			passRate: total > 0 ? (passed / total) * 100 : 0,
		};
	}

	/**
	 * Print summary to console
	 */
	private printSummary(summary: ReturnType<typeof this.generateSummary>): void {
		console.log("\n" + "=".repeat(80));
		console.log("E2E Test Results Summary");
		console.log("=".repeat(80));
		console.log(`Total:    ${summary.total}`);
		console.log(
			`Passed:   ${summary.passed} (${summary.passRate.toFixed(1)}%)`,
		);
		console.log(`Failed:   ${summary.failed}`);
		console.log(`Skipped:  ${summary.skipped}`);
		console.log(`Duration: ${(summary.duration / 1000).toFixed(2)}s`);
		console.log(`Status:   ${summary.success ? "✓ SUCCESS" : "✗ FAILURE"}`);
		console.log("=".repeat(80) + "\n");
	}

	/**
	 * Generate JUnit XML report
	 */
	private generateJUnitXML(results: TestResult[]): string {
		const total = results.length;
		const failures = results.filter((r) => r.status === "failed").length;
		const duration = results.reduce((sum, r) => sum + r.duration, 0) / 1000;

		let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
		xml += `<testsuites name="E2E Tests" tests="${total}" failures="${failures}" time="${duration.toFixed(3)}">\n`;
		xml += '  <testsuite name="E2E Test Suite">\n';

		for (const result of results) {
			const testDuration = (result.duration / 1000).toFixed(3);
			xml += `    <testcase name="${this.escapeXml(result.name)}" classname="${result.environment}" time="${testDuration}">\n`;

			if (result.status === "failed") {
				xml += `      <failure message="${this.escapeXml(result.error || "Test failed")}">\n`;
				xml += `        ${this.escapeXml(result.error || "")}`;
				xml += `      </failure>\n`;
			}

			xml += "    </testcase>\n";
		}

		xml += "  </testsuite>\n";
		xml += "</testsuites>\n";

		return xml;
	}

	/**
	 * Generate HTML report
	 */
	private generateHTMLReport(report: {
		summary: ReturnType<typeof this.generateSummary>;
		results: TestResult[];
	}): string {
		const { summary, results } = report;
		const statusColor = summary.success ? "#22c55e" : "#ef4444";

		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2E Test Results</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; background: #f9fafb; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .stat { background: #f3f4f6; padding: 1rem; border-radius: 6px; }
    .stat-label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.5rem; font-weight: 600; }
    .results { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 0.75rem; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
    td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
    .badge-passed { background: #dcfce7; color: #166534; }
    .badge-failed { background: #fee2e2; color: #991b1b; }
    .badge-skipped { background: #fef3c7; color: #92400e; }
    .status-indicator { width: 80px; height: 80px; border-radius: 50%; background: ${statusColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 600; margin: 0 auto 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="status-indicator">${summary.success ? "✓" : "✗"}</div>
      <h1>E2E Test Results</h1>
      <div class="summary">
        <div class="stat">
          <div class="stat-label">Total Tests</div>
          <div class="stat-value">${summary.total}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Passed</div>
          <div class="stat-value" style="color: #22c55e">${summary.passed}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Failed</div>
          <div class="stat-value" style="color: #ef4444">${summary.failed}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Pass Rate</div>
          <div class="stat-value">${summary.passRate.toFixed(1)}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">Duration</div>
          <div class="stat-value">${(summary.duration / 1000).toFixed(2)}s</div>
        </div>
      </div>
    </div>
    <div class="results">
      <h2 style="margin-bottom: 1rem;">Test Results</h2>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Environment</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${results
						.map(
							(r) => `
            <tr>
              <td>${this.escapeHtml(r.name)}</td>
              <td>${r.environment}</td>
              <td><span class="badge badge-${r.status}">${r.status}</span></td>
              <td>${(r.duration / 1000).toFixed(2)}s</td>
            </tr>
          `,
						)
						.join("")}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
	}

	/**
	 * Escape XML special characters
	 */
	private escapeXml(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	}

	/**
	 * Escape HTML special characters
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	/**
	 * Log a message
	 */
	private log(message: string): void {
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] ${message}`);
	}
}

export type { TestSuite, TestResult, OrchestratorConfig, TestEnvironment };
