---
title: Generators
description: Where generators live, how to run them, and how to write your own in a minute.
order: 3
---

# Generators

`pnpm gen` scaffolds things into this repo: a component package, a docs page, or a generator of your own. It is [plop](https://plopjs.com/) — Handlebars templates driven by prompts — so this page covers only what is specific to this registry. For the API itself (prompt types, actions, helpers) plop's own documentation is the reference, and the skeleton `pnpm gen generator` writes links to the right page beside each thing it uses.

## Where generators live

```
plopfile.ts                      loads both folders below; template-owned
scripts/generators/<name>/       the template's generators: component, doc, generator
  index.ts                         registers the generator
  templates/                       its Handlebars files
generators/<name>/               yours — same layout, never touched by `update`
```

Every folder with an `index.ts` in either place is picked up automatically. There is nothing to register.

## Running one

```bash
pnpm gen                          # pick from the list
pnpm gen component                # straight to one generator's prompts
pnpm gen component acme atoms badge   # answers in order; skips the prompts
```

Positional answers go through the same validation as typed ones. An invalid answer stops the run with the same message the prompt would have shown. A `_` in a position means "ask me that one"; after a `--`, answers can be named instead, which is clearer for generators with optional prompts — both are plop's own syntax:

```bash
pnpm gen component acme atoms badge public none       # every answer given; nothing asked
pnpm gen component acme _ badge                       # scope and name given; the rest asked
pnpm gen doc -- --section=guide --pageTitle="Contributing" --preset=contributing
pnpm gen doc . "Read me first" "" 1 blank             # "." = a top-level page; "" = no description
```

Named answers you leave out are asked interactively, and an empty named value (`--description=`) counts as left out — pass `""` positionally when you mean "none". (Prompt names avoid Node's own flags — `--title` is one — because plop re-launches Node with any it finds.)

## Shipped generators

| Generator | Writes | Prompts |
| --- | --- | --- |
| `component` | `registry/<scope>/<category>/<name>/` — a publishable package | scope, category, name, visibility (public, or private when `registry.config.json#privateRegistry` is set — permanent after the first release), design link (a Figma URL, or `none`) |
| `hook` | `registry/<scope>/hooks/<name>/` — a React hook package, documented from its signature and JSDoc, with a composition as its live example | scope, name (`use-…`), visibility |
| `util` | `registry/<scope>/utils/<name>/` — a plain TypeScript function package, documented from its signature and JSDoc | scope, name, visibility |
| `doc` | `docs/<section>/<slug>.md` — a Markdown page in your own folder (`update` never touches `docs/`), from a preset (`blank`, `contributing`, `standards`) | section, title, description, order, preset |
| `generator` | `generators/<name>/` — a working skeleton to build your own from | name, description |

## Your own generator in a minute

```bash
pnpm gen generator
# Generator name → hook
# One line for the list → A React hook package
pnpm gen hook
```

Open `generators/hook/index.ts`. It has one prompt, an `add`, a commented `addMany` and a custom action, each with a comment and a link to the plop page that documents it. Change the prompts, point the actions at your templates under `generators/hook/templates/`, and run it again. `pnpm gen` lists it from now on.

## House conventions

Follow these in your own generators so they feel like the shipped ones:

- **Say the shape and an example in the message**: `Component name (kebab-case, e.g. date-picker)`.
- **Show where it lands** in the message or `suffix`: `→ registry/acme/atoms/<name>`.
- **Default what has a default**: the primary scope from `registry.config.json`, `atoms`, the first existing section.
- **Choices carry a description**: `atoms — basic building blocks (button, badge, text-field)`.
- **Validate with the rule and the fix**: `Must be kebab-case: "date-picker" would do.` Refuse a destination that already exists.
- **Paths**: `registry/<scope>/<category>/<name>` for packages, `docs/<section>/<slug>.md` for pages, kebab-case everywhere; `{{dashCase name}}` in file names. Write only into folders `update` never touches (`registry/`, `docs/`, `generators/`); the template's guide under `apps/docs/default-docs/` is replaced on every update.
- **Helpers already registered**: plop's built-ins — `dashCase`, `pascalCase`, `camelCase`, `constantCase`, `titleCase` and the rest — plus `docDir` from the `doc` generator.

## Tell your AI assistant

An assistant that does not know about the generators will scaffold by hand — usually by copying a package that already exists — and the copy drifts from the conventions the generators encode. The repo ships the rule for two assistants, in files `update` keeps current:

- `CLAUDE.md` at the root, for Claude Code (its *Rules* section).
- `.github/copilot-instructions.md`, for GitHub Copilot.

Both say the same thing: a new component package, docs page or generator starts with `pnpm gen …`, then edit what it wrote; never copy an existing one as a starting point; if no generator fits, extend one or add one under `generators/`. If you use another assistant, put that paragraph wherever it reads its project context (an `AGENTS.md`, a rules folder, a system prompt) — the wording in `.github/copilot-instructions.md` is written to be copied. Your own additional rules go in files the template does not own: `.github/instructions/*.instructions.md` for Copilot, and for Claude Code a `CLAUDE.local.md` or `.claude/` rules, since `CLAUDE.md` itself is replaced on update.

Everything else — action types, prompt options, custom helpers, partials — is plop: [plopjs.com/documentation](https://plopjs.com/documentation/).
