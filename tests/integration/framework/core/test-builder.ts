/**
 * Fluent API for building integration test environments
 * @module test-builder
 */

import type {
  TestBuilder as ITestBuilder,
  TestEnvironment,
  TestEnvironmentConfig,
  MockConfig,
  IsolationStrategy,
  TestLifecycle,
  CleanupHandler,
  TestContext,
} from './types';

/**
 * Default test environment configuration
 */
const DEFAULT_CONFIG: TestEnvironmentConfig = {
  type: 'local',
  apiUrl: 'http://localhost:8787',
  wsUrl: 'ws://localhost:8787/agent/ws',
  verbose: false,
  timeout: 30000,
};

/**
 * Test environment implementation
 */
class TestEnvironmentImpl implements TestEnvironment {
  public config: TestEnvironmentConfig;
  public mocks: TestContext['mocks'] = {};
  private cleanupHandlers: CleanupHandler[] = [];
  private lifecycle?: TestLifecycle;
  private isolationStrategy?: IsolationStrategy;

  constructor(
    config: TestEnvironmentConfig,
    mocks: TestContext['mocks'],
    lifecycle?: TestLifecycle,
    isolationStrategy?: IsolationStrategy,
  ) {
    this.config = config;
    this.mocks = mocks;
    this.lifecycle = lifecycle;
    this.isolationStrategy = isolationStrategy;
  }

  async setup(): Promise<void> {
    if (this.lifecycle?.beforeAll) {
      await this.lifecycle.beforeAll();
    }
    if (this.lifecycle?.beforeEach) {
      await this.lifecycle.beforeEach();
    }
  }

  async teardown(): Promise<void> {
    if (this.lifecycle?.afterEach) {
      await this.lifecycle.afterEach();
    }
    if (this.lifecycle?.afterAll) {
      await this.lifecycle.afterAll();
    }
  }

  async cleanup(): Promise<void> {
    for (const handler of this.cleanupHandlers.reverse()) {
      try {
        await handler();
      } catch (error) {
        if (this.config.verbose) {
          console.error('Cleanup handler failed:', error);
        }
      }
    }
    this.cleanupHandlers = [];
  }

  addCleanup(handler: CleanupHandler): void {
    this.cleanupHandlers.push(handler);
  }
}

/**
 * Fluent test builder implementation
 */
export class IntegrationTestBuilder implements ITestBuilder {
  private config: TestEnvironmentConfig = { ...DEFAULT_CONFIG };
  private mockConfig: MockConfig = {};
  private lifecycle?: TestLifecycle;
  private isolationStrategy?: IsolationStrategy;
  private autoCleanup = false;

  /**
   * Set custom environment configuration
   */
  withEnvironment(envConfig: Partial<TestEnvironmentConfig>): this {
    this.config = { ...this.config, ...envConfig };
    return this;
  }

  /**
   * Configure which mocks to enable
   */
  withMocks(config: MockConfig): this {
    this.mockConfig = { ...this.mockConfig, ...config };
    return this;
  }

  /**
   * Enable API server mock
   */
  withMockApi(): this {
    this.mockConfig.api = true;
    return this;
  }

  /**
   * Enable agent client mock
   */
  withMockAgent(): this {
    this.mockConfig.agent = true;
    return this;
  }

  /**
   * Enable firmware adapter mock
   */
  withMockFirmware(): this {
    this.mockConfig.firmware = true;
    return this;
  }

  /**
   * Enable storage mock
   */
  withMockStorage(): this {
    this.mockConfig.storage = true;
    return this;
  }

  /**
   * Enable authentication mock
   */
  withMockAuth(): this {
    this.mockConfig.auth = true;
    return this;
  }

  /**
   * Set test isolation strategy
   */
  withIsolation(strategy: IsolationStrategy): this {
    this.isolationStrategy = strategy;
    return this;
  }

  /**
   * Enable automatic cleanup after tests
   */
  withCleanup(): this {
    this.autoCleanup = true;
    return this;
  }

  /**
   * Set test timeout
   */
  withTimeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }

  /**
   * Set lifecycle hooks
   */
  withLifecycle(hooks: TestLifecycle): this {
    this.lifecycle = hooks;
    return this;
  }

  /**
   * Build the test environment
   */
  build(): TestEnvironment {
    const mocks: TestContext['mocks'] = {};

    // Initialize mocks based on configuration
    if (this.mockConfig.api) {
      mocks.api = this.createApiMock();
    }
    if (this.mockConfig.agent) {
      mocks.agent = this.createAgentMock();
    }
    if (this.mockConfig.firmware) {
      mocks.firmware = this.createFirmwareMock();
    }
    if (this.mockConfig.storage) {
      mocks.storage = this.createStorageMock();
    }
    if (this.mockConfig.auth) {
      mocks.auth = this.createAuthMock();
    }

    const env = new TestEnvironmentImpl(
      this.config,
      mocks,
      this.lifecycle,
      this.isolationStrategy,
    );

    // Add cleanup handler if auto-cleanup is enabled
    if (this.autoCleanup) {
      env.addCleanup(async () => {
        if (this.config.verbose) {
          console.log('Running automatic cleanup...');
        }
        await this.performCleanup(mocks);
      });
    }

    return env;
  }

  /**
   * Create API server mock
   * Actual implementation imported from mocks module
   */
  private createApiMock(): unknown {
    return {
      type: 'api-mock',
      url: this.config.apiUrl,
      wsUrl: this.config.wsUrl,
    };
  }

  /**
   * Create agent client mock
   */
  private createAgentMock(): unknown {
    return {
      type: 'agent-mock',
      connected: false,
    };
  }

  /**
   * Create firmware adapter mock
   */
  private createFirmwareMock(): unknown {
    return {
      type: 'firmware-mock',
      adapters: {
        iptables: true,
        dnsmasq: true,
        wifi: false,
        wireguard: true,
        system: true,
      },
    };
  }

  /**
   * Create storage mock
   */
  private createStorageMock(): unknown {
    return {
      type: 'storage-mock',
      data: {
        kv: new Map(),
        d1: new Map(),
        r2: new Map(),
      },
    };
  }

  /**
   * Create authentication mock
   */
  private createAuthMock(): unknown {
    return {
      type: 'auth-mock',
      users: new Map(),
      sessions: new Map(),
    };
  }

  /**
   * Perform cleanup operations
   */
  private async performCleanup(mocks: TestContext['mocks']): Promise<void> {
    if (mocks.storage) {
      const storage = mocks.storage as {
        data: {
          kv: Map<string, unknown>;
          d1: Map<string, unknown>;
          r2: Map<string, unknown>;
        };
      };
      storage.data.kv.clear();
      storage.data.d1.clear();
      storage.data.r2.clear();
    }

    if (mocks.auth) {
      const auth = mocks.auth as {
        users: Map<string, unknown>;
        sessions: Map<string, unknown>;
      };
      auth.users.clear();
      auth.sessions.clear();
    }
  }
}

/**
 * Create a new test builder instance
 */
export function createTestBuilder(): IntegrationTestBuilder {
  return new IntegrationTestBuilder();
}
