import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { wanConfig } from "./base";

export class WanConfigRead extends OpenAPIRoute {
	schema = {
		tags: ["WAN"],
		summary: "Get WAN interface configuration",
		operationId: "wan-config-read",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "WAN configuration",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: wanConfig,
					}),
				),
			},
			"404": {
				description: "WAN configuration not found",
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
			interface: "eth0",
			connection_type: "dhcp" as const,
			enabled: true,
			ipv4_address: "203.0.113.10",
			ipv4_netmask: "255.255.255.0",
			ipv4_gateway: "203.0.113.1",
			ipv6_enabled: false,
			ipv6_address: null,
			ipv6_prefix_length: null,
			ipv6_gateway: null,
			dns_primary: "8.8.8.8",
			dns_secondary: "8.8.4.4",
			mtu: 1500,
			pppoe_username: null,
			pppoe_password: null,
			updated_at: Date.now(),
		};

		return {
			success: true,
			result: mockConfig,
		};
	}
}
