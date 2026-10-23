---
"create-bht-component-registry": minor
---

Template: a published package now says what it is and where its docs are, from the places that already hold that. `pnpm release` runs the new `scripts/prepare-publish.mjs` before `changeset publish` and restores the files after: `package.json#description` comes from the README's first paragraph, and with the new optional `registry.config.json#site.url` set, `package.json#homepage` and a `Docs: <url>` line in the README point at the package's page on the docs site rather than the repository. Nothing is stored twice in git. The README conventions now say not to hand-write a props table, since the Props tab is generated. Guide: Components, Scopes, Publishing.
