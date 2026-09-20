import { test, expect } from "@playwright/test";

/** Keyboard-only trainer session including a placement question. */
test("keyboard-only: complete a placement drill and see feedback", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/trainer/positioning/", { waitUntil: "networkidle" });
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();
  // Tab until the grid has focus
  for (let i = 0; i < 40; i++) {
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("role"));
    if (focused === "grid") break;
    await page.keyboard.press("Tab");
  }
  expect(await page.evaluate(() => document.activeElement?.getAttribute("role"))).toBe("grid");
  // cursor starts at back row col 3; go down into the bench slot 3, left to slot 0 where the unit sits
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter"); // pick up
  await page.keyboard.press("ArrowUp"); // back row, col 0
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight"); // col 3
  await page.keyboard.press("Enter"); // drop
  await expect(page.getByText(/Placed on back row, column 4/)).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/trainer-placement.png", fullPage: true });
  // Tab to Submit and press it
  const submit = page.getByRole("button", { name: "Submit" });
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Correct|Not quite/)).toBeVisible();
  await expect(page.getByText("Principle")).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/trainer-feedback.png", fullPage: true });
  await page.getByRole("button", { name: "Next" }).focus();
  await page.keyboard.press("Enter");
});

test("choice drill flow with mouse", async ({ page }) => {
  await page.goto("/trainer/econ/", { waitUntil: "networkidle" });
  // Whatever question type comes first, answer it with the first available control.
  const fieldset = page.locator("fieldset").first();
  await expect(fieldset).toBeVisible();
  await fieldset.getByRole("button").first().click();
  const order = page.getByRole("button", { name: "This order is my answer" });
  if (await order.isVisible().catch(() => false)) await order.click();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(/^(Correct|Not quite)/).first()).toBeVisible();
  await expect(page.getByText("Principle")).toBeVisible();
  const more = page.getByRole("button", { name: "Explain more" });
  if (await more.isVisible().catch(() => false)) {
    await more.click();
    await expect(page.getByRole("button", { name: "Hide" })).toBeVisible();
  }
});
