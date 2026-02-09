/**
 * Mock API server for integration testing
 * Simulates both REST endpoints and WebSocket connections
 * @module mocks/api-server
 */

import type {
  MockServerState,
  MockConnection,
  MockMessage,
  ProtocolMessage,
  AuthPayload,
} from '../core/types';

export interface MockApiServerConfig {
  port?: number;
  host?: string;
  verbose?: boolean;
  /** Valid test credentials */
  credentials?: Array<{
    deviceId: string;
    apiKey: string;
    ownerId: string;
  }>;
}

/**
 * Mock API server with WebSocket support
 */
export class MockApiServer {
  private config: Required<MockApiServerConfig>;
  private state: MockServerState;
  private server: ReturnType<typeof Bun.serve> | null = null;
  private messageHandlers: Map<string, (msg: ProtocolMessage) => void> = new Map();

  constructor(config: MockApiServerConfig = {}) {
    this.config = {
      port: config.port ?? 8787,
      host: config.host ?? 'localhost',
      verbose: config.verbose ?? false,
      credentials: config.credentials ?? [
        {
          deviceId: 'test-device-001',
          apiKey: 'test-api-key-secret-001',
          ownerId: 'test-owner-001',
        },
      ],
    };

    this.state = {
      authenticated: false,
      connections: new Map(),
      messages: [],
      latestStatus: null,
      latestMetrics: null,
    };
  }

  /**
   * Start the mock server
   */
  async start(): Promise<void> {
    this.server = Bun.serve({
      port: this.config.port,
      hostname: this.config.host,

      fetch: async (req, server) => {
        const url = new URL(req.url);

        // Health check endpoint
        if (url.pathname === '/health') {
          return Response.json({ status: 'ok', timestamp: Date.now() });
        }

        // Test inspection endpoint
        if (url.pathname === '/_test/state') {
          return Response.json(this.getState());
        }

        // Reset state endpoint
        if (url.pathname === '/_test/reset' && req.method === 'POST') {
          this.reset();
          return Response.json({ success: true });
        }

        // REST API endpoints
        if (url.pathname.startsWith('/fleet/devices')) {
          return this.handleFleetEndpoint(req, url);
        }

        // WebSocket upgrade
        if (url.pathname === '/agent/ws') {
          const deviceId = url.searchParams.get('device_id');
          const ownerId = url.searchParams.get('owner_id');

          if (!deviceId || !ownerId) {
            return new Response('Missing device_id or owner_id', { status: 400 });
          }

          if (server.upgrade(req, { data: { deviceId, ownerId } })) {
            return undefined;
          }
          return new Response('WebSocket upgrade failed', { status: 400 });
        }

        return new Response('Not found', { status: 404 });
      },

      websocket: {
        open: (ws) => {
          const connectionId = crypto.randomUUID();
          const connection: MockConnection = {
            id: connectionId,
            deviceId: ws.data.deviceId,
            ownerId: ws.data.ownerId,
            authenticated: false,
            connectedAt: new Date(),
          };

          this.state.connections.set(connectionId, connection);

          if (this.config.verbose) {
            console.log(`[WS] Connection opened: ${connectionId} (device: ${ws.data.deviceId})`);
          }
        },

        message: (ws, message) => {
          this.handleWebSocketMessage(ws, message);
        },

        close: (ws) => {
          const connection = Array.from(this.state.connections.entries()).find(
            ([, conn]) => conn.deviceId === ws.data.deviceId,
          );

          if (connection) {
            this.state.connections.delete(connection[0]);
            if (this.config.verbose) {
              console.log(`[WS] Connection closed: ${connection[0]}`);
            }
          }
        },
      },
    });

    if (this.config.verbose) {
      console.log(`Mock API server listening on http://${this.config.host}:${this.config.port}`);
    }
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }

  /**
   * Get current server state
   */
  getState(): MockServerState {
    return {
      ...this.state,
      connections: new Map(this.state.connections),
      messages: [...this.state.messages],
    };
  }

  /**
   * Reset server state
   */
  reset(): void {
    this.state.authenticated = false;
    this.state.connections.clear();
    this.state.messages = [];
    this.state.latestStatus = null;
    this.state.latestMetrics = null;
  }

  /**
   * Register a custom message handler
   */
  onMessage(type: string, handler: (msg: ProtocolMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Get all received messages
   */
  getMessages(): MockMessage[] {
    return [...this.state.messages];
  }

  /**
   * Get messages by type
   */
  getMessagesByType(type: string): MockMessage[] {
    return this.state.messages.filter((msg) => msg.type === type);
  }

  /**
   * Clear message history
   */
  clearMessages(): void {
    this.state.messages = [];
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(ws: any, message: string | Buffer): void {
    try {
      const msg = JSON.parse(message.toString()) as ProtocolMessage;
      const timestamp = new Date();

      // Find connection
      const connectionEntry = Array.from(this.state.connections.entries()).find(
        ([, conn]) => conn.deviceId === ws.data.deviceId,
      );

      if (!connectionEntry) {
        console.error('[WS] Connection not found for device:', ws.data.deviceId);
        return;
      }

      const [connectionId, connection] = connectionEntry;

      // Record message
      this.state.messages.push({
        id: msg.id,
        type: msg.type,
        payload: msg.payload,
        timestamp,
        connectionId,
      });

      connection.lastMessageAt = timestamp;

      if (this.config.verbose) {
        console.log(`[WS] ${timestamp.toISOString()} Received: ${msg.type}`, msg.payload);
      }

      // Call custom handler if registered
      const customHandler = this.messageHandlers.get(msg.type);
      if (customHandler) {
        customHandler(msg);
      }

      // Handle standard protocol messages
      switch (msg.type) {
        case 'AUTH':
          this.handleAuth(ws, msg, connection);
          break;
        case 'STATUS':
          this.handleStatus(msg);
          break;
        case 'METRICS':
          this.handleMetrics(msg);
          break;
        case 'PING':
          this.handlePing(ws, msg);
          break;
        default:
          if (this.config.verbose) {
            console.log(`[WS] Unhandled message type: ${msg.type}`);
          }
      }
    } catch (err) {
      console.error('[WS] Error parsing message:', err);
    }
  }

  /**
   * Handle AUTH message
   */
  private handleAuth(ws: any, msg: ProtocolMessage<AuthPayload>, connection: MockConnection): void {
    const { device_id, api_key } = msg.payload;

    const validCreds = this.config.credentials.find(
      (cred) => cred.deviceId === device_id && cred.apiKey === api_key,
    );

    if (validCreds) {
      connection.authenticated = true;
      this.state.authenticated = true;

      const response: ProtocolMessage = {
        id: crypto.randomUUID(),
        type: 'AUTH_OK',
        payload: {
          success: true,
          server_time: Date.now(),
        },
      };

      ws.send(JSON.stringify(response));
      if (this.config.verbose) {
        console.log(`[WS] AUTH_OK sent for device ${device_id}`);
      }
    } else {
      const response: ProtocolMessage = {
        id: crypto.randomUUID(),
        type: 'AUTH_ERROR',
        payload: {
          success: false,
          error: 'Invalid credentials',
        },
      };

      ws.send(JSON.stringify(response));
      if (this.config.verbose) {
        console.log('[WS] AUTH_ERROR: invalid credentials');
      }
    }
  }

  /**
   * Handle STATUS message
   */
  private handleStatus(msg: ProtocolMessage): void {
    this.state.latestStatus = msg.payload;
    if (this.config.verbose) {
      console.log('[WS] STATUS received:', msg.payload);
    }
  }

  /**
   * Handle METRICS message
   */
  private handleMetrics(msg: ProtocolMessage): void {
    this.state.latestMetrics = msg.payload;
    if (this.config.verbose) {
      console.log('[WS] METRICS received:', msg.payload);
    }
  }

  /**
   * Handle PING message
   */
  private handlePing(ws: any, msg: ProtocolMessage): void {
    const response: ProtocolMessage = {
      id: msg.id,
      type: 'PONG',
      payload: {},
    };

    ws.send(JSON.stringify(response));
    if (this.config.verbose) {
      console.log('[WS] PONG sent');
    }
  }

  /**
   * Handle REST API fleet endpoints
   */
  private async handleFleetEndpoint(req: Request, url: URL): Promise<Response> {
    // GET /fleet/devices - List devices
    if (url.pathname === '/fleet/devices' && req.method === 'GET') {
      return Response.json([
        {
          id: 'test-device-001',
          name: 'Test Router',
          model: 'RT-AX86U',
          status: 'online',
          owner_id: 'test-owner-001',
        },
      ]);
    }

    // POST /fleet/devices - Register device
    if (url.pathname === '/fleet/devices' && req.method === 'POST') {
      const body = await req.json();
      return Response.json(
        {
          id: 'test-device-001',
          ...body,
          api_key: 'test-api-key-secret-001',
          websocket_url: `ws://${this.config.host}:${this.config.port}/agent/ws`,
          status: 'provisioning',
          created_at: Date.now(),
        },
        { status: 201 },
      );
    }

    // GET /fleet/devices/:id/status - Get device status
    const statusMatch = url.pathname.match(/^\/fleet\/devices\/([^/]+)\/status$/);
    if (statusMatch && req.method === 'GET') {
      return Response.json({
        device: {
          id: statusMatch[1],
          name: 'Test Router',
          status: 'online',
        },
        connection: {
          online: this.state.authenticated,
          last_seen: Date.now(),
        },
        metrics: this.state.latestMetrics,
      });
    }

    return new Response('Not found', { status: 404 });
  }
}

/**
 * Create a mock API server instance
 */
export function createMockApiServer(config?: MockApiServerConfig): MockApiServer {
  return new MockApiServer(config);
}
