import { z } from "zod";

/**
 * WireGuard VPN server configuration
 */
export const vpnServerConfig = z.object({
	enabled: z.boolean().default(false).describe("Enable WireGuard VPN server"),
	listen_port: z.number().int().min(1).max(65535).default(51820).describe("UDP port for WireGuard"),
	network: z.string().describe("VPN network in CIDR notation (e.g., 10.0.0.0/24)"),
	public_key: z.string().describe("Server public key (base64)"),
	private_key: z.string().describe("Server private key (base64) - never returned in GET"),
	dns: z.array(z.string()).optional().describe("DNS servers for VPN clients"), // TODO: Add IP validation with z.string().regex() in Zod 4
	mtu: z.number().int().min(1280).max(1500).default(1420).optional().describe("MTU for WireGuard interface"),
	persistent_keepalive: z.number().int().min(0).max(65535).default(25).optional().describe("Persistent keepalive interval in seconds"),
});

/**
 * Public WireGuard server configuration (without private_key)
 */
export const vpnServerConfigPublic = vpnServerConfig.omit({ private_key: true });

/**
 * WireGuard VPN peer configuration
 */
export const vpnServerPeer = z.object({
	id: z.string().describe("Peer ID"),
	name: z.string().min(1).max(64).describe("Peer name (e.g., 'Phone', 'Laptop')"),
	public_key: z.string().describe("Peer public key (base64)"),
	preshared_key: z.string().optional().describe("Optional preshared key for additional security (base64)"),
	allowed_ips: z.array(z.string()).describe("IP addresses allowed for this peer (e.g., ['10.0.0.2/32'])"),
	endpoint: z.string().optional().describe("Peer endpoint (IP:port) - usually not set for road warrior configs"),
	persistent_keepalive: z.number().int().min(0).max(65535).default(25).describe("Keepalive interval in seconds"),
	enabled: z.boolean().default(true).describe("Enable this peer"),
	created_at: z.number().int().describe("Creation timestamp"),
	last_handshake: z.number().int().nullable().optional().describe("Last successful handshake timestamp"),
	rx_bytes: z.number().int().optional().describe("Received bytes"),
	tx_bytes: z.number().int().optional().describe("Transmitted bytes"),
});

/**
 * Request schema for updating VPN server config
 */
export const vpnServerConfigUpdate = vpnServerConfig.partial();

/**
 * Request schema for creating a VPN peer
 */
export const vpnServerPeerCreate = vpnServerPeer.omit({
	id: true,
	created_at: true,
	last_handshake: true,
	rx_bytes: true,
	tx_bytes: true
});

/**
 * Request schema for updating a VPN peer
 */
export const vpnServerPeerUpdate = vpnServerPeer.partial().omit({
	id: true,
	created_at: true,
	last_handshake: true,
	rx_bytes: true,
	tx_bytes: true
});
