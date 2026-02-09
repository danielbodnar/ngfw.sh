/**
 * Test data fixtures for integration testing
 * @module fixtures
 */

import type {
  DeviceFixture,
  UserFixture,
  MetricsFixture,
  NetworkConfigFixture,
} from '../core/types';

/**
 * Device fixture builder
 */
export class DeviceFixtureBuilder {
  private overrides: Partial<DeviceFixture> = {};

  /**
   * Build a device fixture with optional overrides
   */
  build(overrides?: Partial<DeviceFixture>): DeviceFixture {
    const now = Date.now();

    return {
      id: overrides?.id ?? `device-${crypto.randomUUID()}`,
      name: overrides?.name ?? 'Test Router',
      model: overrides?.model ?? 'RT-AX86U',
      serial: overrides?.serial ?? `SN${Math.floor(Math.random() * 1000000)}`,
      owner_id: overrides?.owner_id ?? `owner-${crypto.randomUUID()}`,
      api_key: overrides?.api_key ?? `sk_test_${crypto.randomUUID()}`,
      firmware_version: overrides?.firmware_version ?? '388.1_0',
      status: overrides?.status ?? 'online',
      created_at: overrides?.created_at ?? now,
      last_seen: overrides?.last_seen ?? now,
      ...this.overrides,
      ...overrides,
    };
  }

  /**
   * Build a list of device fixtures
   */
  buildList(count: number, overrides?: Partial<DeviceFixture>): DeviceFixture[] {
    return Array.from({ length: count }, (_, index) =>
      this.build({
        ...overrides,
        id: `device-${index + 1}`,
        name: `Test Router ${index + 1}`,
      }),
    );
  }

  /**
   * Build a device with specific status
   */
  withStatus(status: DeviceFixture['status']): this {
    this.overrides.status = status;
    return this;
  }

  /**
   * Build a device with specific firmware version
   */
  withFirmwareVersion(version: string): this {
    this.overrides.firmware_version = version;
    return this;
  }

  /**
   * Build an offline device
   */
  offline(): this {
    this.overrides.status = 'offline';
    this.overrides.last_seen = Date.now() - 3600000; // 1 hour ago
    return this;
  }

  /**
   * Build a provisioning device
   */
  provisioning(): this {
    this.overrides.status = 'provisioning';
    this.overrides.last_seen = null;
    return this;
  }
}

/**
 * User fixture builder
 */
export class UserFixtureBuilder {
  private overrides: Partial<UserFixture> = {};

  /**
   * Build a user fixture with optional overrides
   */
  build(overrides?: Partial<UserFixture>): UserFixture {
    return {
      id: overrides?.id ?? `user-${crypto.randomUUID()}`,
      email: overrides?.email ?? `test-${crypto.randomUUID()}@example.com`,
      name: overrides?.name ?? 'Test User',
      created_at: overrides?.created_at ?? Date.now(),
      subscription_tier: overrides?.subscription_tier ?? 'free',
      ...this.overrides,
      ...overrides,
    };
  }

  /**
   * Build a list of user fixtures
   */
  buildList(count: number, overrides?: Partial<UserFixture>): UserFixture[] {
    return Array.from({ length: count }, (_, index) =>
      this.build({
        ...overrides,
        id: `user-${index + 1}`,
        email: `test${index + 1}@example.com`,
        name: `Test User ${index + 1}`,
      }),
    );
  }

  /**
   * Build a pro tier user
   */
  pro(): this {
    this.overrides.subscription_tier = 'pro';
    return this;
  }

  /**
   * Build an enterprise tier user
   */
  enterprise(): this {
    this.overrides.subscription_tier = 'enterprise';
    return this;
  }
}

/**
 * Metrics fixture builder
 */
export class MetricsFixtureBuilder {
  private overrides: Partial<MetricsFixture> = {};

  /**
   * Build a metrics fixture with optional overrides
   */
  build(overrides?: Partial<MetricsFixture>): MetricsFixture {
    return {
      uptime: overrides?.uptime ?? 86400, // 1 day
      cpu: overrides?.cpu ?? 45.2,
      memory: overrides?.memory ?? 67.8,
      temperature: overrides?.temperature ?? 65,
      load: overrides?.load ?? [0.5, 0.8, 1.0],
      connections: overrides?.connections ?? 42,
      timestamp: overrides?.timestamp ?? Date.now(),
      ...this.overrides,
      ...overrides,
    };
  }

  /**
   * Build a list of metrics fixtures
   */
  buildList(count: number, overrides?: Partial<MetricsFixture>): MetricsFixture[] {
    return Array.from({ length: count }, (_, index) =>
      this.build({
        ...overrides,
        timestamp: Date.now() - (count - index - 1) * 60000, // 1 minute intervals
      }),
    );
  }

  /**
   * Build metrics with high CPU usage
   */
  highCpu(): this {
    this.overrides.cpu = 85.0 + Math.random() * 10;
    return this;
  }

  /**
   * Build metrics with high memory usage
   */
  highMemory(): this {
    this.overrides.memory = 90.0 + Math.random() * 5;
    return this;
  }

  /**
   * Build metrics with high temperature
   */
  highTemperature(): this {
    this.overrides.temperature = 80 + Math.floor(Math.random() * 10);
    return this;
  }

  /**
   * Build idle system metrics
   */
  idle(): this {
    this.overrides.cpu = 5.0 + Math.random() * 5;
    this.overrides.memory = 20.0 + Math.random() * 10;
    this.overrides.temperature = 45 + Math.floor(Math.random() * 10);
    this.overrides.load = [0.1, 0.2, 0.3];
    this.overrides.connections = 5;
    return this;
  }

  /**
   * Build stressed system metrics
   */
  stressed(): this {
    this.overrides.cpu = 90.0 + Math.random() * 10;
    this.overrides.memory = 85.0 + Math.random() * 10;
    this.overrides.temperature = 85 + Math.floor(Math.random() * 10);
    this.overrides.load = [5.0, 4.5, 4.0];
    this.overrides.connections = 1000 + Math.floor(Math.random() * 500);
    return this;
  }
}

/**
 * Network configuration fixture builder
 */
export class NetworkConfigFixtureBuilder {
  private overrides: Partial<NetworkConfigFixture> = {};

  /**
   * Build a network config fixture with optional overrides
   */
  build(overrides?: Partial<NetworkConfigFixture>): NetworkConfigFixture {
    return {
      wan: overrides?.wan ?? {
        type: 'dhcp',
        dns: ['8.8.8.8', '8.8.4.4'],
      },
      lan: overrides?.lan ?? {
        ip: '192.168.1.1',
        netmask: '255.255.255.0',
        dhcp_enabled: true,
        dhcp_range: {
          start: '192.168.1.100',
          end: '192.168.1.200',
        },
      },
      wireless: overrides?.wireless ?? [
        {
          ssid: 'ASUS_5G',
          security: 'wpa3',
          password: 'test-password',
          channel: 36,
        },
        {
          ssid: 'ASUS_2G',
          security: 'wpa2',
          password: 'test-password',
          channel: 6,
        },
      ],
      ...this.overrides,
      ...overrides,
    };
  }

  /**
   * Build a static WAN configuration
   */
  withStaticWan(ip: string, gateway: string): this {
    this.overrides.wan = {
      type: 'static',
      ip,
      gateway,
      dns: ['8.8.8.8', '8.8.4.4'],
    };
    return this;
  }

  /**
   * Build a PPPoE WAN configuration
   */
  withPPPoEWan(): this {
    this.overrides.wan = {
      type: 'pppoe',
      dns: ['8.8.8.8', '8.8.4.4'],
    };
    return this;
  }

  /**
   * Build with custom LAN subnet
   */
  withLanSubnet(ip: string, netmask: string): this {
    this.overrides.lan = {
      ...this.overrides.lan,
      ip,
      netmask,
      dhcp_enabled: true,
    };
    return this;
  }

  /**
   * Build without wireless
   */
  withoutWireless(): this {
    this.overrides.wireless = [];
    return this;
  }

  /**
   * Build with custom wireless config
   */
  withWireless(configs: NetworkConfigFixture['wireless']): this {
    this.overrides.wireless = configs;
    return this;
  }
}

/**
 * Pre-configured fixture instances
 */
export const deviceFixture = new DeviceFixtureBuilder();
export const userFixture = new UserFixtureBuilder();
export const metricsFixture = new MetricsFixtureBuilder();
export const networkConfigFixture = new NetworkConfigFixtureBuilder();

