import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { wanConfig, wanConnectionType } from "./base";

const updateFields = z.object({
	interface: z.string().optional(),
	connection_type: wanConnectionType.optional(),
	enabled: z.boolean().optional(),
	ipv4_address: z.string().nullable().optional(),
	ipv4_netmask: z.string().nullable().optional(),
	ipv4_gateway: z.string().nullable().optional(),
	ipv6_enabled: z.boolean().optional(),
	ipv6_address: z.string().nullable().optional(),
	ipv6_prefix_length: z.number().int().min(0).max(128).nullable().optional(),
	ipv6_gateway: z.string().nullable().optional(),
	dns_primary: z.string().nullable().optional(),
	dns_secondary: z.string().nullable().optional(),
	mtu: z.number().int().min(576).max(9000).optional(),
	pppoe_username: z.string().nullable().optional(),
	pppoe_password: z.string().nullable().optional(),
});

export class WanConfigUpdate extends OpenAPIRoute {
	schema = {
		tags: ["WAN"],
		summary: "Update WAN interface configuration",
		operationId: "wan-config-update",
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
				description: "WAN configuration updated",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: wanConfig,
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
			interface: updates.interface ?? "eth0",
			connection_type: updates.connection_type ?? ("dhcp" as const),
			enabled: updates.enabled ?? true,
			ipv4_address: updates.ipv4_address ?? "203.0.113.10",
			ipv4_netmask: updates.ipv4_netmask ?? "255.255.255.0",
			ipv4_gateway: updates.ipv4_gateway ?? "203.0.113.1",
			ipv6_enabled: updates.ipv6_enabled ?? false,
			ipv6_address: updates.ipv6_address ?? null,
			ipv6_prefix_length: updates.ipv6_prefix_length ?? null,
			ipv6_gateway: updates.ipv6_gateway ?? null,
			dns_primary: updates.dns_primary ?? "8.8.8.8",
			dns_secondary: updates.dns_secondary ?? "8.8.4.4",
			mtu: updates.mtu ?? 1500,
			pppoe_username: updates.pppoe_username ?? null,
			pppoe_password: updates.pppoe_password ?? null,
			updated_at: Date.now(),
		};

		return {
			success: true,
			result: mockConfig,
		};
	}
}
