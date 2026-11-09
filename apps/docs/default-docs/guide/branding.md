---
title: Branding
description: Your logo, icons, colours, fonts and home-page hero, all from registry.config.json and a branding/ folder that update never touches.
order: 5
---

# Branding

Everything that makes the docs site yours comes from two places: the `site` object in `registry.config.json` and a `branding/` folder at the repo root for the files it names. Neither is touched by `npx create-bht-component-registry update`, so a template update never costs you a logo. No code changes are needed for any of it.

## The `branding/` folder

Create `branding/` at the root of the repo and put your assets in it:

```
branding/
├─ logo.svg               header logo
├─ logo-dark.svg          optional: a version for the dark scheme
├─ mark.svg               favicon
├─ apple-touch-icon.png   180×180
├─ icon-192.png
├─ icon-512.png
└─ fonts/
   ├─ ubuntu-latin-400.woff2
   └─ iceland-latin-400.woff2
```

Before every `dev` and `build`, the catalog step copies the folder to `apps/docs/public/branding/` (gitignored) so the static export serves it at `/branding/<file>`. Reference a file by its path inside the folder: `"logo": "logo.svg"`, `"apple": "apple-touch-icon.png"`, `"path": "fonts/ubuntu-latin-400.woff2"`. An absolute `https://` URL works too. The build warns about a path that points at a file that does not exist.

Do not put brand files under `apps/docs/public`: that folder is template-owned and `update` replaces it. A value starting with `/` still works for registries that did that, with a warning at build time.

## Logo, icons and header

```json
{
  "site": {
    "title": "Acme Components",
    "logo": "logo.svg",
    "logoDark": "logo-dark.svg",
    "favicon": "mark.svg",
    "icons": {
      "apple": "apple-touch-icon.png",
      "png192": "icon-192.png",
      "png512": "icon-512.png"
    },
    "themeColor": "#2c1760",
    "headerTheme": "dark"
  }
}
```

| Key | What it does |
|---|---|
| `logo` | Shown in the header instead of the title text, 28px high. SVG keeps it sharp. |
| `logoDark` | Swapped in when the page is in the dark scheme (the visitor's OS preference, or `data-theme="dark"`). Omit to use `logo` in both. |
| `favicon` | The browser-tab icon. An SVG scales to every size; an `.ico` works too. Omit to keep the template's default `favicon.ico`. |
| `icons.apple`, `icons.png192`, `icons.png512` | PNG icons for home screens and install prompts. |
| `themeColor` | The browser-chrome tint on mobile (`<meta name="theme-color">`). Defaults to the theme's primary colour. |
| `headerTheme` | `"dark"` keeps the header on the dark scheme's surface in both colour schemes, so a light wordmark always has its background. Default `"light"`. |

A wordmark that is white or very light needs `headerTheme: "dark"`; a wordmark that is dark on transparent works with the default and a `logoDark` for the dark scheme.

## Colours

The site is themed with Material Design 3 roles (`--md-sys-color-*`), and every component in the registry reads the same roles. You give the build seed colours; it generates every role for the light and the dark scheme with Google's own Material Design 3 colour algorithm (`@material/material-color-utilities`):

```json
{
  "site": {
    "theme": {
      "primary": "#2c1760",
      "secondary": "#43b505",
      "scheme": "tonalspot"
    }
  }
}
```

| Key | What it does |
|---|---|
| `theme.primary` | Required. Your brand colour. MD3 picks the tone that reads as a filled button and as text on the page, so a very dark or very light brand colour still produces a legible primary. |
| `theme.secondary`, `theme.tertiary` | Pinned accents. A pinned seed keeps its own hue, so a brand green stays green; without one MD3 derives a muted secondary and a rotated tertiary from the primary. |
| `theme.neutral` | Tints backgrounds and surfaces toward this hue at MD3's low chroma. Without it they follow the primary. |
| `theme.scheme` | The MD3 variant: `tonalspot` (default), `vibrant`, `expressive`, `fidelity`, `content`, `neutral`, `monochrome`. `fidelity` and `content` keep the primary closest to the seed. |
| `theme.contrast` | `standard` (default), `medium` or `high`. |

The generated sheet is `apps/docs/src/generated/theme.css`; it is rebuilt on every `dev` and `build`, never edited. The `/theme` page on your site is an interactive version of the same generator: pick colours, watch every role update, edit a role by hand, and download the CSS or copy the `site.theme` snippet back into this file. See [Design tokens](design-tokens.md).

`primaryColor`, the single colour earlier templates accepted, still works and means `theme.primary`.

## Fonts

Fonts are self-hosted from `branding/fonts/` and loaded with `next/font/local`: no request goes to a font service at build or run time, which also keeps the build working offline and in CI without network exceptions.

```json
{
  "site": {
    "fonts": {
      "body": {
        "family": "Ubuntu",
        "files": [
          { "path": "fonts/ubuntu-latin-400.woff2", "weight": "400" },
          { "path": "fonts/ubuntu-latin-500.woff2", "weight": "500" },
          { "path": "fonts/ubuntu-latin-700.woff2", "weight": "700" }
        ]
      },
      "heading": {
        "family": "Iceland",
        "files": [{ "path": "fonts/iceland-latin-400.woff2", "weight": "400" }]
      }
    }
  }
}
```

`body` covers the body, label and title roles; `heading` the headline and display roles. Omit `heading` to use the body face for everything; omit both to keep Inter, the template's default. A variable font is one file with `"weight": "100 900"`.

Where to get the files: most open fonts are on npm as `@fontsource/<name>` packages, with latin subsets at `files/<name>-latin-<weight>-normal.woff2`. Copy the weights you use into `branding/fonts/` (`npm pack @fontsource/ubuntu` unpacks the package without adding a dependency).

## Home page hero

```json
{
  "site": {
    "hero": {
      "headline": "Acme Components",
      "subtext": "The building blocks of every Acme product.",
      "actions": [
        { "label": "Browse components", "href": "/acme" },
        { "label": "Docs", "href": "/docs" },
        { "label": "Design system", "href": "https://design.acme.example" }
      ]
    }
  }
}
```

With no `hero`, the headline is the site title, the text is `site.description`, and the buttons are "Browse components" into your scope and, when the Docs section has pages, "Docs". A configured `actions` list replaces the defaults; the first button is filled, the rest outlined.

## What the template leaves as it is

- `site.title` and `site.description` set the `<title>` template, the hero defaults and the meta description.
- `site.links` are the header and footer links.
- The footer's "Built with bht-component-registry" credit stays; the Terms link follows the `guide/terms` page while you keep it (see [Updating](updating.md)).

## Related

- [Scopes](scopes.md): every key of `registry.config.json`.
- [Design tokens](design-tokens.md): the tokens page and the theme builder.
- [Updating](updating.md): what `update` touches and what it never touches.
