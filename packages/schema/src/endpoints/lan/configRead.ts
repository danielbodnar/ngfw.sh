import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { lanConfig } from "./base";

export class LanConfigRead extends OpenAPIRoute {
	schema = {
		tags: ["LAN"],
		summary: "Get LAN interface configuration",
		operationId: "lan-config-read",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "LAN configuration",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: lanConfig,
					}),
				),
			},
			"404": {
				description: "LAN configuration not found",
				...contentJson(
					z.object({
						success: z.boolean(),
						error: z.string(),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");

		// Mock data for now - in production, this would query the device via RPC
		const mockConfig = {
			id: 1,
			interface: "br-lan",
			enabled: true,
			ipv4_address: "192.168.1.1",
			ipv4_netmask: "255.255.255.0",
			ipv6_enabled: false,
			ipv6_address: null,
			ipv6_prefix_length: null,
			dhcp_enabled: true,
			vlan_id: null,
			bridge_interfaces: "eth1,eth2,eth3,eth4",
			updated_at: Date.now(),
		};

		return {
			success: true,
			result: mockConfig,
		};
	}
}
