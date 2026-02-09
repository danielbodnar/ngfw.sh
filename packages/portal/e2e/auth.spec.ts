/**
 * E2E tests for authentication flows.
 * Tests Clerk sign-in integration and protected routes.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show sign-in page when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should see Clerk SignIn component
    await expect(page.locator('[data-clerk-sign-in]')).toBeVisible();
  });

  test('should redirect to dashboard after successful sign-in', async ({ page }) => {
    // This test requires Clerk test mode or mock authentication
    test.skip(!process.env.CLERK_TEST_MODE, 'Clerk test mode not enabled');

    await page.goto('/');

    // Fill in test credentials
    await page.fill('input[name="identifier"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error message on failed sign-in', async ({ page }) => {
    test.skip(!process.env.CLERK_TEST_MODE, 'Clerk test mode not enabled');

    await page.goto('/');

    // Fill in invalid credentials
    await page.fill('input[name="identifier"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('should persist authentication across page reloads', async ({ page, context }) => {
    test.skip(!process.env.CLERK_TEST_MODE, 'Clerk test mode not enabled');

    // Sign in first
    await page.goto('/');
    await page.fill('input[name="identifier"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-clerk-sign-in]')).not.toBeVisible();
  });
});
