# create-bht-component-registry

Scaffold a [bht-component-registry](https://github.com/behivetech/bht-component-registry) — a
bit.dev-style component registry that stays in git: docs generated from source, live examples,
versions via Changesets, a static site you can deploy anywhere — and keep it current with `update`.

Hosted & expanded version, guides and consulting: https://platform.behivetech.com

## Create a registry

```bash
npx create-bht-component-registry my-registry
# or
npm create bht-component-registry my-registry
```

You are asked for your npm scope (the `acme` in `@acme/*`), the registry you publish to and the
starter categories; pass them as flags to skip the questions. The command downloads the template
release matching its own version, renames the shipped `example` scope to yours, writes
`registry.config.json`, runs `pnpm install` and a first `pnpm build`, and prints what to do next.

```bash
npx create-bht-component-registry my-registry --scope acme --yes
```

| Flag | Default | What it does |
| --- | --- | --- |
| `--scope <name>` | prompted | Your npm scope without the `@`. Required. Lowercase letters, digits and hyphens, 1–40 chars, not a reserved word. Create the matching org on npmjs before your first `pnpm release`. |
| `--registry <url>` | `https://registry.npmjs.org` | Where `pnpm release` publishes. GitHub Packages is `https://npm.pkg.github.com`. |
| `--categories <a,b,c>` | `atoms,molecules,organisms,templates,forms` | Starter folders under `registry/<scope>/`. Empty ones get a `.gitkeep`. |
| `--template-version <x.y.z>` | this CLI's version | Which template release to download. |
| `--no-install` | off | Skip `pnpm install` and `pnpm build`. |
| `-y`, `--yes` | off | Accept defaults instead of prompting (`--scope` is still required). |
| `--from <path>` | — | Dev mode, see below. |

The target directory must not exist or must be empty. If `pnpm install` or `pnpm build` fails, the
command prints which step failed and exits 1, leaving the directory in place for you to fix.

Some paths exist only in the template repo and are never materialised in yours: this CLI's own
source (`packages/create-bht-component-registry/**`) and the template repo's contributor files
(`.github/ISSUE_TEMPLATE/**`, `.github/PULL_REQUEST_TEMPLATE.md`). They are listed under
`templateOnly` in the template's `template.manifest.json`.

## Update a registry

Run inside a registry you created earlier:

```bash
npx create-bht-component-registry update
npx create-bht-component-registry update --dry-run
```

`update` needs a clean git tree, because it replaces whole files and `git diff` is how you review
the result. It reads `templateVersion` from `registry.config.json`, fetches the newer template,
and replaces only **template-owned** paths — the ones listed in the target release's
`template.manifest.json` (the docs app, `packages/**`, the generator, workflows, root config,
`docs/**`, …). It never touches:

- `registry/**` — your components
- `registry.config.json` — your settings (only `templateVersion` is bumped)
- `.changeset/*.md` — your pending changesets
- `README.md` below the line `<!-- your notes below this line are kept by update -->`; the part
  above it is refreshed from the template. A README without that line is left untouched.

`templateOnly` paths (see above) are never copied, and any left in your repo by an older template
that still shipped them are removed and reported under "Removed". The check order is
`templateOnly`, then `never`, then `owned`.

Files that mention the template's `example` scope (the e2e spec, the docs app's dependency list)
get your scope re-applied after the copy, so the rename from `create` survives. Finally it prints
the added, replaced and removed files and tells you to review with `git diff` and run
`pnpm install && pnpm verify`.

| Flag | Default | What it does |
| --- | --- | --- |
| `--to <x.y.z>` | this CLI's version | Template version to update to. Nothing happens if you are already at or past it. |
| `--dry-run` | off | Print the plan and change nothing. |
| `-y`, `--yes` | off | Apply without the confirmation prompt. |
| `--from <path>` | — | Dev mode, see below. |

Because the root `package.json` is template-owned, add dependencies to the workspace package that
needs them (your component, `apps/docs`) rather than to the root.

## Dev mode: `--from <path>`

Both commands accept `--from <path>` pointing at a local checkout of the template repo. Nothing is
downloaded; the checkout is used as-is (minus `node_modules`, build output, `.git` and generated
data). This is how the template is developed and tested:

```bash
pnpm --filter create-bht-component-registry build
node packages/create-bht-component-registry/dist/cli.js create /tmp/demo --scope testco --from .
node packages/create-bht-component-registry/dist/cli.js update --from . --to 0.2.0 --dry-run
```

With `--from` and no `--to`, `update` takes the target version from the checkout's
`registry.config.json`.

## Where the template comes from

The template is the public repo itself: `https://github.com/behivetech/bht-component-registry/archive/refs/tags/v<version>.tar.gz`.
If that tag does not exist yet the CLI falls back to the `main` branch with a warning. No separate
template store exists, so there is nothing else to keep in sync.

## Development

```bash
pnpm --filter create-bht-component-registry test     # vitest, offline, no pnpm needed
pnpm --filter create-bht-component-registry build    # tsup → dist/cli.js
```

Tests inject the template fetcher and the pnpm runner through each command's options object, so
the suite never touches the network or spawns pnpm.
