---
"create-bht-component-registry": minor
---

Template: a Docs section on the site. Every Markdown file under `docs/` is a page (frontmatter: title, description, section, order; a folder is a section), listed in the header and a sidebar, with relative `.md` links resolved and ```jsx live fences running as examples. The guide moved to `docs/guide/` and is yours to edit: `update` refreshes a guide page only while it is unchanged from the version it shipped (set `managed: false` to opt out; `--restore-guide` brings back deleted pages). New registries start with their own Using this registry, Contributing and Standards pages.
