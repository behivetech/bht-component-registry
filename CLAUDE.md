# bht-component-registry

A bit.dev-style component registry that stays in git: one npm package per component at
`registry/<scope>/<category>/<name>` (`@<scope>/<category>.<name>`), docs generated from source,
a static Next.js export in `apps/docs/out` that deploys anywhere. No auth, no database, no required
env vars. Public template by Behive Tech (https://platform.behivetech.com); MIT.

Read `README.md` for the map and `docs/*.md` for the guides. This file is template-owned and
replaced by `npx create-bht-component-registry update`.

## Layout

- `apps/docs` — the only app. `scripts/generate-catalog.ts` reads the registry before dev/build and
  writes `src/generated/` (gitignored). Pages under `src/app/(site)/`; docs UI in `src/components/docs/`;
  catalog access and README/CHANGELOG parsing in `src/lib/catalog/`; e2e in `e2e/`.
- `packages/env` — shared tsup config and the `bht-registry-docgen` bin (writes `docs.json` per package).
- `packages/class-names`, `eslint-config`, `typescript-config`, `scope` — workspace-only (`@bht-component-registry/*`).
- `packages/create-bht-component-registry` — the npx `create` and `update` CLI; `template.manifest.json` lists what `update` may replace.
- `registry/<scope>/` — `scope.json` plus one package per component. `registry/example` is the shipped example; deleting it must not break the build.
- `turbo/generators` — `pnpm gen` and `templates/component/*.hbs`.
- `registry.config.json` — scope, `npmRegistry`, `templateVersion`, `site` branding. Committed, non-secret, validated by `registry.config.schema.json`.

## Commands (root package scripts, not raw turbo)

`pnpm dev` · `pnpm build` · `pnpm serve` · `pnpm verify` (build+lint+types+unit; `--ui=stream` to see failures)
· `pnpm test:e2e` (Playwright against the static build) · `pnpm gen [--args <scope> <category> <name>]`
· `pnpm changeset` / `pnpm version-packages` / `pnpm release`.

## Rules

- Static export (`output: "export"`): no `proxy.ts`/middleware, no route handlers, no cookies, no auth,
  no request-time data. Every param route sets `export const dynamicParams = false` and lists its params
  in `generateStaticParams`. A real 404 comes from the host serving `404.html` with a 404 status.
- No environment variable may be required for dev, build, test or deploy. The only ones that exist are
  optional publish/read tokens; never write them to the repo.
- Nothing may depend on a private registry. `pnpm install` must work with no `.npmrc` and no token; CI
  fails if the lockfile mentions one. Registry packages depend only on `@bht-component-registry/*` workspace packages.
- Everything public is `bht`-prefixed (`create-bht-component-registry`, `bht-registry-docgen`,
  `@behivetech/bht-*`); workspace-only packages are `@bht-component-registry/*` and never published.
- The docs app's chrome lives in `apps/docs/src/ui/` and `globals.scss`; it never imports a registry
  package except through the generated sandbox module.
- Status and tags come from `package.json#registry`; scope identity from `scope.json`; tokens from
  `scope.json#tokens`. Nothing is hardcoded to a scope name.
- The component template (`package.json.hbs`) takes `publishConfig.registry` from `registry.config.json`,
  builds with `tsup && bht-registry-docgen`, and ships `dist`, `README.md`, `*.composition.tsx`, `*.tsx`, `*.scss`, `docs.json`.
- Keep `docs/` in step with behaviour: a change to commands, config keys, conventions or the CLI edits the matching guide in the same commit.
- `update` must never touch `registry/**`, `registry.config.json` (except `templateVersion`), `.changeset/*.md`,
  or `README.md` below `<!-- your notes below this line are kept by update -->`.
- Don't `pnpm install` while `next dev` runs; restart the dev server after. Never `cd` in Bash; use `--filter`, `-C`, `--dir`.
- Commits: conventional subject lines (`feat(docs): …`, `fix(gen): …`, `docs: …`); end with the Co-Authored-By line the harness provides.
