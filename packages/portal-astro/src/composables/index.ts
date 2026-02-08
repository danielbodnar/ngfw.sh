/**
 * Barrel export for all Vue composables.
 *
 * @module composables
 */

// Core
export { useApi } from './useApi';
export { useAuth } from './useAuth';
export { usePolling } from './usePolling';
export { useToast } from './useToast';
export { useSelectedDevice } from './useSelectedDevice';

// Fleet / Device Management
export { useDevices } from './useDevices';
export { useDeviceStatus } from './useDeviceStatus';
export { useRegisterDevice } from './useRegisterDevice';

// Network
export { useRoutes } from './useRoutes';
export { useNAT } from './useNAT';

// Security
export { useIPS } from './useIPS';

// Services
export { useVPNServer } from './useVPNServer';
export { useVPNClient } from './useVPNClient';
export { useQoS } from './useQoS';
export { useDDNS } from './useDDNS';

// Monitoring
export { useReports } from './useReports';
export { useLogs } from './useLogs';
export { useDashboards } from './useDashboards';

// Re-export types
export type { UseAuthReturn } from './useAuth';
export type { UsePollingReturn } from './usePolling';
export type { UseDevicesReturn } from './useDevices';
export type { UseDeviceStatusReturn } from './useDeviceStatus';
export type { UseRegisterDeviceReturn } from './useRegisterDevice';
export type { UseRoutesReturn } from './useRoutes';
export type { UseNATReturn } from './useNAT';
export type { UseIPSReturn } from './useIPS';
export type { UseVPNServerReturn } from './useVPNServer';
export type { UseVPNClientReturn } from './useVPNClient';
export type { UseQoSReturn } from './useQoS';
export type { UseDDNSReturn } from './useDDNS';
export type { UseReportsReturn } from './useReports';
export type { UseLogsReturn } from './useLogs';
export type { UseDashboardsReturn } from './useDashboards';
