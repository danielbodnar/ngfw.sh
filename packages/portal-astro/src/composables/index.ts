/**
 * Barrel export for all Vue composables.
 *
 * @module composables
 */

// Core
export { useApi } from "./useApi";
// Re-export types
export type { UseAuthReturn } from "./useAuth";
export { useAuth } from "./useAuth";
export type { UseDashboardsReturn } from "./useDashboards";
export { useDashboards } from "./useDashboards";
export type { UseDDNSReturn } from "./useDDNS";
export { useDDNS } from "./useDDNS";
export type { UseDeviceStatusReturn } from "./useDeviceStatus";
export { useDeviceStatus } from "./useDeviceStatus";
export type { UseDevicesReturn } from "./useDevices";
// Fleet / Device Management
export { useDevices } from "./useDevices";
export type { UseIPSReturn } from "./useIPS";
// Security
export { useIPS } from "./useIPS";
export type { UseLogsReturn } from "./useLogs";
export { useLogs } from "./useLogs";
export type { UseNATReturn } from "./useNAT";
export { useNAT } from "./useNAT";
export type { UsePollingReturn } from "./usePolling";
export { usePolling } from "./usePolling";
export type { UseQoSReturn } from "./useQoS";
export { useQoS } from "./useQoS";
export type { UseRegisterDeviceReturn } from "./useRegisterDevice";
export { useRegisterDevice } from "./useRegisterDevice";
export type { UseReportsReturn } from "./useReports";
// Monitoring
export { useReports } from "./useReports";
export type { UseRoutesReturn } from "./useRoutes";
// Network
export { useRoutes } from "./useRoutes";
export { useSelectedDevice } from "./useSelectedDevice";
export { useToast } from "./useToast";
export type { UseVPNClientReturn } from "./useVPNClient";
export { useVPNClient } from "./useVPNClient";
export type { UseVPNServerReturn } from "./useVPNServer";
// Services
export { useVPNServer } from "./useVPNServer";
