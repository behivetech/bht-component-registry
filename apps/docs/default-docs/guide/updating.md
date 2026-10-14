---
title: Updating
description: What npx create-bht-component-registry update touches, what it never touches, and how guide pages are kept current.
order: 10
---

# Updating

Your registry was created from a template version recorded in `registry.config.json#templateVersion`. `npx create-bht-component-registry update` brings the template-owned parts of your repo (the docs app, the tooling packages, the generator, CI, the Dockerfile) up to the latest release while leaving your components, your config, your pending changesets and your README notes alone. It needs a clean git tree, and it ends by asking you to read the diff.

## Run it

From the repo root, with everything committed:

```bash
npx create-bht-component-registry update
```

The command:

1. Refuses to run if `git status` shows uncommitted changes, so the diff it produces is only the update.
2. Reads `templateVersion` from `registry.config.json` and fetches the newer template release from https://github.com/behivetech/bht-component-registry.
3. Replaces the template-owned paths listed in `template.manifest.json` with the new versions.
4. Bumps `templateVersion`.
5. Prints the changed files and tells you to review `git diff` and run `pnpm install && pnpm verify`.

Then:

```bash
git diff
pnpm install
pnpm verify
git commit -am "chore: update bht-component-registry template to x.y.z"
```

## What it touches

Only paths listed in `template.manifest.json` at the repo root. The rule is data, not a hardcoded list, so you can read exactly what will be replaced before running it. As shipped:

- `apps/docs/**` (the site, including the template's guide pages under `apps/docs/default-docs/`)
- `packages/**`
- `scripts/**` (the `pnpm gen` generator and its templates)
- `.github/workflows/**`
- root config files (`pnpm-workspace.yaml`, `package.json`, `.changeset/config.json`, `registry.config.schema.json`, `.gitignore`, `template.manifest.json`)
- `Dockerfile`, `nginx.conf`
- `CLAUDE.md`, `CONTRIBUTING.md`, `.github/copilot-instructions.md` (the AI-assistant rules; your own go in `.github/instructions/*.instructions.md` and `CLAUDE.local.md`, which are never touched)

## What it never touches

- `registry/**`: your scopes and components.
- `docs/**`: your pages, and your copies of guide pages — see the next section.
- `generators/**`: your own generators.
- `registry.config.json`: your scope, registry URL and branding. Only `templateVersion` is bumped.
- `.changeset/*.md`: pending changesets.
- `README.md` below the line `<!-- your notes below this line are kept by update -->`. Everything above it is template text and is replaced; everything below it is yours. If your README has no marker line, `update` leaves the whole file alone and warns.

## Guide pages: defaults and overrides

The pages you are reading ship under `apps/docs/default-docs/guide/` and are replaced on every update like the rest of the app. The site reads that folder and `docs/` together, and a file under `docs/` at the same relative path wins:

| | |
| --- | --- |
| `apps/docs/default-docs/guide/publishing.md` | the template's page; updated for you |
| `docs/guide/publishing.md` | your copy; shown instead, never touched |

So to make a guide page your own, copy it across and edit the copy. The default keeps updating underneath, so a later `git diff` between the two shows you what the template changed. To drop a default page from your site, override it with a page whose frontmatter says `hidden: true`. Pages with no default — your own, at any path under `docs/` — are simply yours.

Registries created from a template older than 0.3.0 kept the guide under `docs/*.md`. After the first update those files are plain pages of yours at the top level of the Docs section, next to the new defaults; delete them, or move the ones you edited to `docs/guide/<name>.md` so they override the matching default.

Repos created from a pre-release template, which shipped a task runner, also lose `turbo.json` and `turbo/generators/**`. After that update, run `pnpm install` so the lockfile drops `turbo`, delete any `.turbo/` cache folders and the root `AGENTS.md` if it only holds Turborepo's managed block, and drop `--ui=stream` from scripts of your own.

## What never reaches your repo at all

A few paths exist only in the template repository itself and are listed under `templateOnly` in `template.manifest.json`: the source of the `create-bht-component-registry` CLI. `create` skips them, and `update` removes them if an older template left them behind, so your repo carries only what your registry needs.

## Keeping local changes to template-owned files

If you have edited a template-owned file (a style in `apps/docs/src/app/globals.scss`, the Playwright config, the Dockerfile), the update overwrites it. Two ways to live with that:

- **Re-apply from the diff.** Your change is in git history; after the update, `git diff HEAD~1 -- <file>` shows what the template changed and you cherry-pick your edit back. This is the normal case for small tweaks.
- **Move the change out of template-owned paths.** Branding belongs in `registry.config.json#site`; design tokens belong in your scope's `tokens.scss`; the e2e spec that names your components is the exception, and the update will remind you to re-check `apps/docs/e2e/public.spec.ts`.

If the update's diff is bigger than you expected, `git checkout -- .` undoes it entirely; the clean-tree check exists so that this is always possible.

## Checking what version you are on

```bash
cat registry.config.json
```

`templateVersion` is the template release you last updated to. Releases and their notes are at https://github.com/behivetech/bht-component-registry/releases.

## Related

- [Getting started](getting-started.md)
- [Scopes](scopes.md)
- [Testing and CI](testing-and-ci.md)
- [Deploy](deploy.md)
- [FAQ](faq.md)
