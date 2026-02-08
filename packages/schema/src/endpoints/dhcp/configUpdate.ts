import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { dhcpConfig } from "./base";

const updateFields = z.object({
	interface: z.string().optional(),
	enabled: z.boolean().optional(),
	start_ip: z.string().optional(),
	end_ip: z.string().optional(),
	subnet_mask: z.string().optional(),
	gateway: z.string().optional(),
	dns_primary: z.string().optional(),
	dns_secondary: z.string().nullable().optional(),
	lease_time: z.number().int().min(60).optional(),
	domain_name: z.string().nullable().optional(),
});

export class DhcpConfigUpdate extends OpenAPIRoute {
	schema = {
		tags: ["DHCP"],
		summary: "Update DHCP server configuration",
		operationId: "dhcp-config-update",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: updateFields,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "DHCP configuration updated",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: dhcpConfig,
					}),
				),
			},
			"400": {
				description: "Invalid request",
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
		const data = await this.getValidatedData<typeof this.schema>();
		const _userId = c.get("userId");
		const updates = data.body;

		if (Object.keys(updates).length === 0) {
			return c.json({ success: false, error: "No fields to update" }, 400);
		}

		// Mock response - in production, this would update via RPC
		const mockConfig = {
			id: 1,
			interface: updates.interface ?? "br-lan",
			enabled: updates.enabled ?? true,
			start_ip: updates.start_ip ?? "192.168.1.100",
			end_ip: updates.end_ip ?? "192.168.1.200",
			subnet_mask: updates.subnet_mask ?? "255.255.255.0",
			gateway: updates.gateway ?? "192.168.1.1",
			dns_primary: updates.dns_primary ?? "192.168.1.1",
			dns_secondary: updates.dns_secondary ?? "8.8.8.8",
			lease_time: updates.lease_time ?? 86400,
			domain_name: updates.domain_name ?? "lan",
			updated_at: Date.now(),
		};

		return {
			success: true,
			result: mockConfig,
		};
	}
}
