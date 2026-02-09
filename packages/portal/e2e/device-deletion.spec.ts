/**
 * E2E tests for device deletion flow.
 * Tests the delete confirmation dialog and device removal.
 */

import { expect, test } from "@playwright/test";

test.describe("Device Deletion", () => {
	const mockDevice = {
		id: "device-123",
		name: "Test Router",
		model: "RT-AX92U",
		serial: "ABC123",
		owner_id: "user-123",
		firmware_version: "1.0.0",
		status: "online",
		created_at: Date.now(),
		last_seen: Date.now(),
	};

	test.beforeEach(async ({ page, context }) => {
		// Mock authentication
		await context.addCookies([
			{
				name: "__session",
				value: "mock-session-token",
				domain: "localhost",
				path: "/",
			},
		]);

		// Mock device list
		await page.route("**/fleet/devices", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([mockDevice]),
				});
			}
		});
	});

	test("should show confirmation dialog when clicking delete button", async ({
		page,
	}) => {
		await page.goto("/");

		// Click delete button
		await page.click(
			'[data-device-id="device-123"] button[aria-label="Delete device"]',
		);

		// Confirmation dialog should appear
		await expect(page.locator('[role="alertdialog"]')).toBeVisible();
		await expect(page.locator("text=Delete Device")).toBeVisible();
		await expect(page.locator("text=Are you sure")).toBeVisible();
	});

	test("should cancel deletion when clicking cancel button", async ({
		page,
	}) => {
		await page.goto("/");

		await page.click(
			'[data-device-id="device-123"] button[aria-label="Delete device"]',
		);

		// Click cancel
		await page.click('button:has-text("Cancel")');

		// Dialog should close
		await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();

		// Device should still be visible
		await expect(page.locator("text=Test Router")).toBeVisible();
	});

	test("should successfully delete device", async ({ page }) => {
		let deleteCalled = false;

		await page.route("**/fleet/devices/device-123", async (route) => {
			if (route.request().method() === "DELETE") {
				deleteCalled = true;
				await route.fulfill({ status: 204 });
			}
		});

		// Mock updated device list (empty after deletion)
		await page.route("**/fleet/devices", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(deleteCalled ? [] : [mockDevice]),
				});
			}
		});

		await page.goto("/");

		await page.click(
			'[data-device-id="device-123"] button[aria-label="Delete device"]',
		);

		// Confirm deletion
		await page.click('button:has-text("Delete")');

		// Should call DELETE API
		await page.waitForTimeout(100);
		expect(deleteCalled).toBe(true);

		// Device should be removed from list
		await expect(page.locator("text=Test Router")).not.toBeVisible();

		// Should show empty state
		await expect(page.locator("text=No devices registered")).toBeVisible();
	});

	test("should show error message on deletion failure", async ({ page }) => {
		await page.route("**/fleet/devices/device-123", async (route) => {
			if (route.request().method() === "DELETE") {
				await route.fulfill({
					status: 403,
					contentType: "application/json",
					body: JSON.stringify({
						error: "Cannot delete device owned by another user",
					}),
				});
			}
		});

		await page.goto("/");

		await page.click(
			'[data-device-id="device-123"] button[aria-label="Delete device"]',
		);
		await page.click('button:has-text("Delete")');

		// Should show error message
		await expect(
			page.locator("text=Cannot delete device owned by another user"),
		).toBeVisible();

		// Device should still be visible
		await expect(page.locator("text=Test Router")).toBeVisible();
	});

	test("should show loading state during deletion", async ({ page }) => {
		await page.route("**/fleet/devices/device-123", async (route) => {
			if (route.request().method() === "DELETE") {
				// Delay response
				await new Promise((resolve) => setTimeout(resolve, 1000));
				await route.fulfill({ status: 204 });
			}
		});

		await page.goto("/");

		await page.click(
			'[data-device-id="device-123"] button[aria-label="Delete device"]',
		);
		await page.click('button:has-text("Delete")');

		// Should show loading indicator
		await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
	});

	test("should close dialog on successful deletion", async ({ page }) => {
		await page.route("**/fleet/devices/device-123", async (route) => {
			if (route.request().method() === "DELETE") {
				await route.fulfill({ status: 204 });
			}
		});

		await page.route("**/fleet/devices", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([]),
				});
			}
		});

		await page.goto("/");

		await page.click(
			'[data-device-id="device-123"] button[aria-label="Delete device"]',
		);
		await page.click('button:has-text("Delete")');

		// Dialog should close
		await page.waitForTimeout(500);
		await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();
	});

	test("should disable delete button while deletion is in progress", async ({
		page,
	}) => {
		await page.route("**/fleet/devices/device-123", async (route) => {
			if (route.request().method() === "DELETE") {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				await route.fulfill({ status: 204 });
			}
		});

		await page.goto("/");

		await page.click(
			'[data-device-id="device-123"] button[aria-label="Delete device"]',
		);

		const deleteButton = page.locator('button:has-text("Delete")');
		await deleteButton.click();

		// Button should be disabled
		await expect(deleteButton).toBeDisabled();
	});

	test("should show device name in confirmation dialog", async ({ page }) => {
		await page.goto("/");

		await page.click(
			'[data-device-id="device-123"] button[aria-label="Delete device"]',
		);

		// Should mention device name
		await expect(page.locator("text=Test Router")).toBeVisible();
	});
});
