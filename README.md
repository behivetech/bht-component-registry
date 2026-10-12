# bht-component-registry

A component registry that stays in git. One npm package per component, docs generated from the source, live editable examples, versions with Changesets, and a static site you can deploy anywhere.

[![CI](https://github.com/behivetech/bht-component-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/behivetech/bht-component-registry/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Made by [Behive Tech](https://platform.behivetech.com). This repo is the open version; the guide is in [the guide](apps/docs/default-docs/guide/getting-started.md) and on every registry's own site under `/docs`. An [expanded version](apps/docs/default-docs/guide/expanded.md) with a dashboard, roles and an audit log is available through consulting.

## Quick start

You need Node 22 or newer and pnpm (`corepack enable` gives you the pinned version).

```bash
npx create-bht-component-registry my-registry
cd my-registry
pnpm dev
```

The command asks for your npm scope (`acme` for `@acme/*`), the npm registry you publish to (npmjs by default) and the starter categories you want. It writes `registry.config.json`, renames the example scope to yours, installs and runs a first build. `pnpm dev` then serves the docs site at http://localhost:3000.

### Or clone this repo

```bash
git clone https://github.com/behivetech/bht-component-registry.git my-registry
cd my-registry
pnpm install
pnpm dev
```

Then set `scope` in `registry.config.json`, rename `registry/example` to your scope and change the `@example/` package names to match. [Getting started](apps/docs/default-docs/guide/getting-started.md) walks through it.

## What you get

- A docs site per component with tabs as routes: Overview, Compositions, Code, Playground, Changelog.
- The Overview is the component's `README.md`; its ```` ```jsx ```` and ```` ```tsx ```` blocks run live.
- `*.composition.tsx` exports become live, editable examples and the catalog thumbnails.
- A props table built by react-docgen-typescript from the TypeScript interface and its JSDoc.
- The Changelog tab is the package's `CHANGELOG.md`, written by Changesets.
- Status (`stable`, `beta`, `draft`, `deprecated`) and tags per component, from `package.json`.
- An optional design tokens page from a scope's `tokens.scss`.
- Publishing to npmjs, GitHub Packages or a private registry with `pnpm release`.
- A static export (`apps/docs/out`) that deploys to Vercel, Netlify, Cloudflare Pages, S3, or a Docker image.
- No auth, no database, no required environment variables.

## How it works

- The folder tree is the registry: `registry/<scope>/<category>/<name>` is the npm package `@<scope>/<category>.<name>`.
- Before every `dev` and `build`, `apps/docs/scripts/generate-catalog.ts` reads every package (README, compositions, source, CHANGELOG, `package.json`) and writes a catalog the pages are generated from.
- Each component's build runs `tsup` and then `bht-registry-docgen`, which writes `docs.json` into the package, so a published tarball describes itself.
- Changesets owns versions: `pnpm changeset`, `pnpm version-packages`, `pnpm release`.
- `registry.config.json` holds the scope, the npm registry and the site branding. It is committed and contains no secrets.

## Guides

- [Getting started](apps/docs/default-docs/guide/getting-started.md): create or clone, prerequisites, a tour of the repo.
- [Components](apps/docs/default-docs/guide/components.md): the anatomy of a component folder, `pnpm gen`, README and composition conventions, the props table, status and tags, removing a component.
- [Scopes](apps/docs/default-docs/guide/scopes.md): the one-scope rule, `registry.config.json`, `scope.json`, creating the npm org, multiple scopes.
- [Publishing](apps/docs/default-docs/guide/publishing.md): the Changesets flow, npmjs, GitHub Packages and private registries, what a tarball contains, the release workflow.
- [Deploy](apps/docs/default-docs/guide/deploy.md): Vercel, Netlify, Cloudflare Pages, any static host, Docker and nginx.
- [Updating](apps/docs/default-docs/guide/updating.md): `npx create-bht-component-registry update`, what it touches and never touches.
- [Adopting](apps/docs/default-docs/guide/adopting.md): add the registry to a monorepo you already have: what to copy, the build order, what `create` and `update` do not cover.
- [Testing and CI](apps/docs/default-docs/guide/testing-and-ci.md): unit tests, Playwright against the static build, the one CI file.
- [Design tokens](apps/docs/default-docs/guide/design-tokens.md): the optional tokens page.
- [FAQ](apps/docs/default-docs/guide/faq.md): why no database, why a static export, why git and npm rather than a hosted component platform, what the expanded version adds.

## Expanded version

The same registry with a workspace for the team on top: a dashboard, status/tags/descriptions edited in place, roles, an audit log and SSO — running on your infrastructure, with this registry unchanged underneath. It is set up for your team as a consulting engagement; see [The expanded version](apps/docs/default-docs/guide/expanded.md).

## Consulting

Behive Tech builds and runs component libraries and design systems for teams: https://platform.behivetech.com.

## Contributing, security, licence, terms

- [CONTRIBUTING.md](CONTRIBUTING.md) for setup, `pnpm verify`, commit and changeset conventions.
- [SECURITY.md](SECURITY.md) for reporting a vulnerability.
- [MIT](LICENSE), copyright 2026 Behive Tech. Provided as is, without warranty — see [TERMS.md](TERMS.md).

<!-- your notes below this line are kept by update -->

## Your notes

Everything above this heading is replaced by `npx create-bht-component-registry update`; write anything you want to keep about your registry below it.
