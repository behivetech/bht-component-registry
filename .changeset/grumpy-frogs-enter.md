---
"create-bht-component-registry": minor
---

Template: hooks and utilities are first-class packages. `pnpm gen hook` and `pnpm gen util` scaffold them (categories `hooks` and `utils`, in new registries' defaults); the docgen reads every exported function's signature, `@param`, `@returns` and `@example` with the TypeScript compiler and shows them on the component page (hooks also get live examples from their compositions); `docs.json` carries them too. New guide page: Hooks and utilities, with the JSDoc convention.
