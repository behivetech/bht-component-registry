---
"create-bht-component-registry": minor
---

Template: `@bht-component-registry/env` now carries everything a component package builds, lints, type-checks and tests with. The Vitest config and setup (jest-dom matchers, jsdom stubs) moved into it — the root `vitest.config.ts` is a one-line re-export and is template-owned — and the `*.module.scss` typings come from the env's tsconfig, so generated packages no longer carry a `global.d.ts`. New guide page: The env package.
