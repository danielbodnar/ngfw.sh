/**
 * Mock agent client for integration testing
 * Simulates router agent connecting to API server
 * @module mocks/agent-client
 */

import type { ProtocolMessage, AuthPayload, StatusPayload, MetricsFixture } from '../core/types';

export interface MockAgentConfig {
  deviceId: string;
  apiKey: string;
  ownerId: string;
  wsUrl: string;
  firmwareVersion?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  verbose?: boolean;
}

type MessageHandler = (msg: ProtocolMessage) => void;

/**
 * Mock router agent client
 */
export class MockAgentClient {
  private config: MockAgentConfig;
  private ws: WebSocket | null = null;
  private connected = false;
  private authenticated = false;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private pendingMessages: Array<{ resolve: (msg: ProtocolMessage) => void; reject: (err: Error) => void; id: string }> = [];
  private reconnectTimeout: Timer | null = null;

  constructor(config: MockAgentConfig) {
    this.config = {
      firmwareVersion: '388.1_0',
      autoReconnect: false,
      reconnectDelay: 5000,
      verbose: false,
      ...config,
    };
  }

  /**
   * Connect to the API server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = new URL(this.config.wsUrl);
      wsUrl.searchParams.set('device_id', this.config.deviceId);
      wsUrl.searchParams.set('owner_id', this.config.ownerId);

      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        this.connected = true;
        if (this.config.verbose) {
          console.log(`[Agent] Connected to ${wsUrl.toString()}`);
        }
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        if (this.config.verbose) {
          console.error('[Agent] WebSocket error:', error);
        }
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.authenticated = false;
        if (this.config.verbose) {
          console.log('[Agent] Connection closed');
        }

        if (this.config.autoReconnect) {
          this.scheduleReconnect();
        }
      };
    });
  }

  /**
   * Disconnect from the API server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.authenticated = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Authenticate with the API server
   */
  async authenticate(): Promise<void> {
    const authPayload: AuthPayload = {
      device_id: this.config.deviceId,
      api_key: this.config.apiKey,
      firmware_version: this.config.firmwareVersion,
    };

    const response = await this.sendMessage({
      id: crypto.randomUUID(),
      type: 'AUTH',
      payload: authPayload,
    });

    if (response.type === 'AUTH_OK') {
      this.authenticated = true;
      if (this.config.verbose) {
        console.log('[Agent] Authentication successful');
      }
    } else {
      throw new Error(`Authentication failed: ${JSON.stringify(response.payload)}`);
    }
  }

  /**
   * Send status update
   */
  async sendStatus(status: StatusPayload): Promise<void> {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    await this.sendMessage({
      id: crypto.randomUUID(),
      type: 'STATUS',
      payload: status,
    });

    if (this.config.verbose) {
      console.log('[Agent] Status sent:', status);
    }
  }

  /**
   * Send metrics update
   */
  async sendMetrics(metrics: MetricsFixture): Promise<void> {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    await this.sendMessage({
      id: crypto.randomUUID(),
      type: 'METRICS',
      payload: metrics,
    });

    if (this.config.verbose) {
      console.log('[Agent] Metrics sent:', metrics);
    }
  }

  /**
   * Send ping
   */
  async ping(): Promise<number> {
    const startTime = Date.now();

    const response = await this.sendMessage({
      id: crypto.randomUUID(),
      type: 'PING',
      payload: {},
    });

    if (response.type !== 'PONG') {
      throw new Error(`Expected PONG, got ${response.type}`);
    }

    return Date.now() - startTime;
  }

  /**
   * Register message handler
   */
  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Remove message handler
   */
  off(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Wait for a specific message type
   */
  async waitForMessage(type: string, timeout = 5000): Promise<ProtocolMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(type, handler);
        reject(new Error(`Timeout waiting for ${type} message`));
      }, timeout);

      const handler: MessageHandler = (msg) => {
        clearTimeout(timer);
        this.off(type, handler);
        resolve(msg);
      };

      this.on(type, handler);
    });
  }

  /**
   * Send a message and wait for response
   */
  private async sendMessage(msg: ProtocolMessage): Promise<ProtocolMessage> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected');
    }

    return new Promise((resolve, reject) => {
      this.pendingMessages.push({ resolve, reject, id: msg.id });

      try {
        this.ws!.send(JSON.stringify(msg));
      } catch (err) {
        const index = this.pendingMessages.findIndex((p) => p.id === msg.id);
        if (index !== -1) {
          this.pendingMessages.splice(index, 1);
        }
        reject(err);
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        const index = this.pendingMessages.findIndex((p) => p.id === msg.id);
        if (index !== -1) {
          this.pendingMessages.splice(index, 1);
          reject(new Error(`Message timeout: ${msg.type}`));
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const msg: ProtocolMessage = JSON.parse(data);

      if (this.config.verbose) {
        console.log('[Agent] Received:', msg.type, msg.payload);
      }

      // Resolve pending message if this is a response
      const pendingIndex = this.pendingMessages.findIndex((p) => p.id === msg.id);
      if (pendingIndex !== -1) {
        const pending = this.pendingMessages[pendingIndex];
        this.pendingMessages.splice(pendingIndex, 1);
        pending.resolve(msg);
        return;
      }

      // Call registered handlers
      const handlers = this.messageHandlers.get(msg.type);
      if (handlers) {
        for (const handler of handlers) {
          handler(msg);
        }
      }
    } catch (err) {
      console.error('[Agent] Error parsing message:', err);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.config.verbose) {
        console.log('[Agent] Attempting to reconnect...');
      }
      this.connect().catch((err) => {
        if (this.config.verbose) {
          console.error('[Agent] Reconnection failed:', err);
        }
      });
    }, this.config.reconnectDelay);
  }
}

/**
 * Create a mock agent client instance
 */
export function createMockAgentClient(config: MockAgentConfig): MockAgentClient {
  return new MockAgentClient(config);
}
