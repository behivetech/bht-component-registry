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

- `apps/docs/**`
- `packages/**`
- `turbo/generators/**`
- `.github/workflows/**`
- root config files (`turbo.json`, `pnpm-workspace.yaml`, `package.json`, `.changeset/config.json`, `registry.config.schema.json`, `.gitignore`, `template.manifest.json`)
- `Dockerfile`, `nginx.conf`
- `CLAUDE.md`, `CONTRIBUTING.md`

## What it never touches

- `registry/**`: your scopes and components.
- `registry.config.json`: your scope, registry URL and branding. Only `templateVersion` is bumped.
- `.changeset/*.md`: pending changesets.
- `README.md` below the line `<!-- your notes below this line are kept by update -->`. Everything above it is template text and is replaced; everything below it is yours. If your README has no marker line, `update` leaves the whole file alone and warns.

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
