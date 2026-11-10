---
title: Testing and CI
description: Unit tests, Playwright against the static build, and the shipped CI workflow.
order: 13
---

# Testing and CI

`pnpm verify` runs the build, lint, type check and unit tests for every package; `pnpm test:e2e` runs Playwright against the static build served the way a host would serve it. Neither needs an account, a database or an environment variable, so they run the same on your laptop and in CI. CI ships as a single file, `.github/workflows/ci.yml`, that you can delete.

## Unit tests

Each component has a `<name>.spec.tsx` (Vitest, Testing Library, jsdom). The docs app has its own small suite for the catalog parsing and the snippet-to-program conversion.

```bash
pnpm test                                   # every package
pnpm --filter @acme/atoms.button test       # one package
pnpm --filter docs test:watch               # the docs app, watching
```

`pnpm verify` builds before it tests, because a component's test imports the workspace `class-names` package from its `dist/`. On a fresh checkout, run `pnpm build` once before running `pnpm test` on its own.

## `pnpm verify`

```bash
pnpm verify
```

Runs `build`, then `lint`, `check-types` and `test`, each as `pnpm -r run <script>` across the workspace in dependency order; packages without that script are skipped. There is no cache, so every run rebuilds. Output is prefixed per package; for one phase with less interleaving:

```bash
pnpm -r --aggregate-output run build
```

## End-to-end tests

```bash
pnpm test:e2e
```

Playwright's `webServer` runs `pnpm build && pnpm serve` inside `apps/docs`: the catalog is regenerated, the static export is written to `apps/docs/out`, and `serve` hosts it on :3000 with `404.html` returned for unknown paths and a real 404 status. The specs in `apps/docs/e2e/public.spec.ts` cover:

- the home page lists the public scopes and shows `site.title` from `registry.config.json`;
- a scope page groups components by category and searches them client-side;
- a catalog card opens its own component;
- status and tags render from `package.json#registry`;
- the Overview tab renders the README live, the examples and the props table;
- the tabs are routes (examples, code, playground, changelog);
- editing a live example re-renders it;
- an unknown scope and an unknown component are real 404s.

Three more specs hold the rule that **a page loads only what it renders**:

- `sandbox-chunks.spec.ts` reads the scripts a page and its frames really fetch: a frame loads the packages its program uses and no others, the code editor loads only when **Edit code** opens, a guide page with no live block loads neither the transformer nor the editor, and catalog tiles are static markup (they render with JavaScript off and fetch no component code);
- `js-budget.spec.ts` caps the uncompressed JavaScript of a component page, a guide page, a scope page and one example frame, about 10% above what the site weighs. A budget that fails means something heavy landed on a page that does not need it; if you accept the growth, raise the number in the spec in the same change and say why;
- `component-pages.webkit.spec.ts` runs in the `webkit` project (an iPhone 14 profile). iOS Safari kills a page that holds too much memory, and WebKit counts every mounted example frame against it, which Chromium hides. It checks that component pages render, and that frames far from the viewport are unmounted.

The first time, install the browsers (WebKit is needed for the `webkit` project):

```bash
pnpm exec playwright install chromium webkit
```

Useful variants:

```bash
pnpm --filter docs test:e2e:ui         # Playwright's UI mode
pnpm --filter docs test:e2e:report     # open the last HTML report
```

If a server is already running on :3000, Playwright reuses it locally (not in CI), so you can iterate on specs without rebuilding.

### After renaming the example scope

The specs name the example components (`Price Tag`, `Rating Stars`, `@example/atoms.price-tag`; the chunk specs also use the example scope's root class prefix, `ACME__`). When you rename or delete the example scope, edit the spec to point at one of your components, or the suite fails. The spec says so at the top.

## CI

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`:

1. checkout, pnpm via corepack, `pnpm install --frozen-lockfile`;
2. `pnpm verify`;
3. `pnpm exec playwright install --with-deps chromium webkit` and `pnpm test:e2e`;
4. a check that `pnpm-lock.yaml` points only at npmjs and GitHub Packages (temporary), so no other private registry sneaks in.

One secret is needed for now: `PACKAGES_READ_TOKEN`, a GitHub token with `read:packages`, because the `@behivetech` packages install from GitHub Packages. The workflows write it into the runner's `~/.npmrc` and expose it as `NODE_AUTH_TOKEN`. A pull request from a fork gets no secrets, so a maintainer re-runs its checks from a branch.

If you do not want CI, delete the file; nothing else references it. If you want only part of it, delete the steps you do not want.

The CI badge in the README points at this workflow.

## Writing tests for your components

- Keep `<name>.spec.tsx` next to the component. The generator's template tests that children render and that `className` is merged; add behaviour tests from there.
- The props table and live examples need no tests of their own: if an example does not compile, the build fails, and if a README snippet throws at render time, the e2e suite catches the broken page.
- For a new component you consider important, add one line to `public.spec.ts` that opens its page and checks the H1. It costs a second and proves the route is generated.

## Related

- [Getting started](getting-started.md)
- [Components](components.md)
- [Publishing](publishing.md)
- [Deploy](deploy.md)
- [Updating](updating.md)
- [FAQ](faq.md)
