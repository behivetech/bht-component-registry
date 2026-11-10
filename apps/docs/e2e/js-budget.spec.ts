import { expect, test } from "@playwright/test";
import { collectScripts, totalBytes } from "./scripts";

/**
 * JavaScript budgets: the uncompressed script bytes a page, or one example
 * frame, fetches. They sit about 10% above what the site weighs now, so
 * ordinary growth passes and a step change (the whole registry, the editor or
 * the transformer landing on a page that does not need them) fails. If a
 * budget fails for a reason you accept, raise it here in the same change and say why.
 *
 * Sizes are Chromium's, from the static build; they do not depend on the
 * machine. The numbers include the framework runtime and the docs chrome every
 * page shares, which is most of each.
 */
const KB = 1024;
const BUDGET_KB = {
  // Measured: 486, 468, 495 and 681 KB.
  componentPage: 535,
  guidePage: 515,
  scopePage: 545,
  sandboxFrame: 750,
};

test.describe("javascript budget", () => {
  test("a component page", async ({ page }) => {
    const readScripts = collectScripts(page);
    await page.goto("/example/atoms/price-tag");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const main = (await readScripts()).filter((script) => script.inMainFrame);
    console.log(`componentPage ${Math.round(totalBytes(main) / KB)} KB`);
    expect(totalBytes(main)).toBeLessThanOrEqual(BUDGET_KB.componentPage * KB);
  });

  test("a guide page", async ({ page }) => {
    const readScripts = collectScripts(page);
    await page.goto("/docs/guide/components");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const scripts = await readScripts();
    console.log(`guidePage ${Math.round(totalBytes(scripts) / KB)} KB`);
    expect(totalBytes(scripts)).toBeLessThanOrEqual(BUDGET_KB.guidePage * KB);
  });

  test("a scope page", async ({ page }) => {
    const readScripts = collectScripts(page);
    await page.goto("/example");
    await expect(
      page.locator('[class*="ComponentCard__thumb"]').first(),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    const scripts = await readScripts();
    console.log(`scopePage ${Math.round(totalBytes(scripts) / KB)} KB`);
    expect(totalBytes(scripts)).toBeLessThanOrEqual(BUDGET_KB.scopePage * KB);
  });

  test("one sandbox frame", async ({ page }) => {
    // The frame's program opened as its own document: the same app and the same
    // scripts a frame boots with, with no browser cache shared with a parent
    // page to make the count depend on what was fetched first.
    await page.goto("/example/atoms/price-tag/examples");
    const href = await page
      .getByRole("link", { name: "Open in new tab" })
      .first()
      .getAttribute("href");
    const readScripts = collectScripts(page);
    await page.goto(href!);
    await expect(page.getByText(/\$\d/).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    const scripts = await readScripts();
    console.log(`sandboxFrame ${Math.round(totalBytes(scripts) / KB)} KB`);
    expect(totalBytes(scripts)).toBeLessThanOrEqual(
      BUDGET_KB.sandboxFrame * KB,
    );
  });
});
