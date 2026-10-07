# Scopes

A scope is the npm scope your components are published under, and the first folder level under `registry/`. Every repo has one primary scope, named in `registry.config.json`; the generator defaults to it and every package it writes is `@<scope>/<category>.<name>`. Each scope folder carries a small `scope.json` with its display name, tagline, visibility and an optional design-tokens path. More scopes can live in the same repo, but one is primary.

## The one-scope rule

`registry.config.json#scope` names the scope this repo publishes. The create command, the generator and the catalog all validate it:

- lowercase letters, digits and hyphens only; it must start and end with a letter or digit; at most 40 characters (`^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$`);
- not a reserved word (`www`, `app`, `api`, `docs`, `dashboard` and similar; see `packages/scope`).

`pnpm gen` refuses an empty or malformed scope, because the resulting package name would be unscoped or invalid on npm.

## `registry.config.json`

Committed at the repo root. Nothing in it is secret.

```json
{
  "$schema": "./registry.config.schema.json",
  "scope": "acme",
  "npmRegistry": "https://registry.npmjs.org",
  "templateVersion": "0.1.0",
  "site": {
    "title": "Acme Components",
    "description": "Acme's component library: docs from source, live examples, versions via Changesets.",
    "logo": "/logo.svg",
    "primaryColor": "#6750a4",
    "links": [
      { "label": "GitHub", "href": "https://github.com/acme/components" },
      { "label": "Design", "href": "https://design.acme.example" }
    ]
  }
}
```

| Key | Meaning |
|---|---|
| `scope` | Required. Your primary npm scope without the `@`. |
| `npmRegistry` | Where `pnpm release` publishes and where the Changelog tab looks up published versions. Default `https://registry.npmjs.org`; GitHub Packages is `https://npm.pkg.github.com`; a private registry is any URL. See [Publishing](publishing.md). |
| `templateVersion` | The template version this repo was created from or last updated to. Maintained by `npx create-bht-component-registry update`; do not edit by hand. See [Updating](updating.md). |
| `site.title` | Required. Site name in the header and `<title>`. |
| `site.description` | One sentence for the home page hero and `<meta name="description">`. |
| `site.logo` | A path under `apps/docs/public`, for example `/logo.svg`. Omit to show the title as text. |
| `site.primaryColor` | Hex colour used as the Material Design 3 primary role; the palette derives from it. |
| `site.links` | Footer links, `{ "label", "href" }`. |

The schema is `registry.config.schema.json` next to it; editors that read `$schema` validate as you type. Branding changes need no code changes.

## Create the npm org first

On npmjs, a scope belongs to a user or an org. Before your first `pnpm release`, create the org for your scope at https://www.npmjs.com/org/create (free for public packages). Publishing `@acme/atoms.button` without owning `@acme` fails with a 403.

On GitHub Packages the scope must equal the GitHub user or organisation that owns the repo, in lowercase. Set `npmRegistry` to `https://npm.pkg.github.com` and publish with a token that has `packages:write`. Details in [Publishing](publishing.md).

## `scope.json`

Each `registry/<scope>/scope.json` describes the scope for the site:

```json
{
  "name": "Acme",
  "tagline": "Commerce components for Acme's storefronts.",
  "visibility": "public",
  "tokens": "theme/tokens.scss"
}
```

| Key | Meaning |
|---|---|
| `name` | Display name on the home page and the scope page. Defaults to the title-cased folder name. |
| `tagline` | One line under the name. |
| `visibility` | `public` (default) lists the scope on the home page. `private` keeps it reachable at `/<scope>` but off the home page. |
| `tokens` | Optional. Path, relative to the scope folder, to a `tokens.scss`. When any scope sets it, the site gets a Design tokens page and nav item. See [Design tokens](design-tokens.md). |

`private` is a listing choice, not access control: a static site has no way to restrict who opens a URL. Use it for internal or in-progress scopes you do not want on the landing page.

## Multiple scopes in one repo

Any folder under `registry/` with a `scope.json` or packages is a scope. `pnpm gen` offers existing scopes and lets you type a new one, so a second scope is a matter of running it with a different first argument:

```bash
pnpm gen --args acme-labs atoms experiment
```

Each scope gets its own page at `/<scope>`, its own entry on the home page (unless private), and its own packages under `@<scope>/`. Publishing more than one scope to npmjs means owning each org. `registry.config.json#scope` still names the primary one, which is what the generator defaults to and what the create command renamed the example to.

## Renaming the example scope by hand

If you cloned instead of using the create command:

1. `git mv registry/example registry/acme`.
2. Edit `registry/acme/scope.json`.
3. Replace `@example/` with `@acme/` in every `package.json` (`name`, `repository.directory`), `README.md` and `CHANGELOG.md` under the folder.
4. Drop the `@example/*` lines from `apps/docs/package.json#dependencies`; the catalog step adds the renamed packages back on the next `pnpm dev` or `pnpm build`.
5. Set `"scope": "acme"` in `registry.config.json`.
6. `pnpm install`.

The e2e specs in `apps/docs/e2e/public.spec.ts` name the example components; update them to yours or they fail. See [Testing and CI](testing-and-ci.md).

## Related

- [Getting started](getting-started.md)
- [Components](components.md)
- [Publishing](publishing.md)
- [Design tokens](design-tokens.md)
- [Updating](updating.md)
- [FAQ](faq.md)
