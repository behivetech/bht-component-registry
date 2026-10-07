---
"create-bht-component-registry": patch
---

Template: the release workflow publishes with npm trusted publishing by default (repository variable `NPM_TRUSTED_PUBLISHING=true`), with `NPM_TOKEN` as the fallback, and private packages are hidden from `pnpm changeset` and never versioned.
