import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { upnpLease } from "./base";

export class UpnpList extends OpenAPIRoute {
	schema = {
		tags: ["NAT"],
		summary: "List all active UPnP leases",
		operationId: "nat-upnp-list",
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
				description: "List of UPnP leases",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(upnpLease),
					}),
				),
			},
		},
	};

	async handle(_c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { device_id } = data.query;

		const now = Math.floor(Date.now() / 1000);

		// Mock data for UPnP leases
		const mockUpnpLeases = [
			{
				id: "660e8400-e29b-41d4-a716-446655440001",
				client_ip: "192.168.1.105",
				external_port: 54321,
				internal_port: 54321,
				protocol: "tcp" as const,
				description: "BitTorrent Client",
				device_id: device_id || "550e8400-e29b-41d4-a716-446655440000",
				expires_at: now + 3600,
				created_at: now - 1800,
			},
			{
				id: "660e8400-e29b-41d4-a716-446655440002",
				client_ip: "192.168.1.150",
				external_port: 3074,
				internal_port: 3074,
				protocol: "udp" as const,
				description: "Xbox Live",
				device_id: device_id || "550e8400-e29b-41d4-a716-446655440000",
				expires_at: now + 7200,
				created_at: now - 600,
			},
			{
				id: "660e8400-e29b-41d4-a716-446655440003",
				client_ip: "192.168.1.75",
				external_port: 5060,
				internal_port: 5060,
				protocol: "tcp" as const,
				description: "SIP VoIP Phone",
				device_id: device_id || "550e8400-e29b-41d4-a716-446655440000",
				expires_at: now + 1800,
				created_at: now - 300,
			},
			{
				id: "660e8400-e29b-41d4-a716-446655440004",
				client_ip: "192.168.1.120",
				external_port: 27015,
				internal_port: 27015,
				protocol: "udp" as const,
				description: "Steam Game Server",
				device_id: device_id || "550e8400-e29b-41d4-a716-446655440000",
				expires_at: now + 5400,
				created_at: now - 900,
			},
		];

		return {
			success: true,
			result: mockUpnpLeases,
		};
	}
}
