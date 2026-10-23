# bht-component-registry

A component registry that stays in git: one npm package per component at
`registry/<scope>/<category>/<name>` (`@<scope>/<category>.<name>`), docs generated from source,
a static Next.js export in `apps/docs/out` that deploys anywhere. No auth, no database, no required
env vars. Public template by Behive Tech (https://platform.behivetech.com); MIT.

Read `README.md` for the map and `apps/docs/default-docs/guide/*.md` for the guides. This file is template-owned and
replaced by `npx create-bht-component-registry update`.

## Layout

- `apps/docs` — the only app. `scripts/generate-catalog.ts` reads the registry before dev/build and
  writes `src/generated/` (gitignored). Pages under `src/app/(site)/`; docs UI in `src/components/docs/`;
  catalog access and README/CHANGELOG parsing in `src/lib/catalog/`; e2e in `e2e/`.
- `packages/env` — everything a component package builds, lints, type-checks and tests with: tsup config, `tsconfig.json` (carries the `*.module.scss` typings via `files`), ESLint config, Vitest config + setup (root `vitest.config.ts` re-exports it), and the `bht-registry-docgen` bin (writes `docs.json` per package).
- `packages/class-names`, `eslint-config`, `typescript-config`, `scope` — workspace-only (`@bht-component-registry/*`).
- `packages/create-bht-component-registry` — the npx `create` and `update` CLI; `template.manifest.json` lists what `update` may replace.
- `registry/<scope>/` — `scope.json` plus one package per component. `registry/example` is the shipped example; deleting it must not break the build.
- `plopfile.ts` + `scripts/generators/<name>/{index.ts,templates/}` — `pnpm gen` is plop, launched as its docs say for TypeScript (`NODE_OPTIONS="--import tsx" plop --plopfile=plopfile.ts`): `component`, `hook`, `util`, `doc`, `generator`; shared prompts/helpers in `scripts/generators/shared.ts`. The owner's own generators go in `generators/<name>/` (never template-owned); both folders are auto-loaded. Stay within plop's documented API (plopjs.com) — no hand-rolled rendering.
- `registry.config.json` — scope, `npmRegistry`, `templateVersion`, `site` branding. Committed, non-secret, validated by `registry.config.schema.json`.

## Commands (root package scripts; a plain pnpm workspace, no task runner)

`pnpm dev` · `pnpm build` · `pnpm serve` · `pnpm verify` (build, then lint+types+unit)
· `pnpm test:e2e` (Playwright against the static build) · `pnpm gen [component <scope> <category> <name>]`
· `pnpm changeset` / `pnpm version-packages` / `pnpm release`.

## Rules

- Static export (`output: "export"`): no `proxy.ts`/middleware, no route handlers, no cookies, no auth,
  no request-time data. Every param route sets `export const dynamicParams = false` and lists its params
  in `generateStaticParams`. A real 404 comes from the host serving `404.html` with a 404 status.
- No environment variable may be required for dev, build, test or deploy. The only ones that exist are
  optional publish tokens; never write them to the repo.
- Nothing may depend on a private registry. `pnpm install` must work with no `.npmrc` and no token; CI
  fails if the lockfile mentions one. Registry packages depend only on `@bht-component-registry/*`
  workspace packages.
- Everything public is `bht`-prefixed (`create-bht-component-registry`, `bht-registry-docgen`,
  `@behivetech/bht-*`); workspace-only packages are `@bht-component-registry/*` and never published.
- The docs app's chrome is the published `@behivetech` components (Button, Card, Badge, Table,
  TextField, EmptyState, HeroBanner) and `@behivetech/cms.base-styles` for the token sheet, pinned in
  `apps/docs/package.json`; `globals.scss` holds only the site-level theming. Never copy a component
  into the app or style a package's classes from the app — fix or extend the package. The app never
  imports a registry (`registry/`) package except through the generated sandbox module.
- A package's description is its README's first paragraph, nowhere else, and its docs URL is
  `registry.config.json#site.url` plus its path, nowhere else: `package.json#description`/`#homepage` and the
  README's `Docs:` line are written by `scripts/prepare-publish.mjs` for the publish and restored after. READMEs
  carry no props table; the Props tab is generated.
- Status and tags come from `package.json#registry`; scope identity from `scope.json`; tokens from
  `scope.json#tokens`. Nothing is hardcoded to a scope name.
- The component template (`package.json.hbs`) takes `publishConfig.registry` from `registry.config.json`,
  builds with `tsup && bht-registry-docgen`, and ships `dist`, `README.md`, `*.example.tsx`, `*.tsx`, `*.scss`, `docs.json`.
- Keep the guide (`apps/docs/default-docs/guide/`) in step with behaviour: a change to commands, config keys, conventions or the CLI edits the matching page in the same commit. `docs/` at the root is the owner's folder: `update` never touches it, and a file there at the same relative path replaces the default page.
- `update` must never touch `registry/**`, `registry.config.json` (except `templateVersion`), `.changeset/*.md`,
  or `README.md` below `<!-- your notes below this line are kept by update -->`.
- `check-types` and `test` need upstream `dist/`: `pnpm verify` builds first; on a fresh clone run `pnpm build` before
  either alone. Guides treat plain pnpm as the baseline; a task runner is named only in the optional section of `apps/docs/default-docs/guide/adopting.md`. Never name competing or comparable products anywhere (no "X-style", no "like X").
- Don't `pnpm install` while `next dev` runs; restart the dev server after. Never `cd` in Bash; use `--filter`, `-C`, `--dir`.
- Every class name goes through `getClassName` (`@bht-component-registry/class-names`) with BEM names: `rootClass` is
  `<classPrefix>__<PascalName>` for a registry package (`classPrefix` from `scope.json`, else the scope in CONSTANT_CASE) and `<PascalName>` for the docs app's own chrome and routes; inner elements are
  `getChildClass("kebab-name")`, variants are `modifiers`, and the `.module.scss` mirrors it (`.Root { &__child {} &--modifier {} }`).
  Never `styles.foo`, never a hand-written class string, never a selector into another component's classes (pass `className`
  instead), and never a class for a state the DOM already carries (`aria-current`, `disabled`): style the attribute.
- Scaffold with the generators, never by hand: a new component, hook or util package, docs page or generator starts with `pnpm gen …`
  (`pnpm gen` lists them), then edit what it wrote. Don't copy an existing package as a starting point: the generators are
  where the conventions live (layout, `package.json`, `publishConfig`, build scripts, docs frontmatter) and a hand-made copy
  drifts. If no generator produces what is needed, extend it or add one under `generators/<name>/` with `pnpm gen generator`.
- Commits: conventional subject lines (`feat(docs): …`, `fix(gen): …`, `docs: …`); end with the Co-Authored-By line the harness provides.
