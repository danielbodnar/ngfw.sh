/**
 * Mock implementations for integration testing
 * @module mocks
 */

export type { MockAgentConfig } from "./agent-client";
export { createMockAgentClient, MockAgentClient } from "./agent-client";
export type { MockApiServerConfig } from "./api-server";
export { createMockApiServer, MockApiServer } from "./api-server";
export type { FirmwareAdapterConfig } from "./firmware-adapter";
export {
	createMockFirmwareAdapter,
	MockDnsmasq,
	MockFirmwareAdapter,
	MockIptables,
	MockNVRAM,
	MockSystem,
	MockWireless,
} from "./firmware-adapter";
