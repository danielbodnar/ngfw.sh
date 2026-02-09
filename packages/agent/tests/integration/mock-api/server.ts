// Mock API WebSocket server for NGFW agent integration testing
import { randomUUID } from "crypto";

const TEST_DEVICE_ID = "test-device-001";
const TEST_API_KEY = "test-api-key-secret-001";
const TEST_OWNER_ID = "test-owner-001";

let latestStatus: any = null;
let latestMetrics: any = null;
let authenticated = false;

const server = Bun.serve({
	port: 8787,

	async fetch(req, server) {
		const url = new URL(req.url);

		// Health check endpoint
		if (url.pathname === "/health") {
			return Response.json({ status: "ok" });
		}

		// Status endpoint for test assertions
		if (url.pathname === "/status") {
			return Response.json({
				authenticated,
				latestStatus,
				latestMetrics,
			});
		}

		// WebSocket upgrade
		if (url.pathname === "/agent/ws") {
			const deviceId = url.searchParams.get("device_id");
			const ownerId = url.searchParams.get("owner_id");

			if (server.upgrade(req, { data: { deviceId, ownerId } })) {
				return; // Connection upgraded
			}
			return new Response("WebSocket upgrade failed", { status: 400 });
		}

		return new Response("Not found", { status: 404 });
	},

	websocket: {
		open(ws) {
			console.log(
				`[WebSocket] Connection opened from device: ${ws.data.deviceId}`,
			);
		},

		message(ws, message) {
			try {
				const msg = JSON.parse(message.toString());
				const timestamp = new Date().toISOString();

				console.log(`[${timestamp}] Received: ${msg.type}`, msg.payload);

				switch (msg.type) {
					case "AUTH": {
						const { device_id, api_key, firmware_version } = msg.payload;

						if (device_id === TEST_DEVICE_ID && api_key === TEST_API_KEY) {
							authenticated = true;
							const response = {
								id: randomUUID(),
								type: "AUTH_OK",
								payload: {
									success: true,
									server_time: Date.now(),
								},
							};
							ws.send(JSON.stringify(response));
							console.log(
								`[${timestamp}] AUTH_OK sent for device ${device_id}`,
							);
						} else {
							const response = {
								id: randomUUID(),
								type: "AUTH_ERROR",
								payload: {
									success: false,
									error: "Invalid credentials",
								},
							};
							ws.send(JSON.stringify(response));
							console.log(`[${timestamp}] AUTH_ERROR: invalid credentials`);
						}
						break;
					}

					case "STATUS": {
						latestStatus = { ...msg.payload, timestamp };
						console.log(`[${timestamp}] STATUS received:`, msg.payload);
						break;
					}

					case "METRICS": {
						latestMetrics = { ...msg.payload, timestamp };
						console.log(`[${timestamp}] METRICS received:`, msg.payload);
						break;
					}

					case "PING": {
						const response = {
							id: msg.id,
							type: "PONG",
							payload: {},
						};
						ws.send(JSON.stringify(response));
						console.log(`[${timestamp}] PONG sent`);
						break;
					}

					default:
						console.log(`[${timestamp}] Unknown message type: ${msg.type}`);
				}
			} catch (err) {
				console.error("Error parsing message:", err);
			}
		},

		close(ws) {
			console.log(
				`[WebSocket] Connection closed for device: ${ws.data.deviceId}`,
			);
			authenticated = false;
		},
	},
});

console.log(`Mock API server listening on http://localhost:${server.port}`);
console.log(`WebSocket endpoint: ws://localhost:${server.port}/agent/ws`);
console.log(`Health check: http://localhost:${server.port}/health`);
console.log(`Status endpoint: http://localhost:${server.port}/status`);
const maskedApiKey = `****${TEST_API_KEY.slice(-4)}`;
console.log(
	`Test credentials: device_id=${TEST_DEVICE_ID}, api_key=${maskedApiKey} (from TEST_API_KEY constant)`,
);
