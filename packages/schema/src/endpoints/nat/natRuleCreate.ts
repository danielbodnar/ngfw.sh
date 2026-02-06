import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { natRule, natRuleType, natProtocol } from "./base";

const createBody = z.object({
	name: z.string().min(1).max(255),
	type: natRuleType,
	enabled: z.boolean().default(true),
	protocol: natProtocol,
	source_zone: z.string().min(1).max(50),
	source_address: z.string().min(1).max(255),
	destination_zone: z.string().min(1).max(50),
	destination_address: z.string().min(1).max(255),
	external_port: z.string().max(50).nullable().optional(),
	internal_ip: z.string().max(50).nullable().optional(),
	internal_port: z.string().max(50).nullable().optional(),
	description: z.string().max(500).nullable().optional(),
	device_id: z.string().uuid(),
});

export class NatRuleCreate extends OpenAPIRoute {
	schema = {
		tags: ["NAT"],
		summary: "Create a new NAT rule",
		operationId: "nat-rule-create",
		security: [{ bearerAuth: [] }],
		request: {
			body: contentJson(createBody),
		},
		responses: {
			"201": {
				description: "NAT rule created successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: natRule,
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		const ruleRecord = {
			id,
			name: body.name,
			type: body.type,
			enabled: body.enabled,
			protocol: body.protocol,
			source_zone: body.source_zone,
			source_address: body.source_address,
			destination_zone: body.destination_zone,
			destination_address: body.destination_address,
			external_port: body.external_port ?? null,
			internal_ip: body.internal_ip ?? null,
			internal_port: body.internal_port ?? null,
			description: body.description ?? null,
			owner_id: userId,
			device_id: body.device_id,
			created_at: now,
			updated_at: now,
		};

		// TODO: Insert into D1 database when schema is ready
		// await db.prepare(
		//   "INSERT INTO nat_rules (id, name, type, enabled, protocol, source_zone, source_address, destination_zone, destination_address, external_port, internal_ip, internal_port, description, owner_id, device_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
		// ).bind(...).run();

		return new Response(
			JSON.stringify({
				success: true,
				result: ruleRecord,
			}),
			{ status: 201, headers: { "Content-Type": "application/json" } },
		);
	}
}
