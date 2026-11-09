import { expect, test } from "@playwright/test";

/**
 * Docs per released version. The template's example scope ships with one
 * snapshot per package under docs-history/example/ (the e2e fixture; it is
 * template-only and never reaches a created registry), so these pages exist
 * in the static build: /example/atoms/price-tag/v (the versions index),
 * /example/atoms/price-tag/v/0_0_0 and its tabs. A direct `goto` proves the
 * host serves the page as a plain file (dots become underscores in the URL
 * for that reason).
 */

const base = "/example/atoms/price-tag";
const switcher = (page: import("@playwright/test").Page) =>
  page.locator("summary", { hasText: /^v0\.0\.0/ });

test("the component header offers the versions and a link opens a snapshot", async ({
  page,
}) => {
  await page.goto(base);
  await expect(switcher(page)).toHaveText("v0.0.0 (latest)");
  await switcher(page).click();
  const options = page.getByRole("link", { name: /^latest \(v|^v0\.0\.0 \(snapshot|^All versions/ });
  await expect(options).toHaveText(["latest (v0.0.0)", "v0.0.0 (snapshot of latest)", "All versions…"]);
  await options.nth(1).click();
  await expect(page).toHaveURL(`${base}/v/0_0_0`);
  await expect(page.getByText("snapshot of v0.0.0")).toBeVisible();
  // The overview as it stood: README and the props table.
  await expect(page.getByRole("heading", { name: "Properties" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /^amount/ })).toBeVisible();
  // Back to latest lands on the live page.
  await switcher(page).click();
  await page.getByRole("link", { name: "latest (v0.0.0)" }).click();
  await expect(page).toHaveURL(base);
});

test("a snapshot has Overview, Examples, Code and Changelog, and keeps the tab when switching", async ({
  page,
}) => {
  await page.goto(`${base}/code`);
  await switcher(page).click();
  await page.getByRole("link", { name: "v0.0.0 (snapshot of latest)" }).click();
  await expect(page).toHaveURL(`${base}/v/0_0_0/code`);
  const tabs = page.getByRole("navigation", { name: "Component sections" }).getByRole("link");
  await expect(tabs).toHaveText(["Overview", "Examples", "Code", "Changelog"]);
  await expect(tabs.filter({ hasText: "Code" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("price-tag.tsx", { exact: true })).toBeVisible();
  await expect(page.getByText("at v0.0.0, snapshotted")).toBeVisible();
});

test("a snapshot's examples are code, not live frames, and the overview links to them", async ({
  page,
}) => {
  await page.goto(`${base}/v/0_0_0`);
  await page.getByRole("link", { name: /^Open all \d+/ }).click();
  await expect(page).toHaveURL(`${base}/v/0_0_0/examples`);
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

test("the versions index lists every snapshot", async ({ page }) => {
  const response = await page.goto(`${base}/v`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Versions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "v0.0.0" })).toHaveAttribute("href", `${base}/v/0_0_0`);
  await expect(page.getByText("(current)")).toBeVisible();
});

test("the snapshot changelog stops at its version", async ({ page }) => {
  await page.goto(`${base}/v/0_0_0/changelog`);
  await expect(page.getByRole("heading", { name: "Changelog up to v0.0.0" })).toBeVisible();
});

test("a version that was never snapshotted is a real 404", async ({ page }) => {
  const response = await page.goto(`${base}/v/9_9_9`);
  expect(response?.status()).toBe(404);
});
