---
"create-bht-component-registry": minor
---

Template: the docs site's chrome is the published `@behivetech` components — Button, Card, Badge, Table, TextField, EmptyState and HeroBanner, with `@behivetech/cms.base-styles` as the token sheet — instead of local copies under `apps/docs/src/ui/`. A fix to a component now reaches the site by bumping a version in `apps/docs/package.json`. For now the scope installs from GitHub Packages (root `.npmrc`, template-owned), which needs a token with `read:packages` locally and the secret `PACKAGES_READ_TOKEN` in CI; the switch to the public registry removes that line and nothing else. Getting started and the FAQ say so.
