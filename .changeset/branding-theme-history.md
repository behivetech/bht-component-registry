---
"create-bht-component-registry": minor
---

Two more owner-owned folders the template never touches: `branding/` (logo, icons, fonts named from `registry.config.json#site`) and `docs-history/` (per-version docs snapshots written by `pnpm version-packages`). Three more template-only paths that never reach a created registry: the example scope's seeded history (`docs-history/example/**`), the e2e spec that reads it, and the template's `.github/CODEOWNERS`. The CLI's config types know the new `site.*` keys (`logoDark`, `favicon`, `icons`, `themeColor`, `headerTheme`, `theme`, `fonts`, `hero`) and the `docs` object (`history`, `themeBuilder`); unknown keys still pass through.
