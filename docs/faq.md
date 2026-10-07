# FAQ

Short answers to the questions that come up when teams evaluate this registry: why there is no database, why the site is a static export, why git and npm rather than a hosted component platform, and what the hosted version adds. Where a question has a longer answer, it links to the guide.

## Why no database?

Everything the docs show is already in the repo: the README, the compositions, the TypeScript interface, the CHANGELOG, the version, the status and tags in `package.json`. A database would hold a copy that someone has to keep in step. The catalog step reads the folder tree at build time instead, so a pull request that changes a component changes its docs in the same diff, reviewed together.

## Why a static export?

Because nothing on the site changes between deploys. A static export is a folder of HTML, CSS and JS that any host can serve for free, with no server to patch, no cold starts and no runtime secrets. It also makes the deploy story the same everywhere: Vercel, Netlify, Cloudflare Pages, S3, a Docker image with nginx. See [Deploy](deploy.md).

The trade-offs: no per-request logic (sign-in, forms, writes), and a change needs a rebuild. For a component library's docs, both are what you want.

## Do I need any environment variables?

No. Developing, building, testing and deploying need none. Two optional tokens exist for publishing and for listing published versions from a private registry; both live in CI secrets or your shell. See [Publishing](publishing.md).

## Why git and npm rather than a hosted component platform?

Because you already have both, and they are enough:

| Idea | This registry |
|---|---|
| Scopes | an npm scope and a folder under `registry/` |
| One package per component | `registry/<scope>/<category>/<name>` is `@<scope>/<category>.<name>` |
| Examples | the named exports of `<name>.composition.tsx` |
| Generated docs | README, compositions, react-docgen props, CHANGELOG |
| Versions | Changesets and the npm registry you already use |
| Deleting a component | deleting a folder |
| Source of truth | git |

There is no daemon, no second CLI to learn beyond `pnpm gen`, no separate store, and nothing to export if you stop using it.

## Can I have more than one scope?

Yes. Any folder under `registry/` is a scope. `registry.config.json#scope` names the primary one, which the generator defaults to. See [Scopes](scopes.md).

## Can I hide a scope?

Set `"visibility": "private"` in its `scope.json`. It stays reachable at `/<scope>` but is not listed on the home page. A static site cannot restrict access; use it for in-progress scopes, not secrets.

## How do I change the site's title, logo or colour?

Edit `registry.config.json#site`. No code changes are needed, and `update` leaves the file alone. See [Scopes](scopes.md).

## How do I set a component to beta or deprecated, or tag it?

Add a `registry` field to its `package.json`:

```json
{ "registry": { "status": "beta", "tags": ["forms", "core"] } }
```

Commit it. See [Components](components.md).

## Why does `pnpm gen` need `pnpm install` afterwards?

The docs app imports every registry package so the Playground has them in scope. The catalog step adds the new package to `apps/docs/package.json#dependencies`; `pnpm install` links it. Stop `pnpm dev` before installing.

## Can I publish to GitHub Packages or a private registry?

Yes; it is one value in `registry.config.json`. See [Publishing](publishing.md).

## Does deleting a component delete its published versions?

No. The folder is gone and the docs site no longer shows it, but published versions stay on the registry so existing consumers keep installing. Run `npm deprecate` if you want them warned. See [Components](components.md).

## How do I update to a newer template?

```bash
npx create-bht-component-registry update
```

It replaces only template-owned paths and never touches `registry/`, `registry.config.json`, pending changesets or your README notes. See [Updating](updating.md).

## Can I put the registry inside a monorepo I already have?

Yes, by hand. Copy `registry/`, the docs app, the support packages and the generator into your workspace and express the build order with whatever runs your builds today; [Adopting](adopting.md) lists each step. `create` and `update` assume they own the repo root, so they are not used in that setup.

## Can I turn CI off?

Delete `.github/workflows/ci.yml`. It is the only file involved. See [Testing and CI](testing-and-ci.md).

## What does the hosted and expanded version add?

The same registry with a dashboard around it:

- sign-in with SSO and organisations as scopes;
- role-based curation of each component's status and tags, with an audit log;
- hosted docs that read the packages you have already published, so every published version has docs without you running a site.

Your repo stays the source and your npm registry stays the publish target; the hosted version only reads them. If you stop using it, nothing in your repo changes. See https://platform.behivetech.com/expanded, and the full guide at https://platform.behivetech.com/docs.

## Can someone build this for us?

Behive Tech offers consulting on component libraries, design systems and this registry: https://platform.behivetech.com/services.

## Related

- [Getting started](getting-started.md)
- [Components](components.md)
- [Scopes](scopes.md)
- [Publishing](publishing.md)
- [Deploy](deploy.md)
- [Updating](updating.md)
- [Adopting](adopting.md)
- [Testing and CI](testing-and-ci.md)
- [Design tokens](design-tokens.md)
