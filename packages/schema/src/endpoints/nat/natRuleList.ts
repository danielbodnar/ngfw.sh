import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { natRule } from "./base";

export class NatRuleList extends OpenAPIRoute {
	schema = {
		tags: ["NAT"],
		summary: "List all NAT rules for a device",
		operationId: "nat-rule-list",
		security: [{ bearerAuth: [] }],
		request: {
			query: z.object({
				device_id: z
					.string() /* TODO: UUID validation */
					.optional(),
			}),
		},
		responses: {
			"200": {
				description: "List of NAT rules",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(natRule),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { device_id } = data.query;

		// Mock data for NAT rules
		const mockNatRules = [
			{
				id: "550e8400-e29b-41d4-a716-446655440001",
				name: "SSH Access",
				type: "port_forward" as const,
				enabled: true,
				protocol: "tcp" as const,
				source_zone: "WAN",
				source_address: "any",
				destination_zone: "LAN",
				destination_address: "192.168.1.100",
				external_port: "2222",
				internal_ip: "192.168.1.100",
				internal_port: "22",
				description: "Forward external SSH to internal server",
				owner_id: userId,
				device_id: device_id || "550e8400-e29b-41d4-a716-446655440000",
				created_at: Math.floor(Date.now() / 1000) - 86400 * 30,
				updated_at: Math.floor(Date.now() / 1000) - 86400 * 5,
			},
			{
				id: "550e8400-e29b-41d4-a716-446655440002",
				name: "Web Server",
				type: "port_forward" as const,
				enabled: true,
				protocol: "tcp" as const,
				source_zone: "WAN",
				source_address: "any",
				destination_zone: "LAN",
				destination_address: "192.168.1.50",
				external_port: "80,443",
				internal_ip: "192.168.1.50",
				internal_port: "80,443",
				description: "HTTP and HTTPS to web server",
				owner_id: userId,
				device_id: device_id || "550e8400-e29b-41d4-a716-446655440000",
				created_at: Math.floor(Date.now() / 1000) - 86400 * 60,
				updated_at: Math.floor(Date.now() / 1000) - 86400 * 10,
			},
			{
				id: "550e8400-e29b-41d4-a716-446655440003",
				name: "WAN Masquerade",
				type: "masquerade" as const,
				enabled: true,
				protocol: "all" as const,
				source_zone: "LAN",
				source_address: "192.168.1.0/24",
				destination_zone: "WAN",
				destination_address: "any",
				external_port: null,
				internal_ip: null,
				internal_port: null,
				description: "NAT masquerade for LAN to WAN traffic",
				owner_id: userId,
				device_id: device_id || "550e8400-e29b-41d4-a716-446655440000",
				created_at: Math.floor(Date.now() / 1000) - 86400 * 90,
				updated_at: Math.floor(Date.now() / 1000) - 86400 * 90,
			},
			{
				id: "550e8400-e29b-41d4-a716-446655440004",
				name: "Game Server",
				type: "port_forward" as const,
				enabled: false,
				protocol: "tcp_udp" as const,
				source_zone: "WAN",
				source_address: "any",
				destination_zone: "LAN",
				destination_address: "192.168.1.200",
				external_port: "25565",
				internal_ip: "192.168.1.200",
				internal_port: "25565",
				description: "Minecraft server port forwarding",
				owner_id: userId,
				device_id: device_id || "550e8400-e29b-41d4-a716-446655440000",
				created_at: Math.floor(Date.now() / 1000) - 86400 * 15,
				updated_at: Math.floor(Date.now() / 1000) - 86400 * 2,
			},
		];

		return {
			success: true,
			result: mockNatRules,
		};
	}
}
