# Adopting the registry into a monorepo you already have

`npx create-bht-component-registry` gives you a repo whose only job is the registry. If you already have a pnpm monorepo and want the registry and its docs site to live inside it, this guide lists what to copy, where it has to sit, and how to express the build order with whatever runs your builds today. The trade-off up front: `create` and `update` assume they own the repo root, so adoption is by hand and so are later template updates (last section).

## What to copy

Get a fresh template with `npx create-bht-component-registry tmp --scope <yours> --no-install` (or clone this repo), then copy into your monorepo:

| Path | What it is | Needed |
|---|---|---|
| `registry/` | your scope folder with `scope.json` and one package per component | yes |
| `registry.config.json`, `registry.config.schema.json` | scope, registry URL, site branding | yes |
| `apps/docs/` | the docs site (Next.js static export) | yes |
| `packages/env` | shared tsup config and the `bht-registry-docgen` bin every component builds with | yes |
| `packages/class-names` | the `getClassName` helper the component template uses | yes |
| `packages/scope` | scope naming rules used by the generator | yes |
| `packages/eslint-config`, `packages/typescript-config` | the configs the packages above extend | yes |
| `scripts/` | `pnpm gen` and its templates | yes |
| `vitest.config.ts`, `vitest.setup.ts` | the root Vitest config component tests rely on (see below) | yes |
| `.changeset/config.json` | Changesets config, if you do not have one | optional |
| `Dockerfile`, `nginx.conf`, `.github/workflows/*.yml` | the container image and CI/release workflows | optional |

Keep the `@bht-component-registry/*` package names. The component template, the shared tsup config (which bundles them into each component) and the docs app's `next.config.ts` all reference them.

## Where things have to sit

- Components must be at `registry/<scope>/<category>/<name>` under the repo root. The catalog, the generator and the publish filter all read that tree.
- The docs app resolves the repo root as two directories above itself (`apps/docs/scripts/generate-catalog.ts`, the `REPO_ROOT` constant) and reads `<root>/registry` and `<root>/registry.config.json` from there. You can rename the folder (`apps/registry-docs`) as long as it stays two levels deep; otherwise adjust that constant.
- The app's package name is `docs`. If that collides with something you have, rename it in `apps/docs/package.json` and in the root scripts below.

## `pnpm-workspace.yaml`

Add the folders to `packages` and make sure the `catalog:` entries the copied packages use exist. The shipped file is the reference; the parts that matter:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "registry/*/*/*"

catalog:
  "@types/node": ^22.20.4
  "@types/react": 19.2.17
  "@types/react-dom": 19.2.3
  esbuild-sass-plugin: ^3.7.0
  eslint: ^9.39.5
  postcss-modules: ^9.0.1
  react: ^19.2.8
  react-dom: ^19.2.8
  tsup: ^8.5.1
  tsx: ^4.23.11
  typescript: ^5.9.3
  vitest: ^4.1.10

allowBuilds:
  esbuild: true
  unrs-resolver: true
  "@parcel/watcher": true
```

If you do not use pnpm catalogs, replace each `catalog:` in the copied `package.json` files with the range you want. On pnpm 9 or 10, `allowBuilds` is `onlyBuiltDependencies`.

## Root devDependencies

Component packages and `packages/env` resolve a few tools from the repo root rather than declaring them each time. Copy these from the template's root `package.json` into yours:

`sass`, `postcss`, `postcss-modules`, `esbuild-sass-plugin`, `jsdom`, `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `vitest`, `tsup`, `typescript`, `prettier`, and for `pnpm gen`: `tsx`, `handlebars`, `prompts`, `@types/prompts`. Add `@changesets/cli` if you publish with Changesets.

## Build order

Three levels, and the order matters:

1. `packages/class-names` builds to `dist/`.
2. Every `registry/*/*/*` package runs `tsup && bht-registry-docgen`, bundling `class-names` and writing `dist/` and `docs.json`.
3. The docs app's `prebuild` regenerates the catalog, which imports each registry package's `dist/`, then `next build` writes `apps/docs/out`.

`check-types` and `test` in the registry packages and the docs app need the upstream `dist/` too. `lint` needs nothing built.

pnpm orders a recursive run by `workspace:*` dependencies, so the template's root scripts are enough on their own:

```json
"dev": "pnpm --filter \"docs^...\" run build && pnpm --filter docs run dev",
"build": "pnpm -r run build",
"lint": "pnpm -r run lint",
"check-types": "pnpm -r run check-types",
"test": "pnpm -r run test",
"verify": "pnpm build && pnpm lint && pnpm check-types && pnpm test",
"gen": "tsx scripts/gen.mts",
"release": "pnpm --filter \"{./registry/**}...\" --filter create-bht-component-registry run build && changeset publish"
```

If your root already has `build`, `test` and friends that cover other apps, these still work: `pnpm -r run build` builds everything in dependency order, and `pnpm --filter "{./registry/**}..."` scopes a run to the registry packages and what they depend on. To build only the docs site and what it needs: `pnpm --filter "docs..." run build`.

### If your monorepo uses Turborepo

Turborepo expresses the same order with `dependsOn: ["^build"]`. Add these tasks to your `turbo.json` (merge with what you have):

```jsonc
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "docs.json", "out/**", ".next/**", "!.next/cache/**"]
    },
    // The docs site reads the whole registry and the repo config, which live
    // outside its own folder, so declare them as inputs or its cache goes stale.
    "docs#build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "../../registry/**", "../../registry.config.json"],
      "env": ["REGISTRY_READ_TOKEN"]
    },
    "dev": { "dependsOn": ["^build"], "cache": false, "persistent": true },
    "lint": {},
    "check-types": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

Then the root scripts are `turbo run build`, `turbo run dev --filter=docs`, and so on. `REGISTRY_READ_TOKEN` is the only environment variable the docs build reads, and only if you set it ([Publishing](publishing.md)).

## The root Vitest config

Component packages run `vitest run` with no config of their own. Vitest walks up from the package folder to the nearest `vitest.config.*`, which is how they pick up `globals: true`, `environment: "jsdom"` and the setup file with the jest-dom matchers and jsdom stubs. Put `vitest.config.ts` and `vitest.setup.ts` at your repo root. If you already have a root Vitest config, merge those three settings into it, or scope them to `registry/**` with Vitest's `projects` option.

## The generator

`pnpm gen` is `tsx scripts/gen.mts`. It reads `registry.config.json` (`scope`, `npmRegistry`) and the root `package.json#repository.url`, and writes into `<root>/registry/<scope>/<category>/<name>`. Nothing else to configure. See [Components](components.md).

## Publishing and CI in a shared repo

- **Changesets.** If the rest of your monorepo is not versioned with Changesets, list those packages under `ignore` in `.changeset/config.json` so `changeset version` and `changeset publish` only see the registry. The `release` script above builds only the registry packages and the CLI; drop the CLI filter, since you will not have it.
- **CI.** `pnpm verify` or your runner's equivalent. The build command hosts need stays `pnpm build` (or `pnpm --filter "docs..." run build`) with the output directory `apps/docs/out`. See [Deploy](deploy.md).
- **Docker.** The shipped `Dockerfile` copies the whole repo into the build stage, which is fine; only `apps/docs/out` reaches the runtime image.

## What `create` and `update` do not cover here

`create` only scaffolds a whole repo. `update` replaces every path in `template.manifest.json#owned`, which includes the root `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `CLAUDE.md`, the Dockerfile and the workflows. In a shared root that is destructive, so do not run it.

To take template updates by hand:

1. Keep a scratch checkout of the template: `git clone https://github.com/behivetech/bht-component-registry.git`.
2. Diff between the version you copied and the latest: `git diff v<old>..v<new> -- apps/docs packages scripts docs vitest.config.ts vitest.setup.ts`.
3. Apply what applies. Your components under `registry/` are never part of that diff.

The e2e spec names the example components; point it at yours, as [Testing and CI](testing-and-ci.md) describes.

## Related

- [Getting started](getting-started.md)
- [Components](components.md)
- [Publishing](publishing.md)
- [Deploy](deploy.md)
- [Updating](updating.md)
- [Testing and CI](testing-and-ci.md)
