---
"create-bht-component-registry": minor
---

Template: a Docs section on the site. Every Markdown file under `docs/` is a page (frontmatter: title, description, section, order; a folder is a section), listed in the header and a sidebar, with relative `.md` links resolved and ```jsx live fences running as examples. The site reads the template's guide (`apps/docs/default-docs/`, replaced by `update`) and your `docs/` (never touched) as one tree: a file under `docs/` at the same relative path replaces the default page, and `hidden: true` in its frontmatter removes it — so making a guide page yours is a copy, with no bookkeeping. New registries start with their own Using this registry, Contributing and Standards pages under `docs/`.
