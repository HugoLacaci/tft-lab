import { test, expect } from "@playwright/test";

/** One smoke test per route: renders, has an h1, logs no console errors. */
const ROUTES = [
  "/",
  "/guides/",
  "/guides/economy/",
  "/set/",
  "/set/champions/",
  "/set/traits/",
  "/set/items/",
  "/set/augments/",
  "/set/wisps/",
  "/set/comps/",
  "/set/patch-notes/",
  "/trainer/",
  "/trainer/econ/",
  "/trainer/daily/",
  "/lab/",
  "/lab/board/",
  "/lab/odds/",
  "/lab/econ/",
  "/lab/cheatsheet/",
  "/routine/",
  "/tracker/",
  "/compete/",
  "/resources/",
];

for (const route of ROUTES) {
  test(`smoke ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(route, { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(errors, `console errors on ${route}`).toEqual([]);
  });
}

test("404 page for an unknown champion", async ({ page }) => {
  const res = await page.goto("/set/champions/nope/");
  expect(res?.status()).toBe(404);
});
