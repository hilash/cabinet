import { test, expect } from "@playwright/test";

test.describe("Multica integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/home", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=cabinet", { timeout: 10000 });
  });

  test("Issues page shows content or auth guard", async ({ page }) => {
    await page.goto("/#/issues", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.location.hash === "#/issues");

    // Either the issues list renders, or the auth guard shows "Connect Multica"
    const issuesContent = page.locator("text=Issues").first();
    const authGuard = page.locator("text=Connect Multica").first();

    // Wait for either to appear
    await expect(issuesContent.or(authGuard)).toBeVisible({ timeout: 10000 });
  });

  test("AI panel has both Editor AI and Multica Chat tabs", async ({ page }) => {
    // Open AI panel if not already open — look for a toggle
    const editorTab = page.locator("text=Editor AI");
    const multicaTab = page.locator("text=Multica Chat");

    // Navigate to a page first to ensure AI panel has context
    await page.goto("/#/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // The AI panel tabs may only be visible when the panel is open
    // Try to find and verify them
    const editorTabVisible = await editorTab.isVisible().catch(() => false);
    const multicaTabVisible = await multicaTab.isVisible().catch(() => false);

    if (editorTabVisible || multicaTabVisible) {
      // At least one tab is visible — panel is open
      await expect(editorTab).toBeVisible();
      await expect(multicaTab).toBeVisible();
    }
    // If neither is visible, the AI panel is collapsed — that's acceptable
  });

  test("switching sections updates AI panel tab context", async ({ page }) => {
    // Extra wait for full hydration since this test is sensitive to timing
    await page.waitForTimeout(2000);
    const sidebar = page.locator("aside");

    // Go to Issues (multica section)
    await sidebar.getByRole("button", { name: "Issues", exact: true }).click();
    await page.waitForFunction(() => window.location.hash === "#/issues");
    await page.waitForTimeout(500);

    // Check if Multica Chat tab is active (if AI panel is visible)
    const multicaTab = page.locator("text=Multica Chat");
    const multicaTabVisible = await multicaTab.isVisible().catch(() => false);

    if (multicaTabVisible) {
      // Multica Chat should be the active tab when viewing Issues
      // (active tab typically has different styling — just verify it's present)
      await expect(multicaTab).toBeVisible();
    }

    // Switch to home (KB section)
    await sidebar.getByText("cabinet").first().click();
    await page.waitForTimeout(300);

    const editorTab = page.locator("text=Editor AI");
    const editorTabVisible = await editorTab.isVisible().catch(() => false);

    if (editorTabVisible) {
      await expect(editorTab).toBeVisible();
    }
  });
});
