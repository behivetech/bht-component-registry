---
title: The env package
description: What every component builds, lints, type-checks and tests with, and how to change or override it.
order: 4
---

# The env package

Every component package in this registry builds, lints, type-checks and tests the same way, and none of them say how: each carries three one-line files that point at `packages/env` (`@bht-component-registry/env`). Change the env and every component follows; nothing is written twice.

## What a package gets from it

| In the package | One line | What the env provides |
| --- | --- | --- |
| `tsup.config.ts` | `defineConfig(createComponentConfig())` | the build: ESM + CJS, declarations, CSS Modules compiled to `dist/index.css`, workspace tooling bundled in so the published package depends on nothing private |
| `tsconfig.json` | `"extends": "@bht-component-registry/env/tsconfig.json"` | the compiler settings (a React library preset) **and** the ambient `*.module.scss` typings, carried through the base config's `files` |
| `eslint.config.mjs` | `export { default } from "@bht-component-registry/env/eslint.config.mjs"` | the lint rules (a React preset) |
| _(nothing)_ | — | the Vitest config: packages run `vitest run` and Vitest walks up to the repo root's `vitest.config.ts`, which re-exports `packages/env/vitest.config.mjs` — globals, jsdom, and a setup file with the jest-dom matchers and the DOM stubs jsdom lacks |
| `build` script | `tsup && bht-registry-docgen` | the docgen bin that writes `docs.json` into the package, so a published tarball documents itself |

The env itself is thin: it composes `packages/typescript-config` and `packages/eslint-config` (presets the docs app also uses directly) and adds what is specific to components.

## Changing something for every component

Edit the env:

- a build option → `createComponentConfig()` in `packages/env/index.mjs`
- a compiler option → `packages/env/tsconfig.json`
- a lint rule → `packages/env/eslint.config.mjs` (or the preset under `packages/eslint-config`)
- a test global, environment or stub → `packages/env/vitest.config.mjs` and `vitest.setup.ts`
- a new ambient type → `packages/env/global.d.ts`

Then `pnpm verify`. The env is template-owned (`packages/**`), so keep such edits in a commit you can re-apply after `update`, or put them behind an override as below.

## Overriding for one package

Each one-liner takes overrides, so a package can diverge without copying the whole config:

```ts
// tsup.config.ts
export default defineConfig(createComponentConfig({ external: ["react", "react-dom", "date-fns"] }));
```

```json
// tsconfig.json
{ "extends": "@bht-component-registry/env/tsconfig.json", "compilerOptions": { "outDir": "dist", "strict": false } }
```

```js
// eslint.config.mjs
import base from "@bht-component-registry/env/eslint.config.mjs";
export default [...base, { rules: { "react/no-array-index-key": "off" } }];
```

A package that needs its own Vitest settings adds a `vitest.config.ts` of its own; Vitest stops walking up at the first one it finds. Start from the env's: `import { componentTest } from "@bht-component-registry/env/vitest.config.mjs"`.

## Related

- [Components](components.md)
- [Testing and CI](testing-and-ci.md)
- [Adopting the registry in an existing repo](adopting.md)
