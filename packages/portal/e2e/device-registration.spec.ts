/**
 * E2E tests for device registration flow.
 * Tests the complete user journey from clicking register to viewing the device.
 */

import { expect, test } from "@playwright/test";

test.describe("Device Registration", () => {
	test.beforeEach(async ({ page, context }) => {
		// Mock authentication - set Clerk session cookie
		await context.addCookies([
			{
				name: "__session",
				value: "mock-session-token",
				domain: "localhost",
				path: "/",
			},
		]);

		// Mock API responses
		await page.route("**/fleet/devices", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([]),
				});
			} else if (route.request().method() === "POST") {
				const body = route.request().postDataJSON();
				await route.fulfill({
					status: 201,
					contentType: "application/json",
					body: JSON.stringify({
						id: "device-" + Date.now(),
						name: body.name,
						model: body.model || null,
						serial: null,
						owner_id: "user-123",
						firmware_version: null,
						status: "provisioning",
						created_at: Date.now(),
						last_seen: null,
						api_key: "test-api-key-123456",
						websocket_url: "wss://api.ngfw.sh/agent/ws",
					}),
				});
			}
		});

		await page.goto("/");
	});

	test("should open registration modal when clicking register button", async ({
		page,
	}) => {
		// Click register device button
		await page.click('button:has-text("Register Device")');

		// Modal should be visible
		await expect(page.locator('[role="dialog"]')).toBeVisible();
		await expect(page.locator("h2")).toContainText("Register Device");
	});

	test("should validate required fields", async ({ page }) => {
		await page.click('button:has-text("Register Device")');

		// Try to submit empty form
		await page.click('button[type="submit"]');

		// Should show validation error
		await expect(page.locator("text=Device name is required")).toBeVisible();
	});

	test("should successfully register device with name and model", async ({
		page,
	}) => {
		await page.click('button:has-text("Register Device")');

		// Fill in device information
		await page.fill('input[name="name"]', "Test Router");
		await page.fill('input[name="model"]', "RT-AX92U");

		// Submit form
		await page.click('button[type="submit"]');

		// Should show API key
		await expect(page.locator("text=API Key")).toBeVisible();
		await expect(page.locator('[data-testid="api-key"]')).toContainText(
			"test-api-key-123456",
		);

		// Should show installation instructions
		await expect(page.locator("text=Installation Instructions")).toBeVisible();
	});

	test("should copy API key to clipboard", async ({ page, context }) => {
		// Grant clipboard permissions
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);

		await page.click('button:has-text("Register Device")');
		await page.fill('input[name="name"]', "Test Router");
		await page.click('button[type="submit"]');

		// Wait for API key to be visible
		await expect(page.locator('[data-testid="api-key"]')).toBeVisible();

		// Click copy button
		await page.click('button:has-text("Copy")');

		// Check clipboard content
		const clipboardText = await page.evaluate(() =>
			navigator.clipboard.readText(),
		);
		expect(clipboardText).toBe("test-api-key-123456");
	});

	test("should copy installation command to clipboard", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);

		await page.click('button:has-text("Register Device")');
		await page.fill('input[name="name"]', "Test Router");
		await page.click('button[type="submit"]');

		// Click copy installation command button
		await page.click('button[aria-label="Copy installation command"]');

		// Check clipboard content
		const clipboardText = await page.evaluate(() =>
			navigator.clipboard.readText(),
		);
		expect(clipboardText).toContain("test-api-key-123456");
		expect(clipboardText).toContain("wss://api.ngfw.sh/agent/ws");
	});

	test("should close modal and show device in list", async ({ page }) => {
		// Mock updated device list
		await page.route("**/fleet/devices", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([
						{
							id: "device-123",
							name: "Test Router",
							model: "RT-AX92U",
							serial: null,
							owner_id: "user-123",
							firmware_version: null,
							status: "provisioning",
							created_at: Date.now(),
							last_seen: null,
						},
					]),
				});
			}
		});

		await page.click('button:has-text("Register Device")');
		await page.fill('input[name="name"]', "Test Router");
		await page.click('button[type="submit"]');

		// Close modal
		await page.click('button:has-text("Close")');

		// Device should appear in list
		await expect(page.locator("text=Test Router")).toBeVisible();
		await expect(page.locator("text=provisioning")).toBeVisible();
	});

	test("should show error message on API failure", async ({ page }) => {
		// Mock API error
		await page.route("**/fleet/devices", async (route) => {
			if (route.request().method() === "POST") {
				await route.fulfill({
					status: 400,
					contentType: "application/json",
					body: JSON.stringify({ error: "Device name already exists" }),
				});
			}
		});

		await page.click('button:has-text("Register Device")');
		await page.fill('input[name="name"]', "Duplicate Device");
		await page.click('button[type="submit"]');

		// Should show error message
		await expect(page.locator("text=Device name already exists")).toBeVisible();
	});

	test("should register device with only name (no model)", async ({ page }) => {
		await page.click('button:has-text("Register Device")');

		// Fill only device name
		await page.fill('input[name="name"]', "Generic Router");

		// Submit form
		await page.click('button[type="submit"]');

		// Should still succeed
		await expect(page.locator("text=API Key")).toBeVisible();
	});

	test("should show loading state during registration", async ({ page }) => {
		// Delay API response
		await page.route("**/fleet/devices", async (route) => {
			if (route.request().method() === "POST") {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				await route.continue();
			}
		});

		await page.click('button:has-text("Register Device")');
		await page.fill('input[name="name"]', "Test Router");
		await page.click('button[type="submit"]');

		// Should show loading indicator
		await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
	});
});
