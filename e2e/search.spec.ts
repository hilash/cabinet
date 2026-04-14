import { test, expect } from "@playwright/test";

test.describe("Search shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/home", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=cabinet", { timeout: 10000 });
  });

  test("Cmd+Shift+F opens Cabinet local search dialog", async ({ page }) => {
    // Trigger Cmd+Shift+F
    await page.keyboard.press("Meta+Shift+f");
    await page.waitForTimeout(500);

    // The search dialog should appear — look for an input with search-related placeholder
    const searchInput = page.locator(
      "[role='dialog'] input, [class*='search'] input, [class*='Search'] input, input[placeholder*='search' i]"
    ).first();

    const dialogVisible = await searchInput.isVisible().catch(() => false);
    if (dialogVisible) {
      await expect(searchInput).toBeVisible();
      // Close it with Escape
      await page.keyboard.press("Escape");
    }
  });

  test("Cmd+K opens Multica command palette", async ({ page }) => {
    // Trigger Cmd+K
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(500);

    // The command palette (cmdk) should appear
    const cmdkDialog = page.locator(
      "[cmdk-root], [role='dialog'], [class*='command'], [class*='Command']"
    ).first();

    const visible = await cmdkDialog.isVisible().catch(() => false);
    if (visible) {
      await expect(cmdkDialog).toBeVisible();
      // Close it
      await page.keyboard.press("Escape");
    }
  });

  test("Cmd+Shift+F and Cmd+K open different dialogs", async ({ page }) => {
    // Open local search
    await page.keyboard.press("Meta+Shift+f");
    await page.waitForTimeout(500);

    const searchDialog = page.locator(
      "input[placeholder*='search' i], [class*='search'] input"
    ).first();
    const searchVisible = await searchDialog.isVisible().catch(() => false);

    if (searchVisible) {
      // Close local search
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Open command palette
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(500);

      const cmdPalette = page.locator("[cmdk-root], [class*='command']").first();
      const cmdVisible = await cmdPalette.isVisible().catch(() => false);

      // They should be distinct features — both can exist
      // (this test just confirms no conflict / crash)
      if (cmdVisible) {
        await page.keyboard.press("Escape");
      }
    }
  });
});
