import { expect, test } from "@playwright/test";

/**
 * Docs per released version. The template's example scope ships with one
 * snapshot per package under docs-history/example/ (the e2e fixture; it is
 * template-only and never reaches a created registry), so these pages exist
 * in the static build: /example/atoms/price-tag/v/0_0_0 and the tabs beside
 * it (/code/v/0_0_0, …). A direct `goto` proves the host serves the page as
 * file, not a folder listing.
 */

const base = "/example/atoms/price-tag";

test("the component header offers the versions and the switcher navigates to a snapshot", async ({
  page,
}) => {
  await page.goto(base);
  const switcher = page.getByLabel("Version");
  await expect(switcher).toHaveValue("latest");
  await expect(switcher.locator("option")).toHaveText([
    "latest (v0.0.0)",
    "v0.0.0 (snapshot of latest)",
  ]);
  await switcher.selectOption("0.0.0");
  await expect(page).toHaveURL(`${base}/v/0_0_0`);
  await expect(page.getByRole("status")).toContainText("snapshot of v0.0.0");
  // The overview as it stood: README and the props table.
  await expect(page.getByRole("heading", { name: "Properties" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /^amount/ })).toBeVisible();
  // Back to latest lands on the live page.
  await switcher.selectOption("latest");
  await expect(page).toHaveURL(base);
});

test("a snapshot has Overview, Examples, Code and Changelog, and keeps the tab when switching", async ({
  page,
}) => {
  await page.goto(`${base}/code`);
  await page.getByLabel("Version").selectOption("0.0.0");
  await expect(page).toHaveURL(`${base}/code/v/0_0_0`);
  const tabs = page.getByRole("navigation", { name: "Component sections" }).getByRole("link");
  await expect(tabs).toHaveText(["Overview", "Examples", "Code", "Changelog"]);
  await expect(tabs.filter({ hasText: "Code" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("price-tag.tsx", { exact: true })).toBeVisible();
  await expect(page.getByText("at v0.0.0, snapshotted")).toBeVisible();
});

test("a snapshot's examples are code, not live frames", async ({ page }) => {
  await page.goto(`${base}/examples/v/0_0_0`);
  await expect(page.getByText("are shown as code")).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByText("render(").first()).toBeVisible();
  await page.getByRole("link", { name: "Open the live examples →" }).click();
  await expect(page).toHaveURL(`${base}/examples`);
});

test("a snapshot URL opened directly is the page, not a folder listing", async ({ page }) => {
  const response = await page.goto(`${base}/v/0_0_0`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Price Tag v0\.0\.0/);
});

test("the snapshot changelog stops at its version", async ({ page }) => {
  await page.goto(`${base}/changelog/v/0_0_0`);
  await expect(page.getByRole("heading", { name: "Changelog up to v0.0.0" })).toBeVisible();
});

test("a version that was never snapshotted is a real 404", async ({ page }) => {
  const response = await page.goto(`${base}/v/9_9_9`);
  expect(response?.status()).toBe(404);
});
