import { test, expect } from "@playwright/test";

/**
 * Board screenshots at the three widths named in the acceptance criteria.
 * Output goes to e2e/screenshots/ (gitignored); look at them.
 * Also asserts the page never scrolls horizontally.
 */
const WIDTHS = [360, 768, 1440];

for (const w of WIDTHS) {
  test(`board renders at ${w}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 1100 });
    await page.goto("/lab/board/", { waitUntil: "networkidle" });
    await expect(page.getByRole("grid")).toBeVisible();
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `e2e/screenshots/board-${w}.png`, fullPage: true });
    // versus mode
    await page.getByRole("button", { name: "Versus" }).click();
    await page.waitForTimeout(200);
    const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow2).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `e2e/screenshots/board-versus-${w}.png`, fullPage: true });
  });
}

test("tracker with logged games, odds and cheat sheet screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/tracker/", { waitUntil: "networkidle" });
  const games: [number, string, string][] = [[4, "AD flex", "econ"], [7, "Reroll", "hp-management"], [2, "AD flex", "none"], [6, "AP fast 8", "items"], [3, "AD flex", "econ"], [8, "Reroll", "econ"], [1, "AP fast 8", "none"]];
  for (const [p, comp, leak] of games) {
    await page.getByRole("group", { name: "Placement" }).getByRole("button", { name: String(p), exact: true }).click();
    await page.getByPlaceholder(/e\.g\./).fill(comp);
    await page.locator("select").selectOption(leak);
    await page.getByRole("button", { name: "Log game" }).click();
  }
  await expect(page.getByText("7", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/tracker.png", fullPage: true });
  await page.goto("/lab/odds/", { waitUntil: "networkidle" });
  await page.screenshot({ path: "e2e/screenshots/odds.png", fullPage: true });
  await page.goto("/lab/cheatsheet/", { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: "e2e/screenshots/cheatsheet-print.png", fullPage: true });
});
