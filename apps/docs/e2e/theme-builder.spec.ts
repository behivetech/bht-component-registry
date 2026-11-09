import { expect, test } from "@playwright/test";

/**
 * The /theme page: the Material Design 3 generator in the browser. It is a
 * static page with a client island, so these run against the exported build
 * like everything else.
 */

test("the builder starts from the site's own seeds and regenerates on a new primary", async ({
  page,
}) => {
  await page.goto("/theme");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Theme builder");
  const primary = page.getByLabel("Primary", { exact: true });
  await expect(primary).toHaveValue("#6750a4"); // registry.config.json#site.theme.primary
  const primaryRole = page.getByRole("cell").filter({ hasText: /^#[0-9a-f]{6}$/ }).first();
  const before = await primaryRole.textContent();

  await primary.fill("#1b5e20");
  await expect(primaryRole).not.toHaveText(before!);
  // The URL carries the theme, so it is a shareable link.
  await expect(page).toHaveURL(/#p=1b5e20/);
});

test("a swatch edit becomes an override that the config snippet carries, and resets", async ({
  page,
}) => {
  await page.goto("/theme#p=6750a4");
  const swatch = page.getByLabel("--md-sys-color-primary (light)");
  await swatch.fill("#112233");
  await expect(page).toHaveURL(/ol=primary%3A112233/);
  await expect(page.getByText('"overrides"')).toBeVisible();
  await page.getByRole("button", { name: /Reset --md-sys-color-primary \(light\)/ }).click();
  await expect(page).not.toHaveURL(/ol=/);
});

test("the CSS downloads and the contrast report is clean for the default seeds", async ({
  page,
}) => {
  await page.goto("/theme#p=6750a4");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download theme.css" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("theme.css");
  const body = await (await download.createReadStream()).toArray();
  expect(Buffer.concat(body).toString()).toContain("--md-sys-color-primary:");
  await expect(page.getByRole("status")).toContainText("Every text role reaches 4.5:1");
  await page.getByText("The CSS", { exact: true }).click();
  await expect(page.getByText("--md-sys-color-on-primary-container:").first()).toBeVisible();
});

test("preview on this site re-themes the page until unchecked", async ({ page }) => {
  await page.goto("/theme#p=1b5e20");
  const primaryBefore = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--md-sys-color-primary").trim(),
  );
  await page.getByLabel("Preview on this site").check();
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--md-sys-color-primary").trim(),
      ),
    )
    .not.toBe(primaryBefore);
  await page.getByLabel("Preview on this site").uncheck();
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--md-sys-color-primary").trim(),
      ),
    )
    .toBe(primaryBefore);
});
