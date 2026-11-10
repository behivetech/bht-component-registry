import { expect, test } from "@playwright/test";
import {
  EDITOR_MARKER,
  SUCRASE_MARKER,
  anyScriptHas,
  collectScripts,
  packageMarker,
} from "./scripts";

/**
 * The owner's rule: a page loads only what it renders. These specs read the
 * scripts a page and its frames really fetch, so a regression that puts the
 * whole registry (or the editor, or the transformer) back on a page fails here
 * instead of in a visitor's phone.
 */

const PRICE_TAG = packageMarker("PriceTag");
const RATING_STARS = packageMarker("RatingStars");

test.describe("a page loads only what it renders", () => {
  test("a frame loads the packages its program uses and no others", async ({
    page,
  }) => {
    const readScripts = collectScripts(page);
    await page.goto("/example/atoms/rating-stars/examples");
    await expect(
      page.frameLocator("iframe").first().getByRole("img").first(),
    ).toBeVisible();
    const scripts = await readScripts();
    expect(anyScriptHas(scripts, RATING_STARS)).toBe(true);
    expect(anyScriptHas(scripts, PRICE_TAG)).toBe(false);
  });

  test("the other package's frame loads that one instead", async ({ page }) => {
    const readScripts = collectScripts(page);
    await page.goto("/example/atoms/price-tag/examples");
    await expect(
      page.frameLocator("iframe").first().getByText(/\$\d/).first(),
    ).toBeVisible();
    const scripts = await readScripts();
    expect(anyScriptHas(scripts, PRICE_TAG)).toBe(true);
    expect(anyScriptHas(scripts, RATING_STARS)).toBe(false);
  });

  test("a frame runs the program with sucrase, and the docs page does not load it", async ({
    page,
  }) => {
    const readScripts = collectScripts(page);
    await page.goto("/example/atoms/price-tag/examples");
    await expect(
      page.frameLocator("iframe").first().getByText(/\$\d/).first(),
    ).toBeVisible();
    const scripts = await readScripts();
    expect(
      anyScriptHas(
        scripts.filter((script) => !script.inMainFrame),
        SUCRASE_MARKER,
      ),
    ).toBe(true);
    expect(
      anyScriptHas(
        scripts.filter((script) => script.inMainFrame),
        SUCRASE_MARKER,
      ),
    ).toBe(false);
  });

  test("the code editor loads when Edit code is opened, not before", async ({
    page,
  }) => {
    const readScripts = collectScripts(page);
    await page.goto("/example/atoms/price-tag/examples");
    await expect(
      page.frameLocator("iframe").first().getByText(/\$\d/).first(),
    ).toBeVisible();
    expect(anyScriptHas(await readScripts(), EDITOR_MARKER)).toBe(false);

    await page.getByRole("button", { name: "Edit code" }).first().click();
    await expect(page.locator("[contenteditable]").first()).toBeVisible();
    expect(anyScriptHas(await readScripts(), EDITOR_MARKER)).toBe(true);
  });

  test("a guide page with no live block loads neither the transformer nor the editor", async ({
    page,
  }) => {
    const readScripts = collectScripts(page);
    await page.goto("/docs/guide/getting-started");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const scripts = await readScripts();
    expect(anyScriptHas(scripts, SUCRASE_MARKER)).toBe(false);
    expect(anyScriptHas(scripts, EDITOR_MARKER)).toBe(false);
  });
});

test.describe("catalog tiles are static markup", () => {
  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the scope page shows each tile's component, styled", async ({
      page,
    }) => {
      await page.goto("/example");
      const price = page
        .locator('[class*="ComponentCard__thumb"] [class*="ACME__PriceTag"]')
        .first();
      await expect(price).toBeVisible();
      await expect(price.locator('[class*="__amount"]')).toHaveText(/\$\d/);
      // Its stylesheet came with the page: an unstyled span is not a flex box.
      await expect(price).toHaveCSS("display", "inline-flex");
    });
  });

  test("the scope page loads no registry package code and no frame for them", async ({
    page,
  }) => {
    const readScripts = collectScripts(page);
    await page.goto("/example");
    await expect(
      page.locator('[class*="ComponentCard__thumb"]').first(),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    const scripts = await readScripts();
    expect(anyScriptHas(scripts, PRICE_TAG)).toBe(false);
    expect(anyScriptHas(scripts, RATING_STARS)).toBe(false);
    expect(anyScriptHas(scripts, SUCRASE_MARKER)).toBe(false);
    await expect(page.locator("iframe")).toHaveCount(0);
  });

  test("a tile has its own ids, not a copy of another tile's", async ({
    page,
  }) => {
    await page.goto("/example");
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll("[id]")].map((element) => element.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
