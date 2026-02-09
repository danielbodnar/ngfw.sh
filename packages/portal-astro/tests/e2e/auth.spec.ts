/**
 * E2E tests for authentication flows.
 *
 * Tests the complete user authentication journey from sign-in
 * through to authenticated API calls.
 */

import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
	test("redirects unauthenticated users to sign-in", async ({ page }) => {
		await page.goto("/dashboard");

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/sign-in/);
	});

	test("signs in successfully with valid credentials", async ({ page }) => {
		await page.goto("/sign-in");

		// Fill in credentials
		await page.fill('input[name="email"]', "test@example.com");
		await page.fill('input[name="password"]', "Test123!@#");

		// Submit form
		await page.click('button[type="submit"]');

		// Should redirect to dashboard
		await expect(page).toHaveURL(/\/dashboard/);

		// Should show user menu
		await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
	});

	test("shows error for invalid credentials", async ({ page }) => {
		await page.goto("/sign-in");

		await page.fill('input[name="email"]', "invalid@example.com");
		await page.fill('input[name="password"]', "wrongpassword");
		await page.click('button[type="submit"]');

		// Should show error message
		await expect(
			page.locator("text=/Invalid credentials|Authentication failed/i"),
		).toBeVisible();

		// Should stay on sign-in page
		await expect(page).toHaveURL(/\/sign-in/);
	});

	test("redirects authenticated users away from sign-in", async ({
		page,
		context,
	}) => {
		// Set up authenticated state
		await context.addCookies([
			{
				name: "__session",
				value: "mock-session-token",
				domain: "localhost",
				path: "/",
			},
		]);

		await page.goto("/sign-in");

		// Should redirect to dashboard
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test("signs out successfully", async ({ page, context }) => {
		// Set up authenticated state
		await context.addCookies([
			{
				name: "__session",
				value: "mock-session-token",
				domain: "localhost",
				path: "/",
			},
		]);

		await page.goto("/dashboard");

		// Click user menu
		await page.click('[data-testid="user-menu"]');

		// Click sign out
		await page.click("text=Sign Out");

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/sign-in/);

		// Session cookie should be cleared
		const cookies = await context.cookies();
		const sessionCookie = cookies.find((c) => c.name === "__session");
		expect(sessionCookie).toBeUndefined();
	});

	test("persists authentication across page reloads", async ({
		page,
		context,
	}) => {
		// Set up authenticated state
		await context.addCookies([
			{
				name: "__session",
				value: "mock-session-token",
				domain: "localhost",
				path: "/",
			},
		]);

		await page.goto("/dashboard");
		await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

		// Reload page
		await page.reload();

		// Should still be authenticated
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
	});
});
