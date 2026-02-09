/**
 * Integration test framework for ngfw.sh
 * Comprehensive testing infrastructure for all system boundaries
 * @module framework
 */

// Core exports
export * from './core/types';
export { IntegrationTestBuilder, createTestBuilder } from './core/test-builder';

// Mock exports
export { MockApiServer, createMockApiServer } from './mocks/api-server';
export { MockAgentClient, createMockAgentClient } from './mocks/agent-client';
export { MockFirmwareAdapter, createMockFirmwareAdapter } from './mocks/firmware-adapter';

// Fixture exports
export {
  DeviceFixtureBuilder,
  UserFixtureBuilder,
  MetricsFixtureBuilder,
  NetworkConfigFixtureBuilder,
  deviceFixture,
  userFixture,
  metricsFixture,
  networkConfigFixture,
} from './fixtures';

// Assertion exports
export {
  WebSocketAssertions,
  StateAssertions,
  StorageAssertions,
  TimingAssertions,
  wsAssertions,
  stateAssertions,
  storageAssertions,
  timingAssertions,
} from './assertions';

// Isolation exports
export {
  IsolationManager,
  TransactionIsolation,
  NamespaceIsolation,
  WebSocketIsolation,
  ProcessIsolation,
  ResourceTracker,
  createIsolationManager,
} from './isolation';

/**
 * Framework version
 */
export const VERSION = '1.0.0';

/**
 * Quick-start helper for common test scenarios
 */
export class TestScenarios {
  /**
   * Create a complete API<->Agent integration test environment
   */
  static apiAgentTest() {
    const { IntegrationTestBuilder } = require('./core/test-builder');
    return new IntegrationTestBuilder()
      .withMockApi()
      .withMockAgent()
      .withCleanup()
      .withTimeout(30000);
  }

  /**
   * Create a complete Agent<->Firmware integration test environment
   */
  static agentFirmwareTest() {
    const { IntegrationTestBuilder } = require('./core/test-builder');
    return new IntegrationTestBuilder()
      .withMockFirmware()
      .withCleanup()
      .withTimeout(15000);
  }

  /**
   * Create a complete UI<->API integration test environment
   */
  static uiApiTest() {
    const { IntegrationTestBuilder } = require('./core/test-builder');
    return new IntegrationTestBuilder()
      .withMockApi()
      .withMockAuth()
      .withCleanup()
      .withTimeout(20000);
  }

  /**
   * Create a storage layer integration test environment
   */
  static storageTest() {
    const { IntegrationTestBuilder } = require('./core/test-builder');
    return new IntegrationTestBuilder()
      .withMockStorage()
      .withIsolation('namespace')
      .withCleanup()
      .withTimeout(10000);
  }

  /**
   * Create an end-to-end test environment
   */
  static e2eTest() {
    const { IntegrationTestBuilder } = require('./core/test-builder');
    return new IntegrationTestBuilder()
      .withMocks({
        api: true,
        agent: true,
        firmware: true,
        storage: true,
        auth: true,
      })
      .withCleanup()
      .withTimeout(60000);
  }
}

/**
 * Test utilities
 */
export class TestUtils {
  /**
   * Wait for a condition to be true
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      message?: string;
    } = {},
  ): Promise<void> {
    const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`${message} (timeout after ${timeout}ms)`);
  }

  /**
   * Retry an operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
    } = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
    } = options;

    let lastError: Error | undefined;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt === maxAttempts) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Generate a random string
   */
  static randomString(length = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a random port number
   */
  static randomPort(): number {
    return Math.floor(Math.random() * (65535 - 1024)) + 1024;
  }

  /**
   * Sleep for a specified duration
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a deferred promise
   */
  static deferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  } {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  }
}

/**
 * Export test scenarios and utilities
 */
export { TestScenarios, TestUtils };
