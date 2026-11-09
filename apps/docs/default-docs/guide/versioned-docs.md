---
title: Versioned docs
description: A docs page per released version of each component, snapshotted into git when the version is bumped, with a version switcher on the component page.
order: 10
---

# Versioned docs

Every component is its own npm package with its own version, and people pin versions. So the site keeps a page per released version: the README, the props, the examples and the source as they were, plus the changelog up to that release. A switcher in the component header lists them, latest first, and every version has a permalink.

## How it works

Snapshots are files in git, written by the same command that bumps versions:

```bash
pnpm changeset          # describe the change
pnpm version-packages   # bump versions, write changelogs — and snapshot the docs
```

`pnpm version-packages` runs `changeset version` and then `pnpm snapshot-docs`, which copies each bumped component's docs into

```
docs-history/<scope>/<category>/<name>/<version>/
├─ README.md
├─ index.ts, <name>.tsx, <name>.module.scss     the files the Code tab shows (tests left out)
├─ <name>.example.tsx
├─ docs.json                                     the props and function docs (docgen output)
└─ snapshot.json                                 version, date, status, tags
```

The snapshot lands in the same commit as the version bump (the release workflow's "Version Packages" pull request carries it), so it cannot be forgotten and the docs for a version are exactly what shipped. The CHANGELOG is not copied: the site slices the live `CHANGELOG.md` at the snapshot's version.

Nothing reads git history or tags at build time. The site builds from the folder, so it builds on a shallow clone, offline, with no token — the same as the rest of the registry.

## What a version page shows

| Tab | At the latest version | At a snapshot |
|---|---|---|
| Overview | README with live fences, live example gallery, props | README of the time (fences as code), examples as code, props of the time |
| Examples | Live, editable | Code, with a link to the live examples |
| Code | The package's source | The source as it was |
| Playground | Live editor | Not available: it needs the current build |
| Changelog | Every release | Releases up to that version |
| Design | Design links | Not available |

Only the current version's build exists in the site's sandbox, which is why past examples are shown rather than run. A banner on every snapshot page says which version it is, when it was snapshotted, and links to the latest.

URLs: the overview of a version is `/<scope>/<category>/<name>/v/<version>` and a tab is `/<scope>/<category>/<name>/<tab>/v/<version>`, with dots in the version written as underscores (`/v/1_2_0`). The version is the last segment and has no dots so that the page is a plain file on every static host; a snapshot of the current version exists too, as that release's permalink.

## Seeding an existing registry

A registry that has released before has no snapshots for those releases: the files of a past version are in git, not in the working tree. Start the history at the versions you have now:

```bash
pnpm snapshot-docs --all
```

That writes one snapshot per component at its current version. From the next `pnpm version-packages` on, every bump adds its own. (Reconstructing older versions by hand is possible: check the package folder out at the release tag `<package>@<version>` into `docs-history/…/<version>/`, add a `snapshot.json`, and the site picks it up.)

Other flags: `--force` rewrites a snapshot that exists; `--dry-run` says what would happen; `--include-private` also snapshots private and `0.0.0` packages, which are skipped by default because Changesets never versions a private package and nothing unreleased deserves a permalink. (The template uses it for its own example scope, as the e2e fixture; a registry created from the template starts with no history.)

For exact props tables, build before versioning (`pnpm build && pnpm version-packages`): the snapshot copies the `docs.json` each package's build writes, and only computes it from source when there is none, where a prop type imported from another package may resolve less precisely.

## Configuration

```json
{
  "docs": {
    "history": { "enabled": true, "keep": "all" }
  }
}
```

| Key | Meaning |
|---|---|
| `docs.history.enabled` | Default `true`. `false` writes no snapshots and builds no version pages; the header shows the plain version again. |
| `docs.history.keep` | Default `"all"`. A number keeps the newest N snapshots per component; `"majors"` keeps everything in the current major and the newest of each older major. Pruned folders stay in git history. |

## Removing a component

Deleting a package leaves its `docs-history/` folder behind, harmlessly: the build warns and skips it. Delete the folder with the package, or keep it if you want the pages back later.

## What `update` does

`docs-history/**` is never touched by `npx create-bht-component-registry update`: it is your data, like `registry/**`.

## Related

- [Publishing](publishing.md): the Changesets flow that writes the snapshots.
- [Deploy](deploy.md): hosts serve a version page like any other page.
- [Scopes](scopes.md): `registry.config.json`, key by key.
