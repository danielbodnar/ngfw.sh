import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { natProtocol, natRule, natRuleType } from "./base";

const updateBody = z.object({
	name: z.string().min(1).max(255).optional(),
	type: natRuleType.optional(),
	enabled: z.boolean().optional(),
	protocol: natProtocol.optional(),
	source_zone: z.string().min(1).max(50).optional(),
	source_address: z.string().min(1).max(255).optional(),
	destination_zone: z.string().min(1).max(50).optional(),
	destination_address: z.string().min(1).max(255).optional(),
	external_port: z.string().max(50).nullable().optional(),
	internal_ip: z.string().max(50).nullable().optional(),
	internal_port: z.string().max(50).nullable().optional(),
	description: z.string().max(500).nullable().optional(),
});

export class NatRuleUpdate extends OpenAPIRoute {
	schema = {
		tags: ["NAT"],
		summary: "Update a NAT rule",
		operationId: "nat-rule-update",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string() /* TODO: UUID validation */,
			}),
			body: contentJson(updateBody),
		},
		responses: {
			"200": {
				description: "NAT rule updated successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: natRule,
					}),
				),
			},
			"404": {
				description: "NAT rule not found or not owned by user",
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
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params;
		const body = data.body;

		// TODO: Fetch existing rule from D1 and verify ownership
		// TODO: Update rule in D1 database

		const now = Math.floor(Date.now() / 1000);

		// Mock updated rule
		const updatedRule = {
			id,
			name: body.name ?? "Updated NAT Rule",
			type: body.type ?? ("port_forward" as const),
			enabled: body.enabled ?? true,
			protocol: body.protocol ?? ("tcp" as const),
			source_zone: body.source_zone ?? "WAN",
			source_address: body.source_address ?? "any",
			destination_zone: body.destination_zone ?? "LAN",
			destination_address: body.destination_address ?? "192.168.1.100",
			external_port: body.external_port ?? "8080",
			internal_ip: body.internal_ip ?? "192.168.1.100",
			internal_port: body.internal_port ?? "80",
			description: body.description ?? null,
			owner_id: userId,
			device_id: "550e8400-e29b-41d4-a716-446655440000",
			created_at: now - 86400,
			updated_at: now,
		};

		return {
			success: true,
			result: updatedRule,
		};
	}
}
