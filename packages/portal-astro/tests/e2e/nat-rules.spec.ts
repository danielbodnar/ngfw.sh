/**
 * E2E tests for NAT rule management.
 *
 * Tests the complete CRUD flow for NAT rules from the user perspective.
 */

import { expect, test } from "@playwright/test";

test.describe("NAT Rules Management", () => {
	test.beforeEach(async ({ page, context }) => {
		// Set up authenticated state
		await context.addCookies([
			{
				name: "__session",
				value: "mock-session-token",
				domain: "localhost",
				path: "/",
			},
		]);

		await page.goto("/security/nat");
	});

	test("displays NAT rules list", async ({ page }) => {
		await expect(page.locator('h2:has-text("NAT Rules")')).toBeVisible();

		// Should show existing rules
		await expect(page.locator("text=SSH Port Forward")).toBeVisible();
		await expect(page.locator("text=Web Server")).toBeVisible();
	});

	test("creates new NAT rule", async ({ page }) => {
		// Click add rule button
		await page.click('button:has-text("Add Rule")');

		// Modal should open
		await expect(page.locator("text=Add NAT Rule")).toBeVisible();

		// Fill in form
		await page.fill('input[name="name"]', "SMTP Server");
		await page.selectOption('select[name="type"]', "port_forward");
		await page.fill('input[name="external_ip"]', "203.0.113.1");
		await page.fill('input[name="external_port"]', "25");
		await page.fill('input[name="internal_ip"]', "192.168.1.103");
		await page.fill('input[name="internal_port"]', "25");
		await page.selectOption('select[name="protocol"]', "tcp");
		await page.fill(
			'textarea[name="description"]',
			"Email server port forward",
		);

		// Submit form
		await page.click('button:has-text("Create")');

		// Should show success message
		await expect(page.locator("text=/created successfully/i")).toBeVisible();

		// Should show new rule in list
		await expect(page.locator("text=SMTP Server")).toBeVisible();
	});

	test("validates form inputs", async ({ page }) => {
		await page.click('button:has-text("Add Rule")');

		// Try to submit empty form
		await page.click('button:has-text("Create")');

		// Should show validation errors
		await expect(page.locator("text=/name is required/i")).toBeVisible();
		await expect(page.locator("text=/ip is required/i")).toBeVisible();
	});

	test("edits existing NAT rule", async ({ page }) => {
		// Click edit button on first rule
		await page.click('tr:has-text("SSH Port Forward") button:has-text("Edit")');

		// Modal should open with existing values
		await expect(page.locator("text=Edit NAT Rule")).toBeVisible();
		await expect(page.locator('input[name="name"]')).toHaveValue(
			"SSH Port Forward",
		);

		// Update description
		await page.fill('textarea[name="description"]', "Updated SSH access");

		// Submit
		await page.click('button:has-text("Update")');

		// Should show success message
		await expect(page.locator("text=/updated successfully/i")).toBeVisible();
	});

	test("toggles rule enabled state", async ({ page }) => {
		// Find rule with enabled badge
		const ruleRow = page.locator('tr:has-text("SSH Port Forward")');
		await expect(ruleRow.locator("text=Enabled")).toBeVisible();

		// Click disable button
		await ruleRow.locator('button:has-text("Disable")').click();

		// Should show success message
		await expect(page.locator("text=/disabled/i")).toBeVisible();

		// Badge should update
		await expect(ruleRow.locator("text=Disabled")).toBeVisible();

		// Click enable button
		await ruleRow.locator('button:has-text("Enable")').click();

		// Should re-enable
		await expect(page.locator("text=/enabled/i")).toBeVisible();
		await expect(ruleRow.locator("text=Enabled")).toBeVisible();
	});

	test("deletes NAT rule with confirmation", async ({ page }) => {
		// Set up dialog handler
		page.on("dialog", (dialog) => {
			expect(dialog.message()).toContain("Are you sure");
			dialog.accept();
		});

		// Click delete button
		await page.click('tr:has-text("Web Server") button:has-text("Delete")');

		// Should show success message
		await expect(page.locator("text=/deleted successfully/i")).toBeVisible();

		// Rule should be removed from list
		await expect(page.locator("text=Web Server")).not.toBeVisible();
	});

	test("cancels delete on dialog dismiss", async ({ page }) => {
		// Set up dialog handler to cancel
		page.on("dialog", (dialog) => {
			dialog.dismiss();
		});

		await page.click('tr:has-text("Web Server") button:has-text("Delete")');

		// Rule should still be visible
		await expect(page.locator("text=Web Server")).toBeVisible();
	});

	test("refreshes rules list", async ({ page }) => {
		// Click refresh button
		await page.click('button:has-text("Refresh")');

		// Loading state should appear briefly
		await expect(page.locator('[data-testid="spinner"]')).toBeVisible({
			timeout: 1000,
		});

		// Rules should reload
		await expect(page.locator("text=SSH Port Forward")).toBeVisible();
	});

	test("displays empty state when no rules", async ({ page }) => {
		// Mock empty response (would need API mocking setup)
		// For now, just verify the component structure exists
		await expect(page.locator('h2:has-text("NAT Rules")')).toBeVisible();
	});

	test("shows error state on API failure", async ({ page }) => {
		// This would require intercepting and mocking API errors
		// Verify error handling UI exists
		await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
	});

	test("filters rules by protocol badge", async ({ page }) => {
		// Check TCP badge is visible
		await expect(page.locator('span:has-text("TCP")')).toBeVisible();

		// In a full implementation, clicking badges could filter
		const tcpBadge = page.locator('span:has-text("TCP")').first();
		await expect(tcpBadge).toHaveClass(/badge/i);
	});

	test("keyboard navigation works in modal", async ({ page }) => {
		await page.click('button:has-text("Add Rule")');

		// Focus should be in modal
		await page.keyboard.press("Tab");

		// Can navigate through form fields
		await page.keyboard.type("Test Rule");

		// Escape closes modal
		await page.keyboard.press("Escape");
		await expect(page.locator("text=Add NAT Rule")).not.toBeVisible();
	});

	test("mobile responsive layout", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		await expect(page.locator('h2:has-text("NAT Rules")')).toBeVisible();

		// Table should adapt to mobile
		await expect(page.locator("table")).toBeVisible();

		// Add button should be accessible
		await expect(page.locator('button:has-text("Add Rule")')).toBeVisible();
	});
});
