---
"create-bht-component-registry": minor
---

The docs site's address can come from the environment. The optional variable `BHT_DOCS_SITE_URL` (an absolute `https://` URL, trailing slash ignored) overrides `registry.config.json#site.url` for the `homepage` and `Docs:` line `pnpm release` gives each published package, so a fork or a staging deploy sets its own address without editing the config. Unset means the config value, as before; an invalid value fails the release, naming the variable, before any file changes. `scripts/lib/site-url.mjs` is the one reader (`siteUrl`, `docsUrl`), with unit tests run by the new `pnpm test:scripts` (part of `pnpm verify`); `release.yml` passes the repository variable of the same name. `update` brings all of it, since `scripts/**` and the workflow are template-owned.
