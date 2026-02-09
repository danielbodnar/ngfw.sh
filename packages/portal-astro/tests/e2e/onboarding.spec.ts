/**
 * E2E tests for user onboarding flow.
 *
 * Tests the complete journey from sign-up through device registration
 * to initial configuration.
 */

import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('completes full onboarding journey', async ({ page }) => {
    // Step 1: Sign Up
    await page.goto('/sign-up');

    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!@#');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!@#');
    await page.click('button[type="submit"]');

    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator('text=/Welcome|Get Started/i')).toBeVisible();

    // Step 2: Select Router Model
    await expect(page.locator('text=/Select.*Router|Choose.*Device/i')).toBeVisible();

    // Click on a router card
    await page.click('[data-testid="router-rt-ax86u"]');

    // Continue button should be enabled
    await page.click('button:has-text("Continue")');

    // Step 3: Device Registration
    await expect(page.locator('text=/Register.*Device|Device.*Setup/i')).toBeVisible();

    await page.fill('input[name="deviceName"]', 'Home Router');
    await page.click('button:has-text("Register Device")');

    // Should show API key (once)
    await expect(page.locator('[data-testid="api-key"]')).toBeVisible();
    const apiKey = await page.locator('[data-testid="api-key"]').textContent();
    expect(apiKey).toMatch(/^sk_/);

    // Click copy button
    await page.click('button:has-text("Copy API Key")');

    // Should show confirmation
    await expect(page.locator('text=Copied')).toBeVisible();

    // Acknowledge and continue
    await page.check('input[type="checkbox"][name="confirmedSaved"]');
    await page.click('button:has-text("Continue to Setup")');

    // Step 4: Initial Configuration
    await expect(page.locator('text=/Initial.*Configuration|Basic.*Setup/i')).toBeVisible();

    // Configure WAN
    await page.selectOption('select[name="wanType"]', 'dhcp');

    // Configure LAN
    await page.fill('input[name="lanSubnet"]', '192.168.1.0/24');
    await page.fill('input[name="lanGateway"]', '192.168.1.1');

    // Enable basic security
    await page.check('input[name="enableFirewall"]');
    await page.check('input[name="enableIPS"]');

    // Submit configuration
    await page.click('button:has-text("Complete Setup")');

    // Step 5: Onboarding Complete
    await expect(page.locator('text=/Setup.*Complete|All.*Set/i')).toBeVisible();

    // Click to go to dashboard
    await page.click('button:has-text("Go to Dashboard")');

    // Should land on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Home Router')).toBeVisible();
  });

  test('shows validation errors in device registration', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding');

    // Skip to device registration step
    await page.click('[data-testid="router-rt-ax86u"]');
    await page.click('button:has-text("Continue")');

    // Try to submit without name
    await page.click('button:has-text("Register Device")');

    // Should show validation error
    await expect(page.locator('text=/name.*required/i')).toBeVisible();
  });

  test('can skip optional configuration steps', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding');

    // Select router
    await page.click('[data-testid="router-rt-ax86u"]');
    await page.click('button:has-text("Continue")');

    // Register device with minimal info
    await page.fill('input[name="deviceName"]', 'Quick Setup Router');
    await page.click('button:has-text("Register Device")');

    // Save API key
    await page.check('input[type="checkbox"][name="confirmedSaved"]');
    await page.click('button:has-text("Continue to Setup")');

    // Skip detailed configuration
    await page.click('button:has-text("Skip for Now")');

    // Should complete onboarding
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('persists progress across page reloads', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding');

    // Select router
    await page.click('[data-testid="router-rt-ax86u"]');
    await page.click('button:has-text("Continue")');

    // Reload page
    await page.reload();

    // Should be on device registration step (not back to router selection)
    await expect(page.locator('text=/Register.*Device/i')).toBeVisible();
  });

  test('shows helpful tooltips and documentation', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding');

    // Look for help icons or info buttons
    const helpButton = page.locator('[data-testid="help-button"]').first();
    if (await helpButton.isVisible()) {
      await helpButton.click();

      // Should show tooltip or modal with help text
      await expect(page.locator('[role="tooltip"], [role="dialog"]')).toBeVisible();
    }
  });

  test('navigates backward through onboarding steps', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding');

    // Step 1: Select router
    await page.click('[data-testid="router-rt-ax86u"]');
    await page.click('button:has-text("Continue")');

    // Step 2: Device registration
    await expect(page.locator('text=/Register.*Device/i')).toBeVisible();

    // Go back
    await page.click('button:has-text("Back")');

    // Should be back on router selection
    await expect(page.locator('[data-testid="router-rt-ax86u"]')).toBeVisible();
  });

  test('handles API errors during registration', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Intercept API call and return error
    await page.route('**/api/*/fleet/devices', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/onboarding');

    await page.click('[data-testid="router-rt-ax86u"]');
    await page.click('button:has-text("Continue")');

    await page.fill('input[name="deviceName"]', 'Test Router');
    await page.click('button:has-text("Register Device")');

    // Should show error message
    await expect(page.locator('text=/error|failed/i')).toBeVisible();

    // Should allow retry
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('displays router models with images and specs', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding');

    // Should show multiple router options
    await expect(page.locator('[data-testid^="router-"]')).toHaveCount(3, { timeout: 5000 });

    // Each router card should have image and specs
    const firstRouter = page.locator('[data-testid="router-rt-ax86u"]');
    await expect(firstRouter.locator('img')).toBeVisible();
    await expect(firstRouter.locator('text=/wifi.*6|802.11ax/i')).toBeVisible();
  });

  test('responsive design on mobile devices', async ({ page, context }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await context.addCookies([
      {
        name: '__session',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding');

    // Router cards should stack vertically
    const routers = page.locator('[data-testid^="router-"]');
    await expect(routers.first()).toBeVisible();

    // Navigation should be accessible
    await expect(page.locator('button:has-text("Continue")')).toBeVisible();
  });
});
