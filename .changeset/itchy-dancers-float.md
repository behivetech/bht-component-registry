---
"create-bht-component-registry": minor
---

Template: generators are now plop. `pnpm gen` lists every generator; `pnpm gen component` (or `pnpm gen component <scope> <category> <name>` to skip the prompts) replaces `pnpm gen --args …`. New `doc` generator writes a Markdown page into `docs/` from a preset, and `pnpm gen generator` writes a commented skeleton into `generators/<name>/`. Both folders are yours: `update` never touches them. The template's own guide moved from `docs/` to `apps/docs/default-docs/guide/` (owned with the app), and a file at the same relative path under `docs/` replaces the default page. Prompts show examples, where the result lands, and how to fix an invalid answer.
