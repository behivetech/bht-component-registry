# create-bht-component-registry

## 0.2.0

### Minor Changes

- 0a11740: The template no longer uses a task runner. `update` now owns `scripts/**` (the `pnpm gen` generator and its templates) and removes `turbo.json` and `turbo/generators/**` from repos created from pre-release templates.

### Patch Changes

- 661a0af: `create` and `update` download the template from the tag `changeset publish` creates for this package (`create-bht-component-registry@<version>`), so a release needs no separate `v<version>` tag.
