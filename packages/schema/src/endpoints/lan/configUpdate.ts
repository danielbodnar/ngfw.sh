import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { lanConfig } from "./base";

const updateFields = z.object({
	interface: z.string().optional(),
	enabled: z.boolean().optional(),
	ipv4_address: z.string().optional(),
	ipv4_netmask: z.string().optional(),
	ipv6_enabled: z.boolean().optional(),
	ipv6_address: z.string().nullable().optional(),
	ipv6_prefix_length: z.number().int().min(0).max(128).nullable().optional(),
	dhcp_enabled: z.boolean().optional(),
	vlan_id: z.number().int().min(1).max(4094).nullable().optional(),
	bridge_interfaces: z.string().nullable().optional(),
});

export class LanConfigUpdate extends OpenAPIRoute {
	schema = {
		tags: ["LAN"],
		summary: "Update LAN interface configuration",
		operationId: "lan-config-update",
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
				description: "LAN configuration updated",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: lanConfig,
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
			ipv4_address: updates.ipv4_address ?? "192.168.1.1",
			ipv4_netmask: updates.ipv4_netmask ?? "255.255.255.0",
			ipv6_enabled: updates.ipv6_enabled ?? false,
			ipv6_address: updates.ipv6_address ?? null,
			ipv6_prefix_length: updates.ipv6_prefix_length ?? null,
			dhcp_enabled: updates.dhcp_enabled ?? true,
			vlan_id: updates.vlan_id ?? null,
			bridge_interfaces: updates.bridge_interfaces ?? "eth1,eth2,eth3,eth4",
			updated_at: Date.now(),
		};

		return {
			success: true,
			result: mockConfig,
		};
	}
}
