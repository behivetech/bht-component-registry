---
"create-bht-component-registry": minor
---

The template no longer uses Turborepo. `update` now owns `scripts/**` (the `pnpm gen` generator and its templates) and removes `turbo.json` and `turbo/generators/**` from repos created from pre-release templates.
