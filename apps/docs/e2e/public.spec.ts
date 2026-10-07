import { expect, test } from "@playwright/test";

/**
 * The whole site, as a visitor sees it from a static host. Everything here is
 * build-time data from the registry folder tree, so no accounts, no database
 * and no env are involved.
 *
 * The example scope (registry/example) is what ships with the template; if
 * you delete it, update the names below to one of your own components.
 */

test("home lists the public scopes and shows the site title from registry.config.json", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Example Component Registry/);
  await expect(page.getByRole("heading", { name: "Example", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scopes", exact: true })).toBeVisible();
});

test("a scope page groups its components and searches them client-side", async ({ page }) => {
  await page.goto("/example");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Example");
  await expect(page.getByRole("heading", { name: /^Atoms/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Price Tag", exact: true })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search components" }).fill("rating");
  await expect(page.getByRole("link", { name: "Rating Stars", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Price Tag", exact: true })).toHaveCount(0);
});

test("clicking a catalog card opens that component, not another card's", async ({ page }) => {
  await page.goto("/example");
  // Each title's ::after stretches over its card. If a card stops being their
  // containing block, the last card's overlay covers the page and every click
  // lands there — a real mouse click at the title's position catches that.
  await page.getByRole("link", { name: "Price Tag", exact: true }).click();
  await expect(page).toHaveURL(/\/example\/atoms\/price-tag$/);
});

test("status and tags come from the package's registry field, with no database", async ({ page }) => {
  await page.goto("/example/atoms/rating-stars");
  await expect(page.getByText("Beta", { exact: true })).toBeVisible();
  const tags = page.getByRole("list", { name: "Tags" });
  await expect(tags).toContainText("feedback");
});

test.describe("component page", () => {
  test("overview renders the README live, the compositions and the docgen props table", async ({ page }) => {
    await page.goto("/example/atoms/price-tag");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Price Tag");
    await expect(page.getByText("pnpm add @example/atoms.price-tag")).toBeVisible();

    // A composition, executed: a real rendered price, not a screenshot.
    await expect(page.getByText(/\$\d/).first()).toBeVisible();

    // Props straight from TypeScript via react-docgen. Scoped to the
    // Properties section — the README may have a hand-written table of its own.
    const properties = page.locator("section").filter({ has: page.getByRole("heading", { name: "Properties" }) });
    // A required prop's cell reads "amount*" (the marker is part of its name), so match the start.
    await expect(properties.getByRole("cell", { name: /^amount/ })).toBeVisible();
    await expect(properties.getByRole("cell", { name: "currency", exact: true })).toBeVisible();
  });

  test("tabs are routes: compositions, code, playground and changelog", async ({ page }) => {
    await page.goto("/example/atoms/price-tag/compositions");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Price Tag");

    await page.getByRole("link", { name: "Code" }).click();
    await expect(page).toHaveURL(/\/code$/);
    await expect(page.getByText("price-tag.module.scss", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Playground" }).click();
    await expect(page.getByText("Every registry export is in scope")).toBeVisible();

    await page.getByRole("link", { name: "Changelog" }).click();
    await expect(page).toHaveURL(/\/changelog$/);
    await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible();
  });

  test("editing a live example re-renders it", async ({ page }) => {
    await page.goto("/example/atoms/price-tag/playground");
    // react-live's editor is a contenteditable <pre> (Chromium gets
    // `plaintext-only`), not a form control.
    const editor = page.locator("[contenteditable]").first();
    await editor.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type('const Example = () => <PriceTag amount={42} locale="en-US" />;\n\nrender(<Example />);');
    await expect(page.getByText("$42.00")).toBeVisible();
  });
});

test.describe("routing", () => {
  test("an unknown scope is a real 404", async ({ page }) => {
    const response = await page.goto("/no-such-scope");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  });

  test("an unknown component in a known scope is a real 404", async ({ page }) => {
    const response = await page.goto("/example/atoms/no-such-thing");
    expect(response?.status()).toBe(404);
  });
});
