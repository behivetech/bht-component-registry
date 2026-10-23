---
"create-bht-component-registry": minor
---

Template: a package's README is the one place its description lives, and it points back at the docs site. `registry.config.json#site.url` is new (optional): with it set, `pnpm gen` writes a `Docs: <site.url>/<scope>/<category>/<name>` line into each new README, which the site hides on the package's own page. `pnpm release` writes each README's first paragraph into `package.json#description` just for the publish and restores the file after, so npm search shows the summary without a second copy in git. Guide: Components (README conventions), Scopes, Publishing.
