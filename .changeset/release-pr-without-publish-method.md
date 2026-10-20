---
"create-bht-component-registry": patch
---

Template: with no publish method configured (neither the `NPM_TRUSTED_PUBLISHING` variable nor the `NPM_TOKEN` secret), the release workflow still versions, so pending changesets still become a "Version Packages" pull request; only publishing is skipped, with a notice. Before, the whole step was skipped and no release PR appeared either, which the guide did not say.
