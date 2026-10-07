# Contributing

Thanks for helping with bht-component-registry. This file covers the template repo itself (the docs app, the tooling packages, the generator and the create CLI). If you are working in your own registry created from it, the [guides](docs/getting-started.md) are what you want.

## Setup

You need Node 22 or newer and pnpm (`corepack enable`).

```bash
git clone https://github.com/behivetech/bht-component-registry.git
cd bht-component-registry
pnpm install
pnpm dev
```

`pnpm install` needs no token and no `.npmrc`; the repo depends on nothing private. Keep it that way.

## Before you open a pull request

```bash
pnpm verify
pnpm test:e2e
```

`pnpm verify` runs build, lint, type checks and unit tests for every package. `pnpm test:e2e` builds the static export and runs Playwright against it (first time: `pnpm exec playwright install chromium`). Both run in CI as well; see [docs/testing-and-ci.md](docs/testing-and-ci.md).

If you change how the site or the tooling behaves, update the matching guide in `docs/` in the same pull request.

## Commits

Conventional subject lines: `feat(docs): …`, `fix(gen): …`, `docs: …`, `chore: …`, `test(e2e): …`. Short imperative subject, body only when the why is not obvious.

## Changesets

Published packages (`packages/create-bht-component-registry`, the example scope) are versioned with Changesets. If your change affects one, add a changeset:

```bash
pnpm changeset
```

Commit the generated `.changeset/*.md` with your change. Changes to the docs app, `docs/` or CI need no changeset; they ship with the next template release.

## Scope of changes

- Everything public is `bht`-prefixed; workspace-only packages use `@bht-component-registry/*` and are never published.
- The docs app is a static export: no middleware, route handlers, cookies or auth.
- No environment variable may be required for dev, build, test or deploy.
- Template-owned paths are listed in `template.manifest.json`; if you add a top-level file the `update` command should manage, add it there.

## Questions

Open a discussion or an issue. For the hosted version and consulting, see https://platform.behivetech.com.
