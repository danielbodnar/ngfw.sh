/**
 * Core types for the integration test framework
 * @module types
 */

/**
 * Test environment configuration
 */
export interface TestEnvironmentConfig {
	/** Environment type */
	type: "local" | "docker" | "qemu";
	/** API server URL */
	apiUrl?: string;
	/** WebSocket URL */
	wsUrl?: string;
	/** Database connection */
	dbUrl?: string;
	/** Enable verbose logging */
	verbose?: boolean;
	/** Test timeout in ms */
	timeout?: number;
}

/**
 * Mock configuration options
 */
export interface MockConfig {
	/** Enable API server mock */
	api?: boolean;
	/** Enable agent client mock */
	agent?: boolean;
	/** Enable firmware adapter mock */
	firmware?: boolean;
	/** Enable storage mock */
	storage?: boolean;
	/** Enable authentication mock */
	auth?: boolean;
}

/**
 * Test isolation strategy
 */
export type IsolationStrategy =
	| "transaction" // Database transaction rollback
	| "namespace" // Separate KV/R2 namespaces
	| "cleanup" // Explicit cleanup after test
	| "process"; // Separate process per test

/**
 * Test lifecycle hooks
 */
export interface TestLifecycle {
	beforeAll?: () => Promise<void> | void;
	afterAll?: () => Promise<void> | void;
	beforeEach?: () => Promise<void> | void;
	afterEach?: () => Promise<void> | void;
}

/**
 * Test result metadata
 */
export interface TestResult {
	name: string;
	status: "passed" | "failed" | "skipped";
	duration: number;
	error?: Error;
	metadata?: Record<string, unknown>;
}

/**
 * Mock server state
 */
export interface MockServerState {
	authenticated: boolean;
	connections: Map<string, MockConnection>;
	messages: MockMessage[];
	latestStatus?: unknown;
	latestMetrics?: unknown;
}

/**
 * Mock WebSocket connection
 */
export interface MockConnection {
	id: string;
	deviceId: string;
	ownerId: string;
	authenticated: boolean;
	connectedAt: Date;
	lastMessageAt?: Date;
}

/**
 * Mock protocol message
 */
export interface MockMessage {
	id: string;
	type: string;
	payload: unknown;
	timestamp: Date;
	connectionId: string;
}

/**
 * Storage operation record
 */
export interface StorageOperation {
	type: "put" | "get" | "delete" | "list";
	store: "kv" | "d1" | "r2";
	key: string;
	value?: unknown;
	timestamp: Date;
}

/**
 * Test assertion result
 */
export interface AssertionResult {
	passed: boolean;
	message: string;
	actual?: unknown;
	expected?: unknown;
}

/**
 * Cleanup handler
 */
export type CleanupHandler = () => Promise<void> | void;

/**
 * Test context passed to test functions
 */
export interface TestContext {
	/** Test environment config */
	env: TestEnvironmentConfig;
	/** Mock instances */
	mocks: {
		api?: unknown;
		agent?: unknown;
		firmware?: unknown;
		storage?: unknown;
		auth?: unknown;
	};
	/** Cleanup handlers */
	cleanup: CleanupHandler[];
	/** Test metadata */
	metadata: Map<string, unknown>;
}

/**
 * Device test fixture
 */
export interface DeviceFixture {
	id: string;
	name: string;
	model: string | null;
	serial: string | null;
	owner_id: string;
	api_key: string;
	firmware_version: string | null;
	status: "provisioning" | "online" | "offline";
	created_at: number;
	last_seen: number | null;
}

/**
 * User test fixture
 */
export interface UserFixture {
	id: string;
	email: string;
	name: string;
	created_at: number;
	subscription_tier: "free" | "pro" | "enterprise";
}

/**
 * Metrics test fixture
 */
export interface MetricsFixture {
	uptime: number;
	cpu: number;
	memory: number;
	temperature: number | null;
	load: [number, number, number];
	connections: number;
	timestamp?: number;
}

/**
 * Network configuration fixture
 */
export interface NetworkConfigFixture {
	wan: {
		type: "dhcp" | "static" | "pppoe";
		ip?: string;
		gateway?: string;
		dns?: string[];
	};
	lan: {
		ip: string;
		netmask: string;
		dhcp_enabled: boolean;
		dhcp_range?: {
			start: string;
			end: string;
		};
	};
	wireless?: {
		ssid: string;
		security: "open" | "wpa2" | "wpa3";
		password?: string;
		channel: number;
	}[];
}

/**
 * Protocol message types
 */
export type ProtocolMessageType =
	| "AUTH"
	| "AUTH_OK"
	| "AUTH_ERROR"
	| "STATUS"
	| "METRICS"
	| "CONFIG_UPDATE"
	| "COMMAND"
	| "COMMAND_RESULT"
	| "PING"
	| "PONG"
	| "ERROR";

/**
 * Protocol message structure
 */
export interface ProtocolMessage<T = unknown> {
	id: string;
	type: ProtocolMessageType;
	payload: T;
}

/**
 * Authentication payload
 */
export interface AuthPayload {
	device_id: string;
	api_key: string;
	firmware_version?: string;
}

/**
 * Status payload
 */
export interface StatusPayload {
	online: boolean;
	uptime: number;
	firmware_version: string;
	wan_ip?: string;
	wan_connected: boolean;
}

/**
 * Test builder fluent API
 */
export interface TestBuilder {
	withEnvironment(config: Partial<TestEnvironmentConfig>): TestBuilder;
	withMocks(config: MockConfig): TestBuilder;
	withMockApi(): TestBuilder;
	withMockAgent(): TestBuilder;
	withMockFirmware(): TestBuilder;
	withMockStorage(): TestBuilder;
	withMockAuth(): TestBuilder;
	withIsolation(strategy: IsolationStrategy): TestBuilder;
	withCleanup(): TestBuilder;
	withTimeout(ms: number): TestBuilder;
	withLifecycle(hooks: TestLifecycle): TestBuilder;
	build(): TestEnvironment;
}

/**
 * Test environment instance
 */
export interface TestEnvironment {
	config: TestEnvironmentConfig;
	mocks: TestContext["mocks"];
	setup(): Promise<void>;
	teardown(): Promise<void>;
	cleanup(): Promise<void>;
	addCleanup(handler: CleanupHandler): void;
}
