# Getting started

This guide takes you from nothing to a running docs site with your own scope. You can let `npx create-bht-component-registry` set the repo up, or clone this repo and do the three renames by hand. Either way you end with a Turborepo whose `registry/` folder is the registry, a docs site at `apps/docs`, and a `registry.config.json` naming your scope.

## Prerequisites

- Node 22 or newer.
- pnpm. The repo pins its version in `package.json#packageManager`; `corepack enable` makes `pnpm` resolve to it.
- git.
- For publishing later: an npm account and an org for your scope. See [Scopes](scopes.md).

No environment variables are needed to develop, build or deploy. Tokens are only involved when you publish. See [Publishing](publishing.md).

## Create a registry

```bash
npx create-bht-component-registry my-registry
```

The command prompts for:

- **Scope** (required): your npm scope without the `@`, for example `acme`. It must be lowercase, DNS-label-like (`a-z`, `0-9`, `-`) and not a reserved word.
- **npm registry**: where `pnpm release` publishes. Default `https://registry.npmjs.org`; GitHub Packages is `https://npm.pkg.github.com`; a private registry is whatever URL it gives you.
- **Starter categories**: which `registry/<scope>/<category>` folders to create.

It then writes `registry.config.json`, renames the example scope to yours, runs `pnpm install` and a first `pnpm build`, and prints the next steps.

```bash
cd my-registry
pnpm dev
```

Open http://localhost:3000.

## Or clone this repo

```bash
git clone https://github.com/behivetech/bht-component-registry.git my-registry
cd my-registry
pnpm install
```

Then make the repo yours:

1. Set `scope` in `registry.config.json` (and the `site.title`, `site.description` and `site.links` while you are there).
2. Rename `registry/example` to `registry/<your-scope>`, and edit `registry/<your-scope>/scope.json` (`name`, `tagline`).
3. In each component's `package.json`, change `@example/` to `@<your-scope>/` in `name` and `repository.directory`. Do the same in each `README.md` import line and `CHANGELOG.md` heading.
4. Remove the `@example/*` entries from `apps/docs/package.json#dependencies`; the catalog step re-adds your renamed packages on the next run.
5. Run `pnpm install`, then `pnpm dev`.

You can also delete `registry/example` entirely and scaffold your first component with `pnpm gen`; the site's chrome does not depend on the example content.

## Your first component

```bash
pnpm gen --args acme atoms button
pnpm install
pnpm dev
```

`pnpm gen` writes `registry/acme/atoms/button/`; the catalog step adds `@acme/atoms.button` to the docs app's dependencies, which is why `pnpm install` follows. [Components](components.md) explains every file it created and the conventions that drive the docs.

## Repo tour

```
my-registry/
├─ apps/docs/                 the docs site (Next.js, static export to apps/docs/out)
│  ├─ scripts/generate-catalog.ts   builds the catalog before dev and build
│  ├─ src/app/(site)/         home, [scope], [scope]/[category]/[name]/<tab>, tokens, not-found
│  ├─ src/components/docs/    live examples, markdown, props table, catalog cards
│  ├─ src/lib/catalog/        typed access to the generated catalog, README/CHANGELOG parsing
│  └─ e2e/                    Playwright specs against the static build
├─ docs/                      these guides
├─ packages/
│  ├─ env/                    shared tsup config and the bht-registry-docgen bin
│  ├─ class-names/            getClassName() used by the component template
│  ├─ scope/                  scope slug validation (reserved names, format)
│  ├─ eslint-config/, typescript-config/
│  └─ create-bht-component-registry/   the npx create and update CLI
├─ registry/<scope>/
│  ├─ scope.json              name, tagline, visibility, optional tokens path
│  └─ <category>/<name>/      one npm package per component
├─ turbo/generators/          pnpm gen and its templates
├─ .changeset/                Changesets config and pending changesets
├─ .github/workflows/         ci.yml (verify + e2e), release.yml (changesets publish)
├─ registry.config.json       scope, npmRegistry, templateVersion, site branding
├─ template.manifest.json     the paths `update` is allowed to replace
├─ Dockerfile, nginx.conf     serve apps/docs/out from a container
└─ turbo.json, pnpm-workspace.yaml, package.json
```

Workspace-only packages use the `@bht-component-registry/*` scope and are never published. Anything public is `bht`-prefixed so it collides with nothing of yours.

## Commands

All run from the repo root.

| Command | What it does |
|---|---|
| `pnpm dev` | Regenerates the catalog, then Next dev on :3000 |
| `pnpm build` | Builds every package, then the static export to `apps/docs/out` |
| `pnpm serve` | Serves `apps/docs/out` on :3000 the way a static host would |
| `pnpm verify` | build + lint + types + unit tests for every package |
| `pnpm test:e2e` | Playwright against the static build (builds first) |
| `pnpm gen` | Scaffold a component; `pnpm gen --args <scope> <category> <name>` skips the prompts |
| `pnpm changeset` | Record a change for the next release |
| `pnpm version-packages` | Apply pending changesets: bump versions, write CHANGELOGs |
| `pnpm release` | Build the registry packages and `changeset publish` to `npmRegistry` |

## Related

- [Components](components.md)
- [Scopes](scopes.md)
- [Publishing](publishing.md)
- [Deploy](deploy.md)
- [Updating](updating.md)
- [Testing and CI](testing-and-ci.md)
- [Design tokens](design-tokens.md)
- [FAQ](faq.md)
