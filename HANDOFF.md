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
  git tags; publishing is `changeset publish` to the registry in `registry.config.json`;
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
turbo/generators/          pnpm gen (templates read registry.config.json for scope/registry)
docs/                      the guides (getting-started, components, scopes, publishing, deploy, updating, testing-and-ci, design-tokens, faq)
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
pnpm verify         # build + lint + types + unit tests (22 turbo tasks; use --ui=stream when piping)
pnpm test:e2e       # Playwright against the static build (builds first); CI=1 for CI reporter
pnpm gen            # scaffold a component (also: pnpm gen --args <scope> <category> <name>)
pnpm changeset && pnpm version-packages && pnpm release
pnpm --filter create-bht-component-registry build   # dist/cli.js; test it with --from . (see its README)
```

## State at handoff

Verified locally on 2026-10-07:

- `pnpm install` with no `.npmrc` and no token → OK (9 workspace projects).
- `pnpm verify` → 22/22 tasks green (unit tests: scope 7, class-names 4, docs 17, two
  example packages 9, CLI 53).
- `pnpm build` → 16 static pages; served with `serve`: known routes 200, unknown scope and
  unknown component 404 with the site's own not-found page (the not-found page had to move
  out of a `(site)` route group to the app root for the export to pick it up).
- `pnpm test:e2e` → 9 passed.
- Generator: refuses `"Bad Scope"` and reserved `docs`; `pnpm gen --args testco atoms thing`
  → package builds, `docs.json` written, catalog shows the scope (DRAFT, 1 doc, 1 example),
  `pnpm pack` tarball contains exactly dist + source + composition + README + docs.json
  (+ LICENSE, which pnpm adds). Test scope removed afterwards.
- CLI smoke test by its author: `create demo --scope bobsburgers --from . --no-install`,
  `update` no-op / `--dry-run` / dirty-tree refusal / apply.
- Docker: see "Open items" (daemon was not running when first tried).

## Open items / next steps

1. **First push and CI.** Confirm `.github/workflows/ci.yml` is green on GitHub (the
   no-private-registry check, verify, Playwright).
2. **npm.** Create the `behivetech` org on npmjs (0 packages exist under `@behivetech` there
   today). Then publish `create-bht-component-registry` (unscoped, public) so `npx` works;
   it needs `pnpm --filter create-bht-component-registry build` first (the root `release`
   script does that). Store `NPM_TOKEN` as a repo secret for release.yml.
3. **Tag `v0.1.0`** once published: `create` downloads
   `archive/refs/tags/v<templateVersion>.tar.gz` and falls back to `main` with a warning.
4. **Docker**: run `docker build -t x . && docker run --rm -p 8080:80 x` and check `/`,
   `/example`, `/no-such-scope` (expect 200/200/404 with the site's 404 page). The Dockerfile's
   manifest-only first COPY is an optimisation that may need tightening; if the build is
   awkward, simplify to a single `COPY . .` after `pnpm install`.
5. **Platform repo (round two)**: pages `/docs`, `/services`, `/expanded` on
   platform.behivetech.com; this repo's README and footer already link to them.
6. **Round three**: per-version docs with live examples. With self-describing tarballs, old
   versions come from the registry (versions + tarballs); serve each version's `dist` as
   ESM and pin React with an import map. Then extract the docs engine into
   `@behivetech/bht-registry-docs` so both repos consume it (today it is a copy; see drift).
7. **Later**: `pnpm component:remove <pkg>`; the hosted reader (per-scope read token,
   release-workflow notify to `/api/published`, Clerk waitlist + billing) lives in the
   platform repo.

## Gotchas

- **Static export rules**: no proxy/middleware, no route handlers, no cookies/auth; every
  param route has `generateStaticParams` and `export const dynamicParams = false`; the
  not-found page must be at `src/app/not-found.tsx` (not inside a route group).
- **Published packages must not depend on workspace-only packages at runtime.** The shared
  tsup config bundles `@bht-component-registry/*` (`noExternal`) and the template lists
  `class-names` as a devDependency for that reason. Keep it that way.
- **`generate-catalog` auto-adds new registry packages to `apps/docs/package.json`** and tells
  you to run `pnpm install`; the first build after `pnpm gen` fails on "Cannot find module"
  until you do.
- **turbo's TUI hangs when piped.** Use `--ui=stream` whenever output goes to a file.
  `pnpm test:e2e` is plain Playwright (not turbo), so turbo flags are rejected there.
- **BSD tools on macOS**: `grep -Z` means decompress, use `--null`; zsh does not word-split
  unquoted variables.
- **Component unit tests need the root `vitest.config.ts`/`vitest.setup.ts`** (globals,
  jsdom, Radix stubs); they are template-owned.
- `apps/docs/AGENTS.md` and `apps/docs/CLAUDE.md` are Next's managed agent-rules block;
  `next dev` re-adds them, so leave them be.
