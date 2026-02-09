/**
 * Custom assertions for integration testing
 * @module assertions
 */

import type {
	AssertionResult,
	DeviceFixture,
	MetricsFixture,
	MockMessage,
	ProtocolMessage,
} from "../core/types";

/**
 * Base assertion class
 */
class Assertion {
	protected createResult(
		passed: boolean,
		message: string,
		actual?: unknown,
		expected?: unknown,
	): AssertionResult {
		return { passed, message, actual, expected };
	}

	protected fail(message: string, actual?: unknown, expected?: unknown): never {
		const error = new Error(message);
		(error as any).actual = actual;
		(error as any).expected = expected;
		throw error;
	}
}

/**
 * WebSocket protocol assertions
 */
export class WebSocketAssertions extends Assertion {
	/**
	 * Assert that a message has the expected type
	 */
	assertMessageType(
		message: MockMessage | ProtocolMessage,
		expectedType: string,
	): AssertionResult {
		if (message.type !== expectedType) {
			this.fail(
				`Expected message type ${expectedType}, got ${message.type}`,
				message.type,
				expectedType,
			);
		}
		return this.createResult(true, `Message type is ${expectedType}`);
	}

	/**
	 * Assert that a message payload contains specific fields
	 */
	assertMessagePayload(
		message: MockMessage | ProtocolMessage,
		expectedFields: Record<string, unknown>,
	): AssertionResult {
		const payload = message.payload as Record<string, unknown>;

		for (const [key, expectedValue] of Object.entries(expectedFields)) {
			if (!(key in payload)) {
				this.fail(
					`Expected payload to have field ${key}`,
					payload,
					expectedFields,
				);
			}

			if (expectedValue !== undefined && payload[key] !== expectedValue) {
				this.fail(
					`Expected payload.${key} to be ${expectedValue}, got ${payload[key]}`,
					payload[key],
					expectedValue,
				);
			}
		}

		return this.createResult(true, "Message payload contains expected fields");
	}

	/**
	 * Assert that authentication was successful
	 */
	assertAuthSuccess(message: MockMessage | ProtocolMessage): AssertionResult {
		this.assertMessageType(message, "AUTH_OK");

		const payload = message.payload as { success?: boolean };
		if (!payload.success) {
			this.fail("Expected auth success, but payload.success is false", payload);
		}

		return this.createResult(true, "Authentication successful");
	}

	/**
	 * Assert that authentication failed
	 */
	assertAuthFailure(message: MockMessage | ProtocolMessage): AssertionResult {
		this.assertMessageType(message, "AUTH_ERROR");

		const payload = message.payload as { success?: boolean; error?: string };
		if (payload.success !== false) {
			this.fail(
				"Expected auth failure, but payload.success is not false",
				payload,
			);
		}

		return this.createResult(true, `Authentication failed: ${payload.error}`);
	}

	/**
	 * Assert that messages were received in order
	 */
	assertMessageOrder(
		messages: MockMessage[],
		expectedTypes: string[],
	): AssertionResult {
		if (messages.length < expectedTypes.length) {
			this.fail(
				`Expected at least ${expectedTypes.length} messages, got ${messages.length}`,
				messages.length,
				expectedTypes.length,
			);
		}

		for (let i = 0; i < expectedTypes.length; i++) {
			if (messages[i].type !== expectedTypes[i]) {
				this.fail(
					`Expected message ${i} to be ${expectedTypes[i]}, got ${messages[i].type}`,
					messages[i].type,
					expectedTypes[i],
				);
			}
		}

		return this.createResult(true, "Messages received in expected order");
	}

	/**
	 * Assert that a message was received within a time window
	 */
	assertMessageTiming(message: MockMessage, maxAge: number): AssertionResult {
		const age = Date.now() - message.timestamp.getTime();

		if (age > maxAge) {
			this.fail(`Message is too old: ${age}ms (max ${maxAge}ms)`, age, maxAge);
		}

		return this.createResult(true, `Message received within ${maxAge}ms`);
	}
}

/**
 * State assertions
 */
export class StateAssertions extends Assertion {
	/**
	 * Assert that a device has the expected status
	 */
	assertDeviceStatus(
		device: DeviceFixture,
		expectedStatus: DeviceFixture["status"],
	): AssertionResult {
		if (device.status !== expectedStatus) {
			this.fail(
				`Expected device status ${expectedStatus}, got ${device.status}`,
				device.status,
				expectedStatus,
			);
		}

		return this.createResult(true, `Device status is ${expectedStatus}`);
	}

	/**
	 * Assert that a device is online
	 */
	assertDeviceOnline(device: DeviceFixture): AssertionResult {
		return this.assertDeviceStatus(device, "online");
	}

	/**
	 * Assert that a device is offline
	 */
	assertDeviceOffline(device: DeviceFixture): AssertionResult {
		return this.assertDeviceStatus(device, "offline");
	}

	/**
	 * Assert that a device was seen recently
	 */
	assertDeviceRecentlySeen(
		device: DeviceFixture,
		maxAge: number = 60000,
	): AssertionResult {
		if (!device.last_seen) {
			this.fail(
				"Device has never been seen",
				device.last_seen,
				"recent timestamp",
			);
		}

		const age = Date.now() - device.last_seen;
		if (age > maxAge) {
			this.fail(`Device last seen ${age}ms ago (max ${maxAge}ms)`, age, maxAge);
		}

		return this.createResult(true, `Device seen within ${maxAge}ms`);
	}

	/**
	 * Assert that metrics are within expected ranges
	 */
	assertMetricsInRange(
		metrics: MetricsFixture,
		ranges: {
			cpu?: [number, number];
			memory?: [number, number];
			temperature?: [number, number];
			connections?: [number, number];
		},
	): AssertionResult {
		if (ranges.cpu) {
			const [min, max] = ranges.cpu;
			if (metrics.cpu < min || metrics.cpu > max) {
				this.fail(
					`CPU usage ${metrics.cpu}% is outside range [${min}, ${max}]`,
					metrics.cpu,
					ranges.cpu,
				);
			}
		}

		if (ranges.memory) {
			const [min, max] = ranges.memory;
			if (metrics.memory < min || metrics.memory > max) {
				this.fail(
					`Memory usage ${metrics.memory}% is outside range [${min}, ${max}]`,
					metrics.memory,
					ranges.memory,
				);
			}
		}

		if (ranges.temperature && metrics.temperature) {
			const [min, max] = ranges.temperature;
			if (metrics.temperature < min || metrics.temperature > max) {
				this.fail(
					`Temperature ${metrics.temperature}°C is outside range [${min}, ${max}]`,
					metrics.temperature,
					ranges.temperature,
				);
			}
		}

		if (ranges.connections) {
			const [min, max] = ranges.connections;
			if (metrics.connections < min || metrics.connections > max) {
				this.fail(
					`Connections ${metrics.connections} is outside range [${min}, ${max}]`,
					metrics.connections,
					ranges.connections,
				);
			}
		}

		return this.createResult(true, "Metrics are within expected ranges");
	}

	/**
	 * Assert that system is idle
	 */
	assertSystemIdle(metrics: MetricsFixture): AssertionResult {
		return this.assertMetricsInRange(metrics, {
			cpu: [0, 20],
			memory: [0, 40],
			temperature: [0, 60],
		});
	}

	/**
	 * Assert that system is under load
	 */
	assertSystemUnderLoad(metrics: MetricsFixture): AssertionResult {
		return this.assertMetricsInRange(metrics, {
			cpu: [50, 100],
			memory: [50, 100],
		});
	}
}

/**
 * Storage assertions
 */
export class StorageAssertions extends Assertion {
	/**
	 * Assert that a key exists in storage
	 */
	assertKeyExists(storage: Map<string, unknown>, key: string): AssertionResult {
		if (!storage.has(key)) {
			this.fail(`Expected key ${key} to exist in storage`, undefined, key);
		}

		return this.createResult(true, `Key ${key} exists in storage`);
	}

	/**
	 * Assert that a key does not exist in storage
	 */
	assertKeyNotExists(
		storage: Map<string, unknown>,
		key: string,
	): AssertionResult {
		if (storage.has(key)) {
			this.fail(
				`Expected key ${key} to not exist in storage`,
				storage.get(key),
				undefined,
			);
		}

		return this.createResult(true, `Key ${key} does not exist in storage`);
	}

	/**
	 * Assert that storage contains expected value
	 */
	assertStorageValue(
		storage: Map<string, unknown>,
		key: string,
		expectedValue: unknown,
	): AssertionResult {
		this.assertKeyExists(storage, key);

		const actualValue = storage.get(key);
		if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
			this.fail(
				`Expected storage[${key}] to be ${JSON.stringify(expectedValue)}`,
				actualValue,
				expectedValue,
			);
		}

		return this.createResult(
			true,
			`Storage contains expected value for ${key}`,
		);
	}

	/**
	 * Assert that storage is empty
	 */
	assertStorageEmpty(storage: Map<string, unknown>): AssertionResult {
		if (storage.size > 0) {
			this.fail(
				`Expected storage to be empty, but it has ${storage.size} keys`,
				storage.size,
				0,
			);
		}

		return this.createResult(true, "Storage is empty");
	}

	/**
	 * Assert that storage has expected size
	 */
	assertStorageSize(
		storage: Map<string, unknown>,
		expectedSize: number,
	): AssertionResult {
		if (storage.size !== expectedSize) {
			this.fail(
				`Expected storage size to be ${expectedSize}, got ${storage.size}`,
				storage.size,
				expectedSize,
			);
		}

		return this.createResult(true, `Storage has ${expectedSize} keys`);
	}
}

/**
 * Timing assertions
 */
export class TimingAssertions extends Assertion {
	/**
	 * Assert that an operation completed within a time limit
	 */
	async assertCompletesWithin<T>(
		operation: () => Promise<T>,
		maxDuration: number,
	): Promise<T> {
		const startTime = Date.now();

		const result = await operation();

		const duration = Date.now() - startTime;
		if (duration > maxDuration) {
			this.fail(
				`Operation took ${duration}ms (max ${maxDuration}ms)`,
				duration,
				maxDuration,
			);
		}

		return result;
	}

	/**
	 * Assert that an operation takes at least a minimum time
	 */
	async assertTakesAtLeast<T>(
		operation: () => Promise<T>,
		minDuration: number,
	): Promise<T> {
		const startTime = Date.now();

		const result = await operation();

		const duration = Date.now() - startTime;
		if (duration < minDuration) {
			this.fail(
				`Operation took ${duration}ms (min ${minDuration}ms)`,
				duration,
				minDuration,
			);
		}

		return result;
	}

	/**
	 * Assert that operations happen at expected intervals
	 */
	assertIntervals(
		timestamps: number[],
		expectedInterval: number,
		tolerance: number = 100,
	): AssertionResult {
		if (timestamps.length < 2) {
			this.fail(
				"Need at least 2 timestamps to check intervals",
				timestamps.length,
				2,
			);
		}

		for (let i = 1; i < timestamps.length; i++) {
			const interval = timestamps[i] - timestamps[i - 1];
			const diff = Math.abs(interval - expectedInterval);

			if (diff > tolerance) {
				this.fail(
					`Interval ${i} is ${interval}ms (expected ${expectedInterval}ms ± ${tolerance}ms)`,
					interval,
					expectedInterval,
				);
			}
		}

		return this.createResult(
			true,
			`All intervals are within ${tolerance}ms of ${expectedInterval}ms`,
		);
	}
}

/**
 * Pre-configured assertion instances
 */
export const wsAssertions = new WebSocketAssertions();
export const stateAssertions = new StateAssertions();
export const storageAssertions = new StorageAssertions();
export const timingAssertions = new TimingAssertions();
