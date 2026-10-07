# Design tokens

A scope can point at a `tokens.scss` from its `scope.json`, and the docs site then adds a Design tokens page listing the colour roles, type scale and shape tokens it finds there, with light and dark values side by side. The page and its nav item exist only when some scope declares a tokens file, so a registry without a theme has no empty page.

## Declare the file

In `registry/<scope>/scope.json`, add `tokens` with a path relative to the scope folder:

```json
{
  "name": "Acme",
  "tagline": "Commerce components for Acme's storefronts.",
  "visibility": "public",
  "tokens": "theme/tokens.scss"
}
```

The file can live anywhere under the scope folder. Keeping it inside a `theme` package (`registry/acme/theme/tokens/tokens.scss`, declared as `"tokens": "theme/tokens/tokens.scss"`) lets you publish it like any other component so consuming apps install the same sheet.

Then rebuild (`pnpm dev` restarts the catalog step). The page is at `/tokens`.

## What the page reads

The extractor looks for Material Design 3 custom properties in two blocks:

- the first `:root { … }` block, read as the light scheme;
- a `:root[data-theme="dark"] { … }` block, read as the dark scheme.

Within those it collects:

| Group | Pattern | Shown as |
|---|---|---|
| Colour roles | `--md-sys-color-<role>` | a swatch per role with its light and dark values |
| Type scale | `--md-sys-typescale-<name>-size`, `-line-height`, `-weight` where `<name>` is like `body-large`, `title-medium` | a row per style with size, line height and weight |
| Shape | `--md-sys-shape-corner-<name>` | a row per corner radius |

Anything that does not match is ignored, so a reorganised sheet degrades to fewer swatches rather than a broken build.

A minimal sheet:

```scss
:root {
  --md-sys-color-primary: #6750a4;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-surface: #fef7ff;
  --md-sys-color-on-surface: #1d1b20;

  --md-sys-typescale-body-large-size: 1rem;
  --md-sys-typescale-body-large-line-height: 1.5rem;
  --md-sys-typescale-body-large-weight: 400;

  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-medium: 12px;
}

:root[data-theme="dark"] {
  --md-sys-color-primary: #d0bcff;
  --md-sys-color-on-primary: #381e72;
  --md-sys-color-surface: #141218;
  --md-sys-color-on-surface: #e6e0e9;
}
```

## Using the tokens in components

The component template styles with CSS custom properties, so a component reads `var(--md-sys-color-primary)` and picks up whichever theme the host page sets. The docs site's own chrome uses the same MD3 token names in `apps/docs/src/app/globals.scss`, with `registry.config.json#site.primaryColor` as the primary role, so your components look at home on the docs pages without importing the site's styles.

If your tokens are not MD3-named, the page shows only what matches. You can keep your own names in the sheet and add MD3 aliases for the roles you want on the page, or skip the page by leaving `tokens` out of `scope.json`.

## Related

- [Scopes](scopes.md)
- [Components](components.md)
- [Getting started](getting-started.md)
- [Deploy](deploy.md)
- [FAQ](faq.md)
