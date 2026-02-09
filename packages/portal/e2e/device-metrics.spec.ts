/**
 * E2E tests for device metrics and status monitoring.
 * Tests real-time metric updates and polling behavior.
 */

import { test, expect } from '@playwright/test';

test.describe('Device Metrics', () => {
  const mockDevice = {
    id: 'device-123',
    name: 'Test Router',
    model: 'RT-AX92U',
    serial: 'ABC123',
    owner_id: 'user-123',
    firmware_version: '1.0.0',
    status: 'online',
    created_at: Date.now(),
    last_seen: Date.now(),
  };

  test.beforeEach(async ({ page, context }) => {
    // Mock authentication
    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Mock device list
    await page.route('**/fleet/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockDevice]),
      });
    });
  });

  test('should display device metrics when device is online', async ({ page }) => {
    await page.route('**/fleet/devices/device-123/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: mockDevice,
          connection: { online: true, last_seen: Date.now() },
          metrics: {
            uptime: 86400,
            cpu: 23,
            memory: 41,
            temperature: 52,
            load: [0.42, 0.38, 0.35],
            connections: 847,
          },
        }),
      });
    });

    await page.goto('/');
    await page.click('[data-device-id="device-123"]');

    // Should display all metrics
    await expect(page.locator('text=CPU')).toBeVisible();
    await expect(page.locator('text=23%')).toBeVisible();
    await expect(page.locator('text=Memory')).toBeVisible();
    await expect(page.locator('text=41%')).toBeVisible();
    await expect(page.locator('text=Temperature')).toBeVisible();
    await expect(page.locator('text=52°C')).toBeVisible();
    await expect(page.locator('text=Connections')).toBeVisible();
    await expect(page.locator('text=847')).toBeVisible();
  });

  test('should show offline state when device is offline', async ({ page }) => {
    await page.route('**/fleet/devices/device-123/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: { ...mockDevice, status: 'offline' },
          connection: {
            online: false,
            last_seen: Date.now() - 3600000,
          },
          metrics: null,
        }),
      });
    });

    await page.goto('/');
    await page.click('[data-device-id="device-123"]');

    // Should show offline indicator
    await expect(page.locator('[data-status="offline"]')).toBeVisible();
    await expect(page.locator('text=Last seen')).toBeVisible();
  });

  test('should poll metrics every 5 seconds', async ({ page }) => {
    let requestCount = 0;
    let cpuValue = 23;

    await page.route('**/fleet/devices/device-123/status', async (route) => {
      requestCount++;
      cpuValue += 5; // Simulate changing metrics

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: mockDevice,
          connection: { online: true, last_seen: Date.now() },
          metrics: {
            uptime: 86400,
            cpu: cpuValue,
            memory: 41,
            temperature: 52,
            load: [0.42, 0.38, 0.35],
            connections: 847,
          },
        }),
      });
    });

    await page.goto('/');
    await page.click('[data-device-id="device-123"]');

    // Initial load
    expect(requestCount).toBe(1);
    await expect(page.locator('text=28%')).toBeVisible(); // 23 + 5

    // Wait 5 seconds
    await page.waitForTimeout(5100);

    // Should have polled again
    expect(requestCount).toBe(2);
    await expect(page.locator('text=33%')).toBeVisible(); // 28 + 5
  });

  test('should stop polling when switching to different device', async ({ page }) => {
    const mockDevice2 = { ...mockDevice, id: 'device-456', name: 'Another Router' };

    await page.route('**/fleet/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockDevice, mockDevice2]),
      });
    });

    let device123Requests = 0;
    let device456Requests = 0;

    await page.route('**/fleet/devices/device-123/status', async (route) => {
      device123Requests++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: mockDevice,
          connection: { online: true, last_seen: Date.now() },
          metrics: {
            uptime: 86400,
            cpu: 23,
            memory: 41,
            temperature: 52,
            load: [0.42, 0.38, 0.35],
            connections: 847,
          },
        }),
      });
    });

    await page.route('**/fleet/devices/device-456/status', async (route) => {
      device456Requests++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: mockDevice2,
          connection: { online: true, last_seen: Date.now() },
          metrics: {
            uptime: 43200,
            cpu: 15,
            memory: 32,
            temperature: 48,
            load: [0.25, 0.20, 0.18],
            connections: 512,
          },
        }),
      });
    });

    await page.goto('/');

    // Select first device
    await page.click('[data-device-id="device-123"]');
    expect(device123Requests).toBe(1);

    // Switch to second device
    await page.click('[data-device-id="device-456"]');
    expect(device456Requests).toBe(1);

    // Wait 5 seconds
    await page.waitForTimeout(5100);

    // Should only poll second device
    expect(device456Requests).toBe(2);
    expect(device123Requests).toBe(1); // No additional requests
  });

  test('should show error message on metrics fetch failure', async ({ page }) => {
    await page.route('**/fleet/devices/device-123/status', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to fetch metrics' }),
      });
    });

    await page.goto('/');
    await page.click('[data-device-id="device-123"]');

    // Should show error message
    await expect(page.locator('text=Failed to fetch metrics')).toBeVisible();
  });

  test('should recover from temporary errors and continue polling', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/fleet/devices/device-123/status', async (route) => {
      requestCount++;

      if (requestCount === 1) {
        // First request fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary error' }),
        });
      } else {
        // Subsequent requests succeed
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            device: mockDevice,
            connection: { online: true, last_seen: Date.now() },
            metrics: {
              uptime: 86400,
              cpu: 23,
              memory: 41,
              temperature: 52,
              load: [0.42, 0.38, 0.35],
              connections: 847,
            },
          }),
        });
      }
    });

    await page.goto('/');
    await page.click('[data-device-id="device-123"]');

    // Should show error initially
    await expect(page.locator('text=Temporary error')).toBeVisible();

    // Wait for next poll
    await page.waitForTimeout(5100);

    // Should now show metrics
    await expect(page.locator('text=CPU')).toBeVisible();
    await expect(page.locator('text=23%')).toBeVisible();
  });

  test('should format uptime correctly', async ({ page }) => {
    await page.route('**/fleet/devices/device-123/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: mockDevice,
          connection: { online: true, last_seen: Date.now() },
          metrics: {
            uptime: 1234567, // ~14 days
            cpu: 23,
            memory: 41,
            temperature: 52,
            load: [0.42, 0.38, 0.35],
            connections: 847,
          },
        }),
      });
    });

    await page.goto('/');
    await page.click('[data-device-id="device-123"]');

    // Should display formatted uptime
    await expect(page.locator('text=14d')).toBeVisible();
  });

  test('should display system load average', async ({ page }) => {
    await page.route('**/fleet/devices/device-123/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: mockDevice,
          connection: { online: true, last_seen: Date.now() },
          metrics: {
            uptime: 86400,
            cpu: 23,
            memory: 41,
            temperature: 52,
            load: [0.42, 0.38, 0.35],
            connections: 847,
          },
        }),
      });
    });

    await page.goto('/');
    await page.click('[data-device-id="device-123"]');

    // Should display load average
    await expect(page.locator('text=Load')).toBeVisible();
    await expect(page.locator('text=0.42')).toBeVisible();
  });
});
