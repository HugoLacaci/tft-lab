import { test, expect } from "@playwright/test";

/**
 * Site chrome: the comps access from the home page, the search palette, the
 * phone menu sheet and bottom bar, and no horizontal overflow at phone
 * landscape / tablet / desktop widths on the pages people land on.
 */
test("home leads to the comps tier list in one click", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("hero-comps")).toBeVisible();
  await expect(page.getByTestId("comps-spotlight")).toBeVisible();
  await page.getByTestId("hero-comps").click();
  await expect(page).toHaveURL(/\/set\/comps\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Set");
});

test("search palette opens with Ctrl K and navigates", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("Control+k");
  const input = page.getByRole("textbox", { name: "Search" });
  await expect(input).toBeVisible();
  await input.fill("guinsoo");
  await expect(page.locator(".search-row").first()).toContainText(/Guinsoo/i);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/set\/items\//);
});

test("phone: bottom bar and menu sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/set/comps/", { waitUntil: "networkidle" });
  const bar = page.getByRole("navigation", { name: "Quick navigation" });
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("link", { name: /Comps/ })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("link", { name: /Trainer/ }).last()).toBeVisible();
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});

for (const [w, h] of [
  [844, 390],
  [1024, 768],
  [1366, 768],
  [1920, 1080],
] as const) {
  test(`no horizontal overflow at ${w}×${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    for (const route of ["/", "/set/comps/", "/set/champions/", "/set/items/"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} at ${w}px`).toBeLessThanOrEqual(0);
    }
  });
}

test("deep link opens a comp", async ({ page }) => {
  await page.goto("/set/comps/", { waitUntil: "networkidle" });
  const first = page.locator('[id^="comp-"]').first();
  const id = await first.getAttribute("id");
  await page.goto(`/set/comps/#${id}`, { waitUntil: "networkidle" });
  await expect(page.locator(`#${id} [aria-expanded="true"]`)).toBeVisible();
});
