import { expect, test, type Page } from "@playwright/test";

/**
 * Replace the whole program in the first live editor on the page.
 *
 * react-live's editor is a contenteditable <pre> (Chromium gets
 * `plaintext-only`), not a form control, and it only reacts to keystrokes:
 * `fill` and `insertText` change the DOM without it noticing. A select-all
 * keystroke can lose the selection when the page re-renders around the
 * editor (the preview frame reports its height a few times after booting),
 * so the selection is made programmatically and the program typed over it;
 * the caller retries the whole thing until the preview shows it.
 */
async function replaceEditorCode(page: Page, code: string) {
  const editor = page.locator("[contenteditable]").first();
  await editor.click();
  await editor.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.type(code);
}

/**
 * The whole site, as a visitor sees it from a static host. Everything here is
 * build-time data from the registry folder tree, so no accounts, no database
 * and no env are involved.
 *
 * The example scope (registry/example) is what ships with the template; if
 * you delete it, update the names below to one of your own components.
 */

test("home lists the public scopes and shows the site title from registry.config.json", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Example Component Registry/);
  await expect(
    page.getByRole("heading", { name: "Example", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Scopes", exact: true }),
  ).toBeVisible();
});

test("a scope page groups its components and searches them client-side", async ({
  page,
}) => {
  await page.goto("/example");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Example");
  await expect(page.getByRole("heading", { name: /^Atoms/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Price Tag", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("searchbox", { name: "Search components" })
    .fill("rating");
  await expect(
    page.getByRole("link", { name: "Rating Stars", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Price Tag", exact: true }),
  ).toHaveCount(0);
});

test("clicking a catalog card opens that component, not another card's", async ({
  page,
}) => {
  await page.goto("/example");
  // Each title's ::after stretches over its card. If a card stops being their
  // containing block, the last card's overlay covers the page and every click
  // lands there — a real mouse click at the title's position catches that.
  await page.getByRole("link", { name: "Price Tag", exact: true }).click();
  await expect(page).toHaveURL(/\/example\/atoms\/price-tag$/);
});

test("status and tags come from the package's registry field, with no database", async ({
  page,
}) => {
  await page.goto("/example/atoms/rating-stars");
  await expect(page.getByText("Beta", { exact: true })).toBeVisible();
  const tags = page.getByRole("list", { name: "Tags" });
  await expect(tags).toContainText("feedback");
});

test.describe("component page", () => {
  test("overview renders the README live, the examples and the docgen props table", async ({
    page,
  }) => {
    await page.goto("/example/atoms/price-tag");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Price Tag",
    );
    await expect(
      page.getByText("pnpm add @example/atoms.price-tag"),
    ).toBeVisible();

    // An example, executed: a real rendered price, not a screenshot. Live
    // examples run in their own frame (see sandbox-protocol.ts).
    await expect(
      page.frameLocator("iframe").first().getByText(/\$\d/).first(),
    ).toBeVisible();
    // An example's frame is named after it (the README's examples have no
    // title), and the gallery links to the full list.
    const examples = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Examples" }) });
    // Frames mount as they scroll into view, so bring the gallery up first.
    await examples.scrollIntoViewIfNeeded();
    await expect(examples.locator("iframe").first()).toHaveAttribute(
      "title",
      /^\S.* — live preview$/,
    );
    await expect(
      page.getByRole("link", { name: /^Open all \d+/ }),
    ).toHaveAttribute("href", "/example/atoms/price-tag/examples");

    // Props straight from TypeScript via react-docgen. Scoped to the
    // Properties section — the README may have a hand-written table of its own.
    const properties = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Properties" }) });
    // A required prop's cell reads "amount*" (the marker is part of its name), so match the start.
    await expect(
      properties.getByRole("cell", { name: /^amount/ }),
    ).toBeVisible();
    await expect(
      properties.getByRole("cell", { name: "currency", exact: true }),
    ).toBeVisible();
  });

  test("tabs are routes: examples, code, playground and changelog", async ({
    page,
  }) => {
    await page.goto("/example/atoms/price-tag/examples");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Price Tag",
    );

    await page.getByRole("link", { name: "Code" }).click();
    await expect(page).toHaveURL(/\/code$/);
    await expect(
      page.getByText("price-tag.module.scss", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Playground" }).click();
    await expect(
      page.getByText("Every registry export is in scope"),
    ).toBeVisible();

    await page.getByRole("link", { name: "Changelog" }).click();
    await expect(page).toHaveURL(/\/changelog$/);
    await expect(
      page.getByRole("heading", { name: "Changelog" }),
    ).toBeVisible();
  });

  test("editing a live example re-renders it", async ({ page }) => {
    await page.goto("/example/atoms/price-tag/playground");
    const preview = page.frameLocator("iframe").first();
    await expect(preview.getByText(/\$\d/).first()).toBeVisible();

    await expect(async () => {
      await replaceEditorCode(
        page,
        'const Example = () => <PriceTag amount={42} locale="en-US" />;\n\nrender(<Example />);',
      );
      await expect(preview.getByText("$42.00")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });
  });
});

test.describe("preview isolation", () => {
  test("a fixed-position overlay covers its preview, not the docs page", async ({
    page,
  }) => {
    await page.goto("/example/atoms/price-tag/playground");
    const preview = page.frameLocator("iframe").first();
    await expect(preview.getByText(/\$\d/).first()).toBeVisible();

    const frame = page.locator("iframe").first();
    const cover = preview.getByText("COVER");
    await expect(async () => {
      await replaceEditorCode(
        page,
        'const Example = () => <div style={{ position: "fixed", inset: 0, background: "rgb(200, 0, 0)" }}>COVER</div>;\n\nrender(<Example />);',
      );
      await expect(cover).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });

    // `fixed` is relative to the frame's viewport: the overlay's box lies
    // within the frame's box, and the page around it is untouched.
    const frameBox = (await frame.boundingBox())!;
    const coverBox = (await cover.boundingBox())!;
    expect(coverBox.y).toBeGreaterThanOrEqual(frameBox.y - 1);
    expect(coverBox.y + coverBox.height).toBeLessThanOrEqual(
      frameBox.y + frameBox.height + 1,
    );

    // The tab bar above the preview is still the page's to click.
    await page.getByRole("link", { name: "Code" }).click();
    await expect(page).toHaveURL(/\/code$/);
  });

  test("open in new tab renders the same example on its own", async ({
    page,
  }) => {
    await page.goto("/example/atoms/price-tag/playground");
    const href = await page
      .getByRole("link", { name: "Open in new tab" })
      .first()
      .getAttribute("href");
    expect(href).toMatch(/^\/sandbox#/);
    await page.goto(href!);
    await expect(page.getByText(/\$\d/).first()).toBeVisible();
  });

  test("catalog tiles stay inline", async ({ page }) => {
    await page.goto("/example");
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByText(/\$\d/).first()).toBeVisible();
  });
});

test.describe("design links", () => {
  test("a component with a design link gets a Design tab with a card; embeds stay off by default", async ({
    page,
  }) => {
    await page.goto("/example/atoms/price-tag");
    await page
      .getByRole("navigation", { name: "Component sections" })
      .getByRole("link", { name: "Design" })
      .click();
    await expect(page).toHaveURL(/\/design$/);
    await expect(page.getByText("Figma (example link)")).toBeVisible();
    const open = page.getByRole("link", { name: /Open in Figma/ });
    await expect(open).toHaveAttribute(
      "href",
      "https://www.figma.com/design/ExampleFileKey000/Example-Registry?node-id=1-2",
    );
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByText("site.embedDesigns")).toBeVisible();
  });

  test("a component without design links has no Design tab", async ({
    page,
  }) => {
    await page.goto("/example/atoms/rating-stars");
    await expect(
      page
        .getByRole("navigation", { name: "Component sections" })
        .getByRole("link", { name: "Design" }),
    ).toHaveCount(0);
  });
});

test.describe("hooks and utilities", () => {
  test("a hook page shows its signature, parameters and a live example", async ({
    page,
  }) => {
    await page.goto("/example/hooks/use-toggle");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Use Toggle",
    );
    await expect(
      page.getByRole("heading", { name: "Hooks", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("useToggle(initial?: boolean): [boolean, () => void]"),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: /^initial/ })).toBeVisible();
    // The default comes from the signature (`initial = false`), like a prop default.
    await expect(page.getByRole("cell", { name: "false", exact: true })).toBeVisible();
    await expect(page.getByText("The starting value.")).toBeVisible();
    // The example is a live example, like a component's.
    await expect(page.locator("figure").first()).toBeVisible();
  });

  test("a utility page shows its signature and its @example as code", async ({
    page,
  }) => {
    await page.goto("/example/utils/format-price");
    const functions = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Functions", exact: true }),
    });
    await expect(functions).toBeVisible();
    await expect(
      functions.getByText("formatPrice(value: string): string"),
    ).toBeVisible();
    // The @example block, shown as a titled code block (the scope is also called "Example", hence the scoping).
    await expect(functions.getByText("Example", { exact: true })).toBeVisible();
    await expect(functions.getByText("formatPrice('hello')")).toBeVisible();
    // Nothing runs: an @example is shown, not executed.
    await expect(page.locator("figure")).toHaveCount(0);
  });

  test("the scope page groups hooks and utilities and gives their tiles a placeholder", async ({
    page,
  }) => {
    await page.goto("/example");
    await expect(page.getByRole("heading", { name: /^Hooks/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Utilities/ }),
    ).toBeVisible();
    await expect(
      page
        .getByText("No visual preview — see its signatures and examples")
        .first(),
    ).toBeVisible();
  });
});

test.describe("docs section", () => {
  test("the index lists the owner's pages and the guide by section", async ({
    page,
  }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Documentation",
    );
    await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Guide" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Contributing" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Getting started" }).first(),
    ).toBeVisible();
    // The header links to the section whenever there is at least one page;
    // the footer links the Terms page while the owner keeps it.
    await expect(
      page
        .getByRole("navigation", { name: "Registry" })
        .getByRole("link", { name: "Docs" }),
    ).toBeVisible();
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Terms" }),
    ).toHaveAttribute("href", "/docs/guide/terms");
  });

  test("a guide page renders with the sidebar and resolves its relative links", async ({
    page,
  }) => {
    await page.goto("/docs/guide/components");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Components",
    );
    const nav = page.getByRole("navigation", { name: "Docs" });
    await expect(nav.getByRole("link", { name: "Components" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // `[Generators](generators.md)` in the Markdown becomes a site route.
    await page
      .getByRole("main")
      .getByRole("link", { name: "Generators", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/docs\/guide\/generators$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Generators",
    );
  });

  test("only fences marked live run; the rest stay code", async ({ page }) => {
    // The Standards seed page has one ```jsx live fence; a live example
    // renders as a <figure> whichever way the preview is mounted.
    await page.goto("/docs/standards");
    await expect(page.locator("figure")).toHaveCount(1);
    // The Components guide shows README snippets (```jsx, no `live`) as code.
    await page.goto("/docs/guide/components");
    await expect(page.locator("figure")).toHaveCount(0);
  });
});

test.describe("routing", () => {
  test("an unknown scope is a real 404", async ({ page }) => {
    const response = await page.goto("/no-such-scope");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: /not found/i }),
    ).toBeVisible();
  });

  test("an unknown component in a known scope is a real 404", async ({
    page,
  }) => {
    const response = await page.goto("/example/atoms/no-such-thing");
    expect(response?.status()).toBe(404);
  });
});

test.describe("theme", () => {
  // WCAG 2.x relative-luminance contrast of two colors given as [r, g, b]
  // bytes. Computed colors are resolved to bytes in the page (see `rgb`),
  // because a derived color serializes as `color(srgb …)` or `oklch(…)`, not
  // `rgb(…)`.
  type Rgb = [number, number, number];
  const contrast = (fg: Rgb, bg: Rgb) => {
    const linear = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const lum = ([r, g, b]: Rgb) =>
      0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    const hi = Math.max(lum(fg), lum(bg));
    const lo = Math.min(lum(fg), lum(bg));
    return (hi + 0.05) / (lo + 0.05);
  };
  // Runs in the page: paint the CSS color on a canvas and read the bytes back.
  const rgb = (color: string): Rgb => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r!, g!, b!];
  };

  for (const scheme of ["light", "dark"] as const) {
    test(`the configured primaryColor keeps the filled button legible in the ${scheme} scheme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      // The hero's first action is a filled (primary) button: the configured
      // colour is its background and the scheme's on-primary its label.
      const filled = page.getByRole("link", { name: "Browse @example" });
      const colors = await filled.evaluate((el, resolve) => {
        const toRgb = new Function("color", `return (${resolve})(color)`) as (
          c: string,
        ) => [number, number, number];
        const s = getComputedStyle(el);
        return {
          fg: toRgb(s.color),
          bg: toRgb(s.backgroundColor),
          bgAlpha: s.backgroundColor,
          // The page background is on <html> (tokens.scss), not <body>.
          surface: toRgb(getComputedStyle(document.documentElement).backgroundColor),
        };
      }, rgb.toString());
      expect(colors.bgAlpha).not.toMatch(/rgba\(\d+, \d+, \d+, 0\)/);
      expect(contrast(colors.fg, colors.bg)).toBeGreaterThanOrEqual(4.5);
      // And the same primary as text on the page's surface must read too: the
      // scope card's "Browse" button is outlined, so its label is the primary
      // role on the page background (the hero's second CTA is white on the
      // image, so it would prove nothing).
      const outlined = page.getByRole("link", { name: "Browse Example" });
      const label = await outlined.evaluate((el, resolve) => {
        const toRgb = new Function("color", `return (${resolve})(color)`) as (
          c: string,
        ) => [number, number, number];
        return toRgb(getComputedStyle(el).color);
      }, rgb.toString());
      expect(contrast(label, colors.surface)).toBeGreaterThanOrEqual(4.5);
    });
  }

  test("without a configured primaryColor the dark scheme falls back to the sheet's own pair", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.evaluate(() => document.documentElement.style.removeProperty("--site-primary"));
    const filled = page.getByRole("link", { name: "Browse @example" });
    const colors = await filled.evaluate((el) => {
      const s = getComputedStyle(el);
      return { fg: s.color, bg: s.backgroundColor };
    });
    expect(colors.bg).toBe("rgb(206, 189, 254)"); // #cebdfe
    expect(colors.fg).toBe("rgb(53, 39, 93)"); // #35275d
  });
});
