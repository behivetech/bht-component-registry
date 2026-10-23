---
"create-bht-component-registry": patch
---

Template: the docs site's `@behivetech` chrome installs from the public npm registry again: the root `.npmrc`, the CI read-token steps and the guard's exception are gone, and `pnpm install` needs no token. `update` removes the `.npmrc` from registries created with 0.5.0. The publishing guide now says when to add a trusted publisher so it does not expire.
