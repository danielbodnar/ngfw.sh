/**
 * E2E tests for device list view.
 * Tests device display, status badges, and selection.
 */

import { test, expect } from '@playwright/test';

test.describe('Device List', () => {
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
  });

  test('should show empty state when no devices', async ({ page }) => {
    await page.route('**/fleet/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');

    // Should show empty state message
    await expect(page.locator('text=No devices registered')).toBeVisible();
    await expect(page.locator('button:has-text("Register Device")')).toBeVisible();
  });

  test('should display device list with correct information', async ({ page }) => {
    const mockDevices = [
      {
        id: 'device-1',
        name: 'Office Router',
        model: 'RT-AX92U',
        serial: 'ABC123',
        owner_id: 'user-123',
        firmware_version: '1.0.0',
        status: 'online',
        created_at: Date.now() - 86400000,
        last_seen: Date.now() - 300000,
      },
      {
        id: 'device-2',
        name: 'Home Router',
        model: null,
        serial: null,
        owner_id: 'user-123',
        firmware_version: null,
        status: 'provisioning',
        created_at: Date.now(),
        last_seen: null,
      },
      {
        id: 'device-3',
        name: 'Branch Router',
        model: 'RT-AX86U',
        serial: 'XYZ789',
        owner_id: 'user-123',
        firmware_version: '1.2.0',
        status: 'offline',
        created_at: Date.now() - 172800000,
        last_seen: Date.now() - 3600000,
      },
    ];

    await page.route('**/fleet/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDevices),
      });
    });

    await page.goto('/');

    // Should display all devices
    await expect(page.locator('text=Office Router')).toBeVisible();
    await expect(page.locator('text=Home Router')).toBeVisible();
    await expect(page.locator('text=Branch Router')).toBeVisible();

    // Should show correct status badges
    await expect(page.locator('[data-device-id="device-1"] [data-status="online"]')).toBeVisible();
    await expect(page.locator('[data-device-id="device-2"] [data-status="provisioning"]')).toBeVisible();
    await expect(page.locator('[data-device-id="device-3"] [data-status="offline"]')).toBeVisible();
  });

  test('should show loading state while fetching devices', async ({ page }) => {
    let resolveRoute: (value: unknown) => void;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route('**/fleet/devices', async (route) => {
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    const navigation = page.goto('/');

    // Should show loading indicator
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Resolve route
    resolveRoute!(true);
    await navigation;

    // Loading should be gone
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  });

  test('should show error message on API failure', async ({ page }) => {
    await page.route('**/fleet/devices', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' }),
      });
    });

    await page.goto('/');

    // Should show error message
    await expect(page.locator('text=Database connection failed')).toBeVisible();
  });

  test('should filter devices by status', async ({ page }) => {
    const mockDevices = [
      {
        id: 'device-1',
        name: 'Online Router',
        status: 'online',
        model: null,
        serial: null,
        owner_id: 'user-123',
        firmware_version: null,
        created_at: Date.now(),
        last_seen: Date.now(),
      },
      {
        id: 'device-2',
        name: 'Offline Router',
        status: 'offline',
        model: null,
        serial: null,
        owner_id: 'user-123',
        firmware_version: null,
        created_at: Date.now(),
        last_seen: Date.now() - 3600000,
      },
    ];

    await page.route('**/fleet/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDevices),
      });
    });

    await page.goto('/');

    // Both devices visible initially
    await expect(page.locator('text=Online Router')).toBeVisible();
    await expect(page.locator('text=Offline Router')).toBeVisible();

    // Filter to show only online devices
    await page.click('button:has-text("Filter")');
    await page.click('input[value="online"]');

    // Only online device visible
    await expect(page.locator('text=Online Router')).toBeVisible();
    await expect(page.locator('text=Offline Router')).not.toBeVisible();
  });

  test('should select device and show details', async ({ page }) => {
    const mockDevices = [
      {
        id: 'device-1',
        name: 'Test Router',
        model: 'RT-AX92U',
        serial: 'ABC123',
        owner_id: 'user-123',
        firmware_version: '1.0.0',
        status: 'online',
        created_at: Date.now(),
        last_seen: Date.now(),
      },
    ];

    await page.route('**/fleet/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDevices),
      });
    });

    await page.route('**/fleet/devices/device-1/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: mockDevices[0],
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

    // Click on device
    await page.click('[data-device-id="device-1"]');

    // Should show device details
    await expect(page.locator('text=Test Router')).toBeVisible();
    await expect(page.locator('text=RT-AX92U')).toBeVisible();
    await expect(page.locator('text=CPU: 23%')).toBeVisible();
  });

  test('should refresh device list when clicking refresh button', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/fleet/devices', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');

    expect(requestCount).toBe(1);

    // Click refresh button
    await page.click('button[aria-label="Refresh device list"]');

    // Should make another API call
    await page.waitForTimeout(100);
    expect(requestCount).toBe(2);
  });
});
