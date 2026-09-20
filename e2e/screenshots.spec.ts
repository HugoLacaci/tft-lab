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
