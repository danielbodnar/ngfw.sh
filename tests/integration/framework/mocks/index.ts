/**
 * Mock implementations for integration testing
 * @module mocks
 */

export { MockApiServer, createMockApiServer } from './api-server';
export { MockAgentClient, createMockAgentClient } from './agent-client';
export {
  MockFirmwareAdapter,
  MockNVRAM,
  MockIptables,
  MockDnsmasq,
  MockWireless,
  MockSystem,
  createMockFirmwareAdapter,
} from './firmware-adapter';

export type { MockApiServerConfig } from './api-server';
export type { MockAgentConfig } from './agent-client';
export type { FirmwareAdapterConfig } from './firmware-adapter';
