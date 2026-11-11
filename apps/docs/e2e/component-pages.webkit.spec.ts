import { expect, test } from "@playwright/test";
import { anyScriptHas, collectScripts, packageMarker } from "./scripts";

/**
 * Component pages in WebKit, on an iPhone 14 profile (the `webkit` project in
 * playwright.config.ts runs only `*.webkit.spec.ts`).
 *
 * iOS Safari kills a page that holds too much memory ("A problem repeatedly
 * occurred"), and WebKit shares one process between a page and its same-origin
 * frames, so every mounted example frame counts against the page. Chromium,
 * which the other specs run in, hides that. These specs hold the two things
 * that keep a long component page alive: a frame loads only the packages its
 * program uses, and frames far from the viewport are not mounted.
 */

const PAGES = [
  "/example/atoms/price-tag",
  "/example/atoms/rating-stars/examples",
  "/example/hooks/use-toggle",
];

for (const path of PAGES) {
  test(`${path} renders its first example in WebKit and survives a scroll to the end`, async ({
    page,
  }) => {
    let crashed = false;
    page.on("crash", () => {
      crashed = true;
    });
    await page.goto(path);
    const firstFrame = page.locator("figure").first().locator("iframe");
    await expect(firstFrame).toBeAttached();
    // The program ran: the frame's root holds what it rendered.
    await expect(
      page.frameLocator("iframe").first().locator('[class*="Sandbox"]').first(),
    ).toHaveText(/\S/);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(firstFrame).toBeAttached();
    expect(crashed).toBe(false);
  });
}

test("a long component page keeps only the frames near the viewport", async ({
  page,
}) => {
  await page.goto("/example/atoms/price-tag");
  const frames = page.locator("iframe");
  const firstFrame = page.locator("figure").first().locator("iframe");
  await expect(firstFrame).toBeAttached();
  const total = await page.locator("figure").count();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(firstFrame).toHaveCount(0);
  await expect.poll(() => frames.count()).toBeLessThan(total);
});

test("a frame loads the packages its program uses and no others", async ({
  page,
}) => {
  const readScripts = collectScripts(page);
  await page.goto("/example/atoms/rating-stars/examples");
  await expect(
    page.frameLocator("iframe").first().getByRole("img").first(),
  ).toBeVisible();
  const scripts = await readScripts();
  expect(anyScriptHas(scripts, packageMarker("RatingStars"))).toBe(true);
  expect(anyScriptHas(scripts, packageMarker("PriceTag"))).toBe(false);
});
