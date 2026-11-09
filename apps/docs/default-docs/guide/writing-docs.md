---
title: Writing docs
description: The Docs section of the site — your pages, the template's default pages, how a page of yours replaces or hides a default, and the pnpm gen doc generator.
order: 4
---

# Writing docs

The site has a Docs section (the "Docs" link in the header, `/docs`) made of Markdown files. Two folders feed it:

| Folder | Whose | What happens to it |
|---|---|---|
| `docs/` at the repo root | yours | never touched by `npx create-bht-component-registry update` |
| `apps/docs/default-docs/` | the template's | replaced on every update, like the rest of the app |

Both are read together. A file under `docs/` at the same relative path as a default page replaces it; every other file under `docs/` is simply a page of yours. The pages you are reading are the defaults, under `apps/docs/default-docs/guide/`.

## Pages and sections

A folder is a section and a file at the top level sits in "General", which comes first:

```
docs/
├─ using-this-registry.md      → /docs/using-this-registry   (General)
├─ contributing.md             → /docs/contributing          (General)
└─ guide/
   └─ publishing.md            → /docs/guide/publishing      (Guide; replaces the default)
```

Frontmatter at the top of a file sets how it appears:

```md
---
title: Contributing
description: How a change gets into this registry.
order: 2
---
```

| Key | Meaning |
|---|---|
| `title` | The page title in the nav and the `<title>`. Without it, the first `# Heading`, then the file name. |
| `description` | One line under the title on the Docs index. Optional. |
| `order` | Position within the section, lower first; `100` when absent. Pages with the same order sort by title. |
| `hidden` | `true` removes the page from the site. On a file that replaces a default, it removes the default. |

The Docs index lists every section and page; the header's "Docs" link exists as long as there is at least one page.

## Links and code

Write links the way they work on GitHub, relative to the file: `[Publishing](publishing.md)`, `[the standards](../standards.md#naming)`. The site turns them into `/docs/…` routes, so the same file reads correctly in both places; absolute URLs and anchors are left alone.

GitHub-flavoured Markdown works: tables, task lists, fenced code. A ```` ```jsx ```` or ```` ```tsx ```` fence marked `live` (```` ```jsx live ````) renders as a live, editable example of whatever it returns, with every registry component in scope; without the marker it stays code, which is what GitHub shows either way. The `standards` preset below shows a rule with its own live example. (A component's README is the other way round: its fences run unless you say otherwise, see [Components](components.md).)

## Making a default page yours

Copy it to the same path under `docs/` and edit the copy; it is shown instead. The default keeps updating underneath, so a later `git diff --no-index apps/docs/default-docs/guide/<page>.md docs/guide/<page>.md` shows you what the template changed and lets you carry it over by hand. A copy stops getting the template's updates: copy a page because you want it to say something different, not to fix a typo (send that upstream).

To drop a default page from your site, put a file at the same path with `hidden: true` in its frontmatter. Delete the file to bring the page back.

Both are one command away, below.

## `pnpm gen doc`

Every page starts with the generator (it writes the frontmatter and a starting body, and refuses a path that already exists):

```bash
pnpm gen doc                                   # the prompts: section, title, description, order, preset
pnpm gen doc guide "How we review" - 20 blank  # answers in order; "-" = no description
pnpm gen doc . "Read me first" - 1 blank       # "." = a top-level page
pnpm gen doc guide Publishing - 9 override     # your copy of the default guide/publishing.md
pnpm gen doc guide Terms - 19 hide             # a stub that hides the default guide/terms.md
```

| Preset | Writes |
|---|---|
| `blank` | A title and a first paragraph. |
| `contributing` | How to propose, build and release a component in this registry. |
| `standards` | Naming, props, styling and testing rules, with a live example. |
| `override` | A byte-for-byte copy of the default page at the same path. The title is the default's file name (`Publishing`, `hooks-and-utils`); an unknown name lists what exists. |
| `hide` | A stub with `hidden: true` that removes the default page from the site. |

The section is a folder under `docs/`, new or existing; `.` means the top level. Named answers work too and are clearer for the optional ones: `pnpm gen doc -- --section=guide --pageTitle=Publishing --description=- --order=9 --preset=override` (a named answer left out is asked interactively). The result is a file under `docs/`, yours to edit; see [Generators](generators.md) for how `pnpm gen` works in general.

## Where the docs show up

- On the site, under `/docs`, in the order above.
- On GitHub, as the Markdown files themselves: the README links into `apps/docs/default-docs/guide/`, and your `docs/` folder reads the same way. Keep links relative and frontmatter at the top and a page reads correctly in both places.

## Related

- [Generators](generators.md): running a generator, answers on the command line, writing your own.
- [Updating](updating.md): what `update` replaces and what it never touches.
- [Components](components.md): the component README, which is the one Markdown file that lives with a package rather than in `docs/`.
