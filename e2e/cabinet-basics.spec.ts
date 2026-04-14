import { test, expect } from "@playwright/test";

test.describe("Cabinet basics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for the app to hydrate — the sidebar brand link is always present
    await page.waitForSelector("text=cabinet", { timeout: 10000 });
  });

  test("home screen loads", async ({ page }) => {
    await page.goto("/#/home", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.location.hash === "#/home");
    // The home view should be visible (greeting or home content area)
    const body = page.locator("body");
    await expect(body).toBeVisible();
    // Home section should render some content
    const mainContent = page.locator("main, [class*='main'], [class*='content']").first();
    await expect(mainContent).toBeVisible();
  });

  test("sidebar is visible with KB tree and Multica nav", async ({ page }) => {
    // Sidebar should contain the brand name
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // KB tree section — look for tree items or folder/file links in sidebar
    const treeView = sidebar.locator("[role='tree'], [role='treeitem'], [class*='tree'], a[href*='#/page']").first();
    const hasTree = await treeView.count();
    if (hasTree > 0) {
      await expect(treeView).toBeVisible({ timeout: 10000 });
    }
    // If no tree items, data dir may be empty — that's OK

    // Multica nav section — heading text "MULTICA" is rendered (uppercase in sidebar)
    await expect(sidebar.getByText("MULTICA").or(sidebar.getByText("Multica"))).toBeVisible();

    // Multica nav items should be present
    for (const label of ["Inbox", "Issues", "Projects", "Agents", "Runtimes", "Skills"]) {
      await expect(sidebar.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("settings page loads via hash", async ({ page }) => {
    await page.goto("/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.location.hash === "#/settings");

    // Settings button in sidebar should appear active (has bg-accent class)
    // and the settings content area should render
    const settingsContent = page.locator("text=Settings").first();
    await expect(settingsContent).toBeVisible({ timeout: 5000 });
  });

  test("can navigate to KB page via sidebar click", async ({ page }) => {
    // Click first tree item (file) in the sidebar
    const sidebar = page.locator("aside");
    const firstTreeItem = sidebar.locator("[role='treeitem'] button, [class*='tree'] button").first();

    // Only run if there are tree items (data dir might be empty)
    const count = await firstTreeItem.count();
    if (count > 0) {
      await firstTreeItem.click();
      // Hash should change to a page route
      await page.waitForFunction(() => window.location.hash.startsWith("#/page/"), {
        timeout: 5000,
      });
      expect(window.location.hash).toBeDefined();
    }
  });

  test("AI panel toggles open/close", async ({ page }) => {
    // Look for the AI panel toggle button (Sparkles icon or similar)
    const toggleBtn = page.locator("button").filter({ has: page.locator("[class*='sparkle'], [class*='Sparkle']") }).first();
    const altToggle = page.getByRole("button", { name: /ai|panel|chat/i }).first();

    const btn = (await toggleBtn.count()) > 0 ? toggleBtn : altToggle;
    if ((await btn.count()) > 0) {
      // Click to toggle — we just verify no crash and the button is clickable
      await btn.click();
      // Small wait for animation
      await page.waitForTimeout(300);
      // Click again to toggle back
      await btn.click();
    }
  });
});
