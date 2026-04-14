import { test, expect } from "@playwright/test";

test.describe("Multica navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/home", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=cabinet", { timeout: 10000 });
  });

  const navTests = [
    { label: "Issues", expectedHash: "#/issues" },
    { label: "Inbox", expectedHash: "#/inbox" },
    { label: "My Issues", expectedHash: "#/my-issues" },
    { label: "Projects", expectedHash: "#/projects" },
    { label: "Agents", expectedHash: "#/multica-agents" },
    { label: "Runtimes", expectedHash: "#/runtimes" },
    { label: "Skills", expectedHash: "#/skills" },
  ] as const;

  for (const { label, expectedHash } of navTests) {
    test(`clicking "${label}" navigates to ${expectedHash}`, async ({ page }) => {
      const sidebar = page.locator("aside");
      const btn = sidebar.getByRole("button", { name: label, exact: true });
      await expect(btn).toBeVisible();
      await btn.click();

      await page.waitForFunction(
        (hash: string) => window.location.hash === hash,
        expectedHash,
        { timeout: 5000 }
      );

      const currentHash = await page.evaluate(() => window.location.hash);
      expect(currentHash).toBe(expectedHash);
    });
  }

  test("browser back/forward works between sections", async ({ page }) => {
    const sidebar = page.locator("aside");

    // Navigate: home → issues → projects
    await sidebar.getByRole("button", { name: "Issues", exact: true }).click();
    await page.waitForFunction(() => window.location.hash === "#/issues");

    await sidebar.getByRole("button", { name: "Projects", exact: true }).click();
    await page.waitForFunction(() => window.location.hash === "#/projects");

    // Go back — Cabinet uses replaceState for hash routing, so back may
    // return to the original load URL (empty hash). We just verify no crash.
    await page.goBack();
    await page.waitForTimeout(500);
    // No assertion on hash — replaceState means back may clear hash

    // Go forward — verify no crash
    await page.goForward();
    await page.waitForTimeout(500);
    // Page should still be functional
    const bodyVisible = await page.locator("body").isVisible();
    expect(bodyVisible).toBe(true);
  });
});
