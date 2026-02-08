import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { dhcpConfig } from "./base";

export class DhcpConfigRead extends OpenAPIRoute {
	schema = {
		tags: ["DHCP"],
		summary: "Get DHCP server configuration",
		operationId: "dhcp-config-read",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "DHCP configuration",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: dhcpConfig,
					}),
				),
			},
			"404": {
				description: "DHCP configuration not found",
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
			start_ip: "192.168.1.100",
			end_ip: "192.168.1.200",
			subnet_mask: "255.255.255.0",
			gateway: "192.168.1.1",
			dns_primary: "192.168.1.1",
			dns_secondary: "8.8.8.8",
			lease_time: 86400,
			domain_name: "lan",
			updated_at: Date.now(),
		};

		return {
			success: true,
			result: mockConfig,
		};
	}
}
