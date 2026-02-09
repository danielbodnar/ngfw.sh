/**
 * Test isolation strategies for integration testing
 * Ensures tests are independent and don't interfere with each other
 * @module isolation
 */

import type { IsolationStrategy, CleanupHandler } from '../core/types';

/**
 * Database transaction isolation
 * Wraps test in a transaction that's rolled back after the test
 */
export class TransactionIsolation {
  private activeTransactions = new Map<string, unknown>();

  /**
   * Begin a new transaction
   */
  async begin(connectionId: string): Promise<void> {
    // This would connect to a real database and start a transaction
    // For now, this is a placeholder for the pattern
    this.activeTransactions.set(connectionId, { started: Date.now() });
  }

  /**
   * Rollback the transaction
   */
  async rollback(connectionId: string): Promise<void> {
    this.activeTransactions.delete(connectionId);
  }

  /**
   * Commit the transaction (should only be used for setup)
   */
  async commit(connectionId: string): Promise<void> {
    this.activeTransactions.delete(connectionId);
  }

  /**
   * Get active transaction count
   */
  getActiveCount(): number {
    return this.activeTransactions.size;
  }

  /**
   * Create cleanup handler for transaction rollback
   */
  createCleanupHandler(connectionId: string): CleanupHandler {
    return async () => {
      if (this.activeTransactions.has(connectionId)) {
        await this.rollback(connectionId);
      }
    };
  }
}

/**
 * Namespace isolation for KV/R2 storage
 * Creates isolated namespaces for each test
 */
export class NamespaceIsolation {
  private namespaces = new Map<string, Map<string, unknown>>();

  /**
   * Create a new isolated namespace
   */
  createNamespace(namespaceId: string): Map<string, unknown> {
    const namespace = new Map<string, unknown>();
    this.namespaces.set(namespaceId, namespace);
    return namespace;
  }

  /**
   * Get a namespace
   */
  getNamespace(namespaceId: string): Map<string, unknown> | undefined {
    return this.namespaces.get(namespaceId);
  }

  /**
   * Delete a namespace
   */
  deleteNamespace(namespaceId: string): void {
    this.namespaces.delete(namespaceId);
  }

  /**
   * Clear all data in a namespace
   */
  clearNamespace(namespaceId: string): void {
    const namespace = this.namespaces.get(namespaceId);
    if (namespace) {
      namespace.clear();
    }
  }

  /**
   * Get all active namespaces
   */
  getActiveNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * Create cleanup handler for namespace deletion
   */
  createCleanupHandler(namespaceId: string): CleanupHandler {
    return () => {
      this.deleteNamespace(namespaceId);
    };
  }
}

/**
 * WebSocket connection isolation
 * Tracks and cleans up WebSocket connections
 */
export class WebSocketIsolation {
  private connections = new Map<string, WebSocket>();

  /**
   * Register a WebSocket connection
   */
  register(connectionId: string, ws: WebSocket): void {
    this.connections.set(connectionId, ws);
  }

  /**
   * Close a WebSocket connection
   */
  close(connectionId: string): void {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    this.connections.delete(connectionId);
  }

  /**
   * Close all WebSocket connections
   */
  closeAll(): void {
    for (const [id, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    this.connections.clear();
  }

  /**
   * Get active connection count
   */
  getActiveCount(): number {
    return this.connections.size;
  }

  /**
   * Create cleanup handler for connection closure
   */
  createCleanupHandler(connectionId?: string): CleanupHandler {
    return () => {
      if (connectionId) {
        this.close(connectionId);
      } else {
        this.closeAll();
      }
    };
  }
}

/**
 * Process isolation (placeholder for separate process per test)
 * This would spawn tests in separate processes
 */
export class ProcessIsolation {
  private processes = new Map<string, { pid: number; started: number }>();

  /**
   * Register a test process
   */
  register(processId: string, pid: number): void {
    this.processes.set(processId, { pid, started: Date.now() });
  }

  /**
   * Kill a test process
   */
  kill(processId: string): void {
    const process = this.processes.get(processId);
    if (process) {
      try {
        Bun.spawnSync(['kill', '-9', process.pid.toString()]);
      } catch (err) {
        // Process may have already exited
      }
    }
    this.processes.delete(processId);
  }

  /**
   * Kill all test processes
   */
  killAll(): void {
    for (const [id] of this.processes) {
      this.kill(id);
    }
  }

  /**
   * Get active process count
   */
  getActiveCount(): number {
    return this.processes.size;
  }

  /**
   * Create cleanup handler for process termination
   */
  createCleanupHandler(processId?: string): CleanupHandler {
    return () => {
      if (processId) {
        this.kill(processId);
      } else {
        this.killAll();
      }
    };
  }
}

/**
 * Resource cleanup tracker
 * Tracks all resources created during tests for cleanup
 */
export class ResourceTracker {
  private resources = new Map<string, {
    type: 'file' | 'directory' | 'port' | 'connection' | 'process';
    identifier: string;
    created: number;
  }>();

  /**
   * Track a resource
   */
  track(
    id: string,
    type: 'file' | 'directory' | 'port' | 'connection' | 'process',
    identifier: string,
  ): void {
    this.resources.set(id, { type, identifier, created: Date.now() });
  }

  /**
   * Untrack a resource
   */
  untrack(id: string): void {
    this.resources.delete(id);
  }

  /**
   * Get all tracked resources
   */
  getAll(): Array<{ id: string; type: string; identifier: string; created: number }> {
    return Array.from(this.resources.entries()).map(([id, resource]) => ({
      id,
      ...resource,
    }));
  }

  /**
   * Get resources by type
   */
  getByType(type: string): Array<{ id: string; identifier: string; created: number }> {
    return Array.from(this.resources.entries())
      .filter(([, resource]) => resource.type === type)
      .map(([id, resource]) => ({
        id,
        identifier: resource.identifier,
        created: resource.created,
      }));
  }

  /**
   * Clear all tracked resources
   */
  clear(): void {
    this.resources.clear();
  }

  /**
   * Create cleanup handler that removes all tracked resources
   */
  createCleanupHandler(): CleanupHandler {
    return async () => {
      const resources = this.getAll();

      for (const resource of resources) {
        try {
          switch (resource.type) {
            case 'file':
              await Bun.write(resource.identifier, ''); // Clear file
              break;
            case 'directory':
              // Would use recursive directory removal
              break;
            case 'port':
              // Port cleanup (close server)
              break;
            case 'connection':
              // Close connection
              break;
            case 'process':
              // Kill process
              break;
          }
        } catch (err) {
          console.error(`Failed to cleanup ${resource.type} ${resource.identifier}:`, err);
        }
      }

      this.clear();
    };
  }
}

/**
 * Main isolation manager
 * Coordinates different isolation strategies
 */
export class IsolationManager {
  private transaction = new TransactionIsolation();
  private namespace = new NamespaceIsolation();
  private websocket = new WebSocketIsolation();
  private process = new ProcessIsolation();
  private resources = new ResourceTracker();

  /**
   * Apply isolation strategy for a test
   */
  async apply(strategy: IsolationStrategy, testId: string): Promise<CleanupHandler[]> {
    const handlers: CleanupHandler[] = [];

    switch (strategy) {
      case 'transaction':
        await this.transaction.begin(testId);
        handlers.push(this.transaction.createCleanupHandler(testId));
        break;

      case 'namespace':
        this.namespace.createNamespace(testId);
        handlers.push(this.namespace.createCleanupHandler(testId));
        break;

      case 'cleanup':
        handlers.push(this.resources.createCleanupHandler());
        handlers.push(this.websocket.createCleanupHandler());
        break;

      case 'process':
        // Process isolation would be handled differently
        // This is a placeholder
        break;
    }

    return handlers;
  }

  /**
   * Get transaction isolation manager
   */
  getTransaction(): TransactionIsolation {
    return this.transaction;
  }

  /**
   * Get namespace isolation manager
   */
  getNamespace(): NamespaceIsolation {
    return this.namespace;
  }

  /**
   * Get WebSocket isolation manager
   */
  getWebSocket(): WebSocketIsolation {
    return this.websocket;
  }

  /**
   * Get process isolation manager
   */
  getProcess(): ProcessIsolation {
    return this.process;
  }

  /**
   * Get resource tracker
   */
  getResourceTracker(): ResourceTracker {
    return this.resources;
  }

  /**
   * Get statistics about active resources
   */
  getStats(): {
    transactions: number;
    namespaces: number;
    websockets: number;
    processes: number;
    resources: number;
  } {
    return {
      transactions: this.transaction.getActiveCount(),
      namespaces: this.namespace.getActiveNamespaces().length,
      websockets: this.websocket.getActiveCount(),
      processes: this.process.getActiveCount(),
      resources: this.resources.getAll().length,
    };
  }

  /**
   * Clean up all resources
   */
  async cleanupAll(): Promise<void> {
    this.websocket.closeAll();
    this.process.killAll();
    await this.resources.createCleanupHandler()();
  }
}

/**
 * Create a new isolation manager instance
 */
export function createIsolationManager(): IsolationManager {
  return new IsolationManager();
}

