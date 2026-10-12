---
"create-bht-component-registry": minor
---

Template: generators are now plop. `pnpm gen` lists every generator; `pnpm gen component` (or `pnpm gen component <scope> <category> <name>` to skip the prompts) replaces `pnpm gen --args …`. New `doc` generator writes a Docs page from a preset, and `pnpm gen generator` writes a commented skeleton into `generators/<name>/` — a folder that is yours and that `update` never touches. Prompts show examples, where the result lands, and how to fix an invalid answer.
