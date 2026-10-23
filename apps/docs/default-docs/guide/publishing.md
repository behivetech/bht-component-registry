---
title: Publishing
description: The Changesets flow, npmjs and GitHub Packages, and the Changelog tab.
order: 7
---

# Publishing

Every component is its own npm package with its own semver. Changesets records what changed, bumps versions and writes each package's `CHANGELOG.md`; `pnpm release` builds the packages and publishes them to the registry named in `registry.config.json#npmRegistry`. npmjs is the default, GitHub Packages and private registries are a one-line change, and the published tarball carries enough (source, README, examples, `docs.json`) that its docs can be rendered from the registry alone.

## The Changesets flow

1. Make a change to one or more components.
2. Record it:

   ```bash
   pnpm changeset
   ```

   Pick the affected packages (space to mark, Enter to confirm; with a single package the picker is skipped), a bump (patch, minor, major) and write a one-line summary for the changelog. Submitting an empty summary opens `$EDITOR` instead. The result is a Markdown file in `.changeset/`; commit it with your change.

   Only publishable packages are offered. Private ones (the docs app, the workspace tooling, and the example scope while it is still `"private": true`) are hidden from the picker and never versioned: `privatePackages` in `.changeset/config.json` is `{ "version": false, "tag": false }`.

3. When you are ready to release, apply the pending changesets:

   ```bash
   pnpm version-packages
   ```

   This bumps each affected `package.json#version`, prepends a release section to each `CHANGELOG.md` and deletes the consumed changeset files. Commit the result (the release workflow does this for you as a pull request; see below).

4. Publish:

   ```bash
   pnpm release
   ```

   This builds the registry packages and what they depend on (`pnpm --filter "{./registry/**}..." run build`, so every package's `dist/` and `docs.json` are fresh) and then `changeset publish`, which publishes every package whose version is not yet on the registry and tags the commit `<package>@<version>` for each one.

5. Push the tags:

   ```bash
   git push --follow-tags
   ```

   The release workflow does steps 3 to 5 for you (see below); these are the manual equivalent.

The Changelog tab on the docs site is the package's `CHANGELOG.md`, so releases show up in the docs as soon as the site is rebuilt.

## npmjs (default)

`registry.config.json#npmRegistry` is `https://registry.npmjs.org`. Before the first publish:

1. Create the org for your scope at https://www.npmjs.com/org/create. The scope is `registry.config.json#scope`.
2. Log in locally with `npm login`; publishing from a terminal needs 2FA on your account. CI publishes with trusted publishing once each package exists on npm (see the release workflow below); a granular access token (write, "Bypass 2FA", 90 days at most) stored as `NPM_TOKEN` is the fallback.
3. For public packages, make sure the publish access is `public`. Scoped packages default to restricted on npmjs, which requires a paid org. Set `"access": "public"` in `.changeset/config.json` (or `publishConfig.access` in the packages).

Locally, with 2FA on your account, publish each package directly rather than through `pnpm release`: `changeset publish` runs `pnpm publish` as a child process with its output captured, so the 2FA prompt cannot appear and it fails with `ERR_PNPM_OTP_NON_INTERACTIVE`. Then let Changesets tag what is published:

```bash
npm login
pnpm --filter @acme/atoms.button publish --access public   # opens the 2FA prompt; repeat per package
pnpm changeset tag                                         # tags every published package at its current version
git push --follow-tags
```

`pnpm release` is for CI, where trusted publishing or a token answers for you.

## GitHub Packages

Set the registry:

```json
{ "npmRegistry": "https://npm.pkg.github.com" }
```

The scope must match the GitHub owner of the repo, lowercased. Packages are visible to whoever can see the repo. Consumers need a `.npmrc` with an auth token and `@acme:registry=https://npm.pkg.github.com`, even for public repos.

In CI, `GITHUB_TOKEN` with `packages: write` permission is enough; no secret to create. The commented variant in `.github/workflows/release.yml` shows the two lines.

## Public and private packages

A registry can publish some packages publicly and keep others private, side by side. Name the second registry:

```json
{
  "npmRegistry": "https://registry.npmjs.org",
  "privateRegistry": "https://npm.pkg.github.com"
}
```

`pnpm gen component` then asks for a **visibility**. A public package gets `publishConfig: { registry: <npmRegistry>, access: "public" }`; a private one `{ registry: <privateRegistry>, access: "restricted" }`. That field in the package's `package.json` is the whole decision: `pnpm release` publishes each package to its own registry in one run, the Changelog tab looks each one up on its own registry, and the site marks private packages with a **Private** badge.

**The choice is permanent.** A name published publicly cannot be reliably unpublished, and a private package made public exposes its history, so once a package has a release (a `<name>@<version>` tag), `pnpm check:publish` — run by `pnpm verify` and by CI — refuses any change to its `publishConfig`. Before the first release you can still fix a mistake by editing `publishConfig` by hand. Need the same component on the other side? Publish a new package.

In CI, the release workflow adds the private registry's token to the runner's `~/.npmrc` from the secret `PRIVATE_REGISTRY_TOKEN`; for GitHub Packages the job's own `GITHUB_TOKEN` is used when that secret is absent (the workflow has `packages: write`). Consumers of a private package need a token too — see [GitHub Packages](#github-packages) above for the `.npmrc` they add.

## Private registries

To publish **everything** to one private registry instead, set `npmRegistry` to the URL your registry gives you (Verdaccio, Artifactory, Nexus, Cloudsmith and the like):

```json
{ "npmRegistry": "https://npm.internal.example.com/" }
```

The generator writes each package's `publishConfig.registry` from this value, so new components publish to the same place. Authentication is the registry's own; put the token in CI secrets and in your local `~/.npmrc`, never in the repo. The CI workflow checks that `pnpm-lock.yaml` contains no private registry URL, so your dependencies keep installing from npmjs even when your own packages publish elsewhere.

## Tokens

There are two, both optional, neither committed:

| Token | Used by | Purpose |
|---|---|---|
| `NPM_TOKEN` (or `GITHUB_TOKEN` for GitHub Packages) | `.github/workflows/release.yml` | Publish public packages. Exposed to `changeset publish` as `NODE_AUTH_TOKEN`. Not needed with trusted publishing. |
| `PRIVATE_REGISTRY_TOKEN` | `.github/workflows/release.yml` | Publish private packages to `privateRegistry`. For GitHub Packages the job's `GITHUB_TOKEN` stands in when this is absent. |
| `REGISTRY_READ_TOKEN` | `pnpm build` (the docs site) | Lets the Changelog tab list the versions actually published. Not needed for public packages on npmjs. Without it, the tab shows the `CHANGELOG.md` only. |

The docs site itself never needs a token at runtime; it is static.

## What a tarball contains, and why

A component's `package.json#files` ships:

- `dist/`: the built ESM, CJS, type declarations and `index.css`;
- `README.md`;
- `*.example.tsx`;
- the component source: `*.tsx` and `*.scss`;
- `docs.json`: the props table as computed by react-docgen-typescript.

The package's `build` script is `tsup && bht-registry-docgen`; the docgen bin (from `@bht-component-registry/env`) runs the same prop extraction the docs site uses and writes `docs.json` into the package. The result is that a published version is self-describing: any tool that can fetch a tarball from the registry (the [expanded version](expanded.md) is one) can render that version's docs with no store of its own, and old versions never have to be kept in git.

Check it before your first publish:

```bash
pnpm --filter "./registry/acme/*/*" build
pnpm --filter @acme/atoms.button pack
tar -tzf acme-atoms.button-*.tgz
```

## The release workflow

`.github/workflows/release.yml` runs on pushes to `main` and uses `changesets/action`:

- With pending changesets, it opens (or updates) a "Version Packages" pull request that runs `pnpm version-packages` for you. Merge it to release. For that the repository must allow it: Settings, Actions, General, Workflow permissions, tick "Allow GitHub Actions to create and approve pull requests" (an organization can also restrict this at its level). Without it the run fails with "GitHub Actions is not permitted to create or approve pull requests".
- With no pending changesets and unpublished versions, it runs `pnpm release`.

How it authenticates, in order of preference:

1. **Trusted publishing (no secret).** npm only lets a package that already exists name a trusted publisher, so publish each package's first version from your terminal (above). Then on the package's npmjs page, Settings, add a trusted publisher: your GitHub owner, this repository, workflow file `release.yml`, and tick "Allow npm publish". Finally set the repository variable `NPM_TRUSTED_PUBLISHING` to `true` under Settings, Secrets and variables, Actions, Variables. The job's `id-token: write` permission does the rest, and npm attaches provenance to every version it publishes this way.

   Two things to know. npm's metadata can lag a minute or two behind the publish, so `npm view <package> versions` may not list the new version straight away; the trusted publisher's page on npmjs shows "validated" once the first publish through it has gone through, and a new one expires if that does not happen within two days (a validated one never expires, however long the next release takes). So add a package's trusted publisher right before you merge the Version Packages PR that first publishes it, not weeks ahead; if one has expired, recreate it and merge the next release within the window. And if the trusted publisher allows only staged publishing (untick nothing: "Allow npm publish" must be on), versions land in npm's staging queue and need an approval with 2FA on npmjs or `npm stage approve`.

   The "Version Packages" pull request gets no CI run of its own, because pushes made with the workflow's token do not trigger workflows; it only changes versions, changelogs and the consumed changeset files.
2. **A token.** Store a granular access token as the secret `NPM_TOKEN`. It expires within 90 days, so expect to rotate it.
3. **Neither.** The workflow still versions, so pending changesets still become a "Version Packages" pull request, but it publishes nothing and says so in a notice rather than failing. A fresh repo's first pushes to `main` stay green, and merging that pull request publishes nothing until one of the two methods above is configured.

For GitHub Packages, pass `GITHUB_TOKEN` as `NPM_TOKEN` as the commented lines show and give the workflow `packages: write`.

Two things to know about what gets published:

- `changeset publish` publishes every package that is not `"private": true` and whose version is not already on the registry. That is why the template's own example packages are marked private: `create` makes the packages in your renamed scope publishable, and if you cloned instead, you will be deleting the example scope anyway.
- Scoped packages on a free npmjs org must publish with `access: public`; `.changeset/config.json` and every generated `publishConfig` already say so. Set `restricted` only for a private registry that supports it.

The workflow also has a commented-out "notify" step: one `curl` that tells an [expanded version](expanded.md) a release happened. Leave it commented unless you run one and it asks for it.

## Consuming a component

```bash
pnpm add @acme/atoms.button
```

```tsx
import { Button } from "@acme/atoms.button";
import "@acme/atoms.button/styles.css";
```

React 19 is a peer dependency.

## Related

- [Components](components.md)
- [Scopes](scopes.md)
- [Testing and CI](testing-and-ci.md)
- [Deploy](deploy.md)
- [Updating](updating.md)
- [FAQ](faq.md)
