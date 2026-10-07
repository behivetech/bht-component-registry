# Handoff: bht-component-registry (2026-10-07)

Start here for a new session in this repo. Everything below was true at the end of the
session that created it; verify anything time-sensitive (npm org, published packages, CI)
before relying on it. The sibling private repo `../bht-platform` has its own HANDOFF.md.

## What this is, in one paragraph

The public, docs-only version of Behive Tech's component registry. A bit.dev-style registry
that stays in git: one npm package per component at `registry/<scope>/<category>/<name>`
(`@<scope>/<category>.<name>`), docs generated from source (README snippets run live,
`*.composition.tsx` exports are live editable examples, react-docgen builds the props table,
CHANGELOG.md from Changesets is the Changelog tab, an optional tokens.scss is a Design tokens
page). No auth, no database, no required env vars. `apps/docs` is a Next.js 16 **static
export** (`apps/docs/out`) that deploys anywhere: Vercel, Netlify/Cloudflare Pages, any static
host, or the included Docker/nginx image. Clients get it with
`npx create-bht-component-registry my-registry` and stay current with
`npx create-bht-component-registry update`.

## Why it exists (the decisions, so you don't re-litigate them)

Made with Bruce over a long planning session; the full plan is in
`~/.claude/plans/please-review-handoff-md-claude-md-melodic-fog.md`.

- **Two products, two repos.** `bht-platform` (private) is the "expanded" version: dashboard,
  Clerk sign-in/SSO, Prisma, roles, audit log, tenant boundary; it is the consulting demo and
  will host the guide for this repo plus services and "expanded version" pages. This repo is
  the free, simple one anyone can clone. The platform site is this repo's documentation site.
- **Git is the source of truth. No artifact store. No bit CLI.** Versions are Changesets +
  git tags (the CLI's `create-bht-component-registry@<version>` tag is also the template
  release; `version-packages` keeps `registry.config.json#templateVersion` equal to it); publishing is `changeset publish` to the registry in `registry.config.json`;
  deleting a component is deleting a folder. The hosted expanded version, when it comes, is a
  *reader* over registries clients already use (npmjs default), never a store Behive runs.
- **Self-describing tarballs.** Every component's build runs `tsup && bht-registry-docgen`
  and `files` ships `dist`, `README.md`, `index.ts`, the source `.tsx`/`.scss`,
  `*.composition.tsx` and `docs.json`. A published version can be documented from the
  tarball alone. This is what makes the future hosted reader possible without a migration.
- **One scope per client, enforced.** `registry.config.json#scope`; validated by
  `packages/scope` (lowercase, DNS-label-like, not reserved); the generator and the create CLI
  refuse anything else. npmjs is the default registry; GitHub Packages or private registries
  are a one-line change.
- **The app's chrome is internal** (`apps/docs/src/ui/*`, copied from the Behive atoms), so a
  client can delete the example scope without breaking the site, and nothing depends on a
  private registry. CI fails if `pnpm-lock.yaml` ever mentions `npm.pkg.github.com`.
- **Everything public is `bht`-prefixed**: `create-bht-component-registry`,
  `bht-registry-docgen`; workspace-only packages are `@bht-component-registry/*`; anything
  published later under Behive's name is `@behivetech/bht-*`.
- **Branding without code**: `registry.config.json#site` (title, description, logo,
  primaryColor, links). Status and tags live in each package's `registry` field.
- **CI is one deletable file** (`.github/workflows/ci.yml`); testing in CI is the client's
  choice. The template repo itself keeps it green.
- **No task runner** (Turborepo removed 2026-10-07). The graph is three levels (class-names →
  registry packages → docs) and `pnpm -r run` orders it by `workspace:*` deps. Root scripts are
  plain `pnpm -r` / `pnpm --filter`; `pnpm gen` is `scripts/gen.mts` (tsx + prompts +
  handlebars over the same `.hbs` templates). Guides treat plain pnpm as the baseline and
  mention Turborepo only as an optional section of `docs/adopting.md`; never bring up Nx.

## Layout

```
apps/docs/                 the static docs site (Next 16, output: "export")
  scripts/generate-catalog.ts   folder tree + registry.config.json + scope.json + package.json#registry → src/generated/
  src/lib/catalog/              typed catalog access, parsing, card model (+ unit tests)
  src/lib/published.ts          build-time "published versions" lookup against npmRegistry (token optional)
  src/ui/                       internal chrome: button, card, badge, text-field, table, empty-state, hero-banner
  src/components/docs/          live-example (react-live), markdown, props-table, scope-catalog, …
  src/app/                      /, /[scope], /[scope]/[category]/[name]/{,compositions,code,playground,changelog}, /tokens, not-found
  e2e/public.spec.ts            Playwright against the static build (pnpm build && serve)
packages/env/              shared tsup config (bundles @bht-component-registry/* in), docgen.mjs, bin/bht-registry-docgen
packages/scope/            scope naming rules (slugProblem, slugify, RESERVED_SLUGS, titleCase)
packages/class-names/      getClassName helper (workspace-only; bundled into components)
packages/eslint-config/, typescript-config/
packages/create-bht-component-registry/   npx create + update (53 tests; see its README)
registry/example/          two example components (price-tag: stable; rating-stars: beta) + scope.json
scripts/                   gen.mts = pnpm gen (tsx + prompts + handlebars) and templates/component/*.hbs
docs/                      the guides (getting-started, components, scopes, publishing, deploy, updating, adopting, testing-and-ci, design-tokens, faq)
registry.config.json       scope, npmRegistry, templateVersion, site; schema alongside
template.manifest.json     owned / never / templateOnly paths for `update`; schema alongside
Dockerfile, nginx.conf     static export behind nginx with a real 404
.github/workflows/         ci.yml (verify + e2e + no-private-registry check), release.yml (changesets/action, NPM_TOKEN)
```

## Commands

```bash
pnpm dev            # regenerate catalog, Next dev on :3000
pnpm build          # static export → apps/docs/out (regenerates catalog first)
pnpm serve          # serve the export on :3000
pnpm verify         # build, then lint + types + unit tests (pnpm -r in dependency order; no cache)
pnpm test:e2e       # Playwright against the static build (builds first); CI=1 for CI reporter
pnpm gen            # scaffold a component (also: pnpm gen --args <scope> <category> <name>)
pnpm changeset && pnpm version-packages && pnpm release
pnpm --filter create-bht-component-registry build   # dist/cli.js; test it with --from . (see its README)
```

## State at handoff

Verified locally on 2026-10-07:

- `pnpm install` with no `.npmrc` and no token → OK (9 workspace projects).
- `pnpm verify` → green (unit tests: scope 7, class-names 4, docs 17, two example
  packages 9, CLI 62).
- `pnpm build` → 16 static pages; served with `serve`: known routes 200, unknown scope and
  unknown component 404 with the site's own not-found page (the not-found page had to move
  out of a `(site)` route group to the app root for the export to pick it up).
- `pnpm test:e2e` → 9 passed.
- Generator (`scripts/gen.mts`): refuses `"Bad Scope"`, reserved `docs`, an unknown category,
  a non-kebab name and an existing destination, each with one sentence and exit 1;
  `pnpm gen --args testco atoms thing` → 12 files, package builds (`dist/` + `docs.json`),
  tests and lints, and the export contains `testco.html` and `testco/atoms/thing.html`. Test
  scope removed afterwards. Earlier `pnpm pack` check (tarball = dist + source + composition +
  README + docs.json + LICENSE) still holds; the template is unchanged.
- `pnpm dev` on a fresh tree: builds the three upstream packages, then Next dev answers :3000.
- CLI: 62 unit tests; `create demo --scope bobsburgers --from . --no-install -y` ships
  `scripts/**` and no `turbo.json`; `update --dry-run` on a repo created from the pre-change
  tree lists `turbo.json` + `turbo/generators/**` under Removed and `scripts/**` under Added
  (`update` short-circuits when `templateVersion` already matches, so bump it down to test).
- Docker: `docker build` + `docker run -p 8089:80` → `/`, `/example`, a component page 200;
  `/no-such-scope` 404 with the site's "Not found" page through nginx.
- Pushed to GitHub; CI (verify + Playwright) green on the plain-pnpm tree. One Playwright job
  hit the 25-minute timeout because `apt-get` stalled on an Ubuntu mirror during
  `playwright install --with-deps`, before the tests started; a rerun passed in about a
  minute. Runner infrastructure, not the repo.

## Open items / next steps

1. **Decide: own the root Vitest config?** `vitest.config.ts` / `vitest.setup.ts` are called
   template-owned (CLAUDE.md, Gotchas below) but are not in `template.manifest.json#owned`, so
   `update` never refreshes them. Either add them to `owned` (and `DEFAULT_MANIFEST` in the
   CLI, plus `docs/updating.md`) or fix the wording.
2. **npm: done.** `create-bht-component-registry@0.2.0` is published (2026-10-07) and
   `npx create-bht-component-registry@0.2.0` scaffolds from the tagged template. Left: on the
   package's npmjs settings add a trusted publisher (owner `behivetech`, repo
   `bht-component-registry`, workflow `release.yml`), then set the repository variable
   `NPM_TRUSTED_PUBLISHING=true`; the next merge to main with unpublished versions publishes
   from CI with no token. Optional: `npm deprecate create-bht-component-registry@0.0.0-stage
   "…"` to hide the placeholder an aborted staged publish left (needs a browser login).
3. **Local releases, if ever needed again**: `pnpm version-packages` (bumps and syncs
   `templateVersion`), commit, `pnpm --filter <pkg> publish --access public` per package
   (`changeset publish` cannot show the 2FA prompt), `pnpm changeset tag`,
   `git push --follow-tags`.
4. **Platform repo (round two)**: pages `/docs`, `/services`, `/expanded` on
   platform.behivetech.com; this repo's README and footer already link to them.
5. **Round three**: per-version docs with live examples. With self-describing tarballs, old
   versions come from the registry (versions + tarballs); serve each version's `dist` as
   ESM and pin React with an import map. Then extract the docs engine into
   `@behivetech/bht-registry-docs` so both repos consume it (today it is a copy; see drift).
6. **Later**: `pnpm component:remove <pkg>`; the hosted reader (per-scope read token,
   release-workflow notify to `/api/published`, Clerk waitlist + billing) lives in the
   platform repo.

## Gotchas

- **The example packages are `"private": true` on purpose.** changesets/action runs
  `changeset publish` whenever there are no pending changesets, and publish pushes every
  public package not yet on the registry; the first CI run tried to publish `@example/*` to
  npmjs. `create` flips `private` to false for the renamed scope, so clients' packages publish.
  Anyone who clones instead of using `create` deletes the example scope anyway.
  `.changeset/config.json` sets `privatePackages: { version: false, tag: false }`, so private
  packages never appear in `pnpm changeset`; in this repo that leaves only the CLI and the
  picker is skipped (bump → summary → confirm). An empty summary opens `$EDITOR`.
- **release.yml skips version/publish until a publish method exists** (a notice, not a
  failure), so a fresh repo's first push to main is green: the repository variable
  `NPM_TRUSTED_PUBLISHING=true` (OIDC, preferred) or the secret `NPM_TOKEN`.
- **`check-types` regenerates the catalog first** (`precheck-types`); on a fresh machine the
  generated files do not exist and `tsc` fails without it. This is what broke the first CI run.

- **Static export rules**: no proxy/middleware, no route handlers, no cookies/auth; every
  param route has `generateStaticParams` and `export const dynamicParams = false`; the
  not-found page must be at `src/app/not-found.tsx` (not inside a route group).
- **Published packages must not depend on workspace-only packages at runtime.** The shared
  tsup config bundles `@bht-component-registry/*` (`noExternal`) and the template lists
  `class-names` as a devDependency for that reason. Keep it that way.
- **`generate-catalog` auto-adds new registry packages to `apps/docs/package.json`** and tells
  you to run `pnpm install`; the first build after `pnpm gen` fails on "Cannot find module"
  until you do.
- **`check-types` and `test` need upstream `dist/`.** `pnpm verify` builds first; on a fresh
  clone run `pnpm build` before running either alone. No cache: every `pnpm build` rebuilds
  everything (about 30 s).
- **BSD tools on macOS**: `grep -Z` means decompress, use `--null`; zsh does not word-split
  unquoted variables.
- **Component unit tests need the root `vitest.config.ts`/`vitest.setup.ts`** (globals,
  jsdom, Radix stubs); they are template-owned.
- `apps/docs/AGENTS.md` and `apps/docs/CLAUDE.md` are Next's managed agent-rules block;
  `next dev` re-adds them, so leave them be. There is no root `AGENTS.md` any more (it was
  Turborepo's).
