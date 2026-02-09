/**
 * NGFW Mock API WebSocket Server
 *
 * Simulates the Rust API server (api.ngfw.sh) for agent integration testing.
 * Implements the RPC envelope protocol used by router agents over WebSocket.
 *
 * @module mock-api/server
 *
 * Envelope format: { id: string, type: "SCREAMING_SNAKE_CASE", payload: object }
 *
 * Agent sends: AUTH, STATUS, METRICS, PING, LOG, ALERT
 * Server sends: AUTH_OK, AUTH_FAIL, PONG, STATUS_REQUEST, CONFIG_PUSH, EXEC, PING, STATUS_OK
 *
 * Test credentials:
 *   device_id: "test-device-001"
 *   api_key:   "test-api-key-secret-001"
 */

const PORT = Number(process.env.MOCK_API_PORT) || 8787;

/** Hardcoded test credentials for integration testing */
const TEST_CREDENTIALS: Record<string, string> = {
	"test-api-key-secret-001": "test-device-001",
};

/** API key for HTTP endpoint access (used for /status and test endpoints) */
const HTTP_API_KEY = process.env.MOCK_API_KEY || "test-http-api-key-001";

/** RPC message envelope */
interface RpcMessage {
	id: string;
	type: string;
	payload: Record<string, unknown>;
}

/** Per-connection state tracked on each WebSocket */
interface ConnectionState {
	authenticated: boolean;
	device_id: string | null;
	owner_id: string | null;
	firmware_version: string | null;
	last_status: Record<string, unknown> | null;
	last_metrics: Record<string, unknown> | null;
	messages_received: number;
}

/** Global store keyed by device_id for the /status HTTP endpoint */
const device_states = new Map<string, ConnectionState>();

/** Format a log line with ISO timestamp */
function log(
	msg_type: string,
	device_id: string | null,
	summary: string,
): void {
	const ts = new Date().toISOString();
	const device = device_id ?? "unknown";
	console.log(`[${ts}] ${msg_type} from ${device}: ${summary}`);
}

/** Verify HTTP API key from Authorization header */
function verifyHttpAuth(req: Request): boolean {
	const authHeader = req.headers.get("Authorization");
	if (!authHeader) return false;

	// Support both "Bearer <key>" and raw key formats
	const key = authHeader.startsWith("Bearer ")
		? authHeader.slice(7)
		: authHeader;

	return key === HTTP_API_KEY;
}

/** Build a response envelope */
function response(
	type: string,
	payload: Record<string, unknown>,
	id?: string,
): string {
	const msg: RpcMessage = {
		id: id ?? crypto.randomUUID(),
		type,
		payload,
	};
	return JSON.stringify(msg);
}

const _server = Bun.serve<ConnectionState>({
	port: PORT,

	fetch(req, server) {
		const url = new URL(req.url);

		// --- HTTP endpoints ---

		if (url.pathname === "/health") {
			return Response.json({ status: "ok" });
		}

		if (url.pathname === "/status") {
			// Require authentication for status endpoint
			if (!verifyHttpAuth(req)) {
				return new Response("Unauthorized", {
					status: 401,
					headers: { "WWW-Authenticate": 'Bearer realm="Mock API"' },
				});
			}

			// Return the latest state for all connected devices
			const entries: Record<string, unknown>[] = [];
			for (const [, state] of device_states) {
				entries.push({
					authenticated: state.authenticated,
					device_id: state.device_id,
					firmware_version: state.firmware_version,
					last_status: state.last_status,
					last_metrics: state.last_metrics,
					messages_received: state.messages_received,
				});
			}

			// If a single device is connected, return its state directly for convenience
			if (entries.length === 1) {
				return Response.json(entries[0]);
			}

			// Multiple or zero devices: return the array
			return Response.json(entries);
		}

		// --- WebSocket upgrade on /agent/ws ---

		if (url.pathname === "/agent/ws") {
			const device_id = url.searchParams.get("device_id");
			const owner_id = url.searchParams.get("owner_id");

			const upgraded = server.upgrade(req, {
				data: {
					authenticated: false,
					device_id,
					owner_id,
					firmware_version: null,
					last_status: null,
					last_metrics: null,
					messages_received: 0,
				} satisfies ConnectionState,
			});

			if (upgraded) {
				return undefined as unknown as Response;
			}

			return new Response("WebSocket upgrade failed", { status: 400 });
		}

		return new Response("Not Found", { status: 404 });
	},

	websocket: {
		open(ws) {
			const { device_id } = ws.data;
			log(
				"CONNECT",
				device_id,
				`WebSocket opened (owner_id=${ws.data.owner_id})`,
			);

			if (device_id) {
				device_states.set(device_id, ws.data);
			}
		},

		message(ws, raw) {
			const text =
				typeof raw === "string"
					? raw
					: new TextDecoder().decode(raw as ArrayBuffer);

			let msg: RpcMessage;
			try {
				msg = JSON.parse(text) as RpcMessage;
			} catch {
				log("ERROR", ws.data.device_id, `Invalid JSON: ${text.slice(0, 120)}`);
				ws.send(response("ERROR", { error: "Invalid JSON" }));
				return;
			}

			ws.data.messages_received += 1;

			// Sync global store
			if (ws.data.device_id) {
				device_states.set(ws.data.device_id, ws.data);
			}

			switch (msg.type) {
				case "AUTH":
					handleAuth(ws, msg);
					break;
				case "STATUS":
					handleStatus(ws, msg);
					break;
				case "METRICS":
					handleMetrics(ws, msg);
					break;
				case "PING":
					handlePing(ws, msg);
					break;
				case "LOG":
					handleLog(ws, msg);
					break;
				case "ALERT":
					handleAlert(ws, msg);
					break;
				default:
					log(msg.type, ws.data.device_id, `Unhandled message type`);
					break;
			}

			// Keep global store in sync after handler mutations
			if (ws.data.device_id) {
				device_states.set(ws.data.device_id, ws.data);
			}
		},

		close(ws, code, reason) {
			log("DISCONNECT", ws.data.device_id, `code=${code} reason=${reason}`);
			if (ws.data.device_id) {
				device_states.delete(ws.data.device_id);
			}
		},
	},
});

// --- Message handlers ---

function handleAuth(
	ws: { data: ConnectionState; send: (msg: string) => void },
	msg: RpcMessage,
): void {
	const payload = msg.payload as {
		device_id?: string;
		api_key?: string;
		firmware_version?: string;
	};
	const { device_id, api_key, firmware_version } = payload;

	log(
		"AUTH",
		ws.data.device_id,
		`device_id=${device_id} firmware=${firmware_version}`,
	);

	// Validate credentials against the hardcoded test map
	const expected_device = api_key ? TEST_CREDENTIALS[api_key] : undefined;
	const valid = expected_device !== undefined && expected_device === device_id;

	if (valid) {
		ws.data.authenticated = true;
		ws.data.device_id = device_id ?? ws.data.device_id;
		ws.data.firmware_version = firmware_version ?? null;

		ws.send(
			response(
				"AUTH_OK",
				{
					success: true,
					server_time: Date.now(),
				},
				msg.id,
			),
		);

		log("AUTH_OK", ws.data.device_id, "Authentication successful");
	} else {
		ws.send(
			response(
				"AUTH_FAIL",
				{
					success: false,
					error: "Invalid device credentials",
				},
				msg.id,
			),
		);

		log("AUTH_FAIL", ws.data.device_id, `Rejected (device_id=${device_id})`);
	}
}

function handleStatus(
	ws: { data: ConnectionState; send: (msg: string) => void },
	msg: RpcMessage,
): void {
	log(
		"STATUS",
		ws.data.device_id,
		`cpu=${msg.payload.cpu} mem=${msg.payload.memory} uptime=${msg.payload.uptime}`,
	);
	ws.data.last_status = msg.payload;

	ws.send(response("STATUS_OK", {}, msg.id));
}

function handleMetrics(
	ws: { data: ConnectionState; send: (msg: string) => void },
	msg: RpcMessage,
): void {
	log(
		"METRICS",
		ws.data.device_id,
		`cpu=${msg.payload.cpu} mem=${msg.payload.memory} ts=${msg.payload.timestamp}`,
	);
	ws.data.last_metrics = msg.payload;
}

function handlePing(
	ws: { data: ConnectionState; send: (msg: string) => void },
	msg: RpcMessage,
): void {
	log("PING", ws.data.device_id, "Responding with PONG");
	ws.send(response("PONG", {}, msg.id));
}

function handleLog(ws: { data: ConnectionState }, msg: RpcMessage): void {
	const payload = msg.payload as {
		level?: string;
		component?: string;
		message?: string;
	};
	log(
		"LOG",
		ws.data.device_id,
		`[${payload.level}] ${payload.component}: ${payload.message}`,
	);
}

function handleAlert(ws: { data: ConnectionState }, msg: RpcMessage): void {
	const payload = msg.payload as {
		severity?: string;
		alert_type?: string;
		description?: string;
	};
	log(
		"ALERT",
		ws.data.device_id,
		`[${payload.severity}] ${payload.alert_type}: ${payload.description}`,
	);
}

console.log(`NGFW Mock API server listening on http://localhost:${PORT}`);
console.log(
	`  WebSocket: ws://localhost:${PORT}/agent/ws?device_id=...&owner_id=...`,
);
console.log(`  Health:    http://localhost:${PORT}/health`);
console.log(`  Status:    http://localhost:${PORT}/status`);
