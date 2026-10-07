# Components

A component is a folder at `registry/<scope>/<category>/<name>`, which is also the npm package `@<scope>/<category>.<name>`. Everything the docs site shows for it is derived from that folder at build time: the README is the Overview tab, the compositions are the live examples, the TypeScript interface is the props table, the CHANGELOG is the Changelog tab, and `package.json` carries the version, status and tags. There is no record anywhere else to keep in step.

## Anatomy of a component folder

`pnpm gen --args acme atoms button` writes:

```
registry/acme/atoms/button/
├─ button.tsx                 the component and its exported ButtonProps interface
├─ button.module.scss         styles (CSS Modules), compiled into dist/index.css
├─ button.composition.tsx     named exports that become the live examples
├─ button.spec.tsx            unit tests (Vitest + Testing Library)
├─ index.ts                   the package's public exports
├─ README.md                  the Overview tab
├─ CHANGELOG.md               written by Changesets; the Changelog tab
├─ package.json               @acme/atoms.button, scripts, files, publishConfig, registry
├─ tsup.config.ts             createComponentConfig() from @bht-component-registry/env
├─ tsconfig.json              extends the shared config; excludes specs and compositions from the build
├─ eslint.config.mjs          re-exports the shared config
└─ global.d.ts                types *.module.scss imports
```

Two files appear after a build and are gitignored:

- `dist/`: the tsup output (ESM, CJS, types, `index.css`).
- `docs.json`: the props table as react-docgen computes it, written by `bht-registry-docgen`. It ships in the tarball so the published package describes itself. See [Publishing](publishing.md).

Why each file is there:

- `<name>.tsx` holds exactly one exported component whose props interface is `<Name>Props`. The docs engine documents every exported, capitalised component it finds in the package's `.tsx` files (specs and compositions excluded), so keep helpers un-exported or in `index.ts`.
- `<name>.module.scss` is compiled by the shared tsup config into `dist/index.css`, which the package exposes as `./styles.css`. The docs site imports it for every package so examples are styled.
- `<name>.composition.tsx` is the bit.dev pattern: each named export is one example. See below.
- `index.ts` is what consumers and the docs sandbox import. Only export from here what you want in the Playground scope.
- `README.md` and `CHANGELOG.md` are shown as-is. The generator writes a CHANGELOG containing only the package-name heading; Changesets adds releases under it.

Categories offered by the generator are `atoms`, `molecules`, `forms`, `organisms`, `templates`. The catalog also recognises `utils` and `theme`, in case you need them. Display order is atoms, molecules, organisms, templates, forms, utils, theme.

## Scaffolding with `pnpm gen`

Interactive:

```bash
pnpm gen
```

It asks for the scope (defaulting to the one in `registry.config.json`; existing scopes are listed), the category (a list) and the name (kebab-case, for example `date-picker`). Scope and name are validated; an empty or malformed scope is refused, because the package name would not be a valid scoped name.

Without prompts:

```bash
pnpm gen --args acme atoms date-picker
```

After either form:

```bash
pnpm install
pnpm dev
```

The catalog step notices the new package and adds it to `apps/docs/package.json#dependencies` as `workspace:*`; `pnpm install` links it. If `pnpm dev` is already running, stop it first: installing under a running dev server makes Turbopack lose modules.

## README conventions

The README is the Overview tab. A few rules make it work as docs:

- **The H1 is the title.** `# Price Tag` is shown as the page title and on the catalog card; the H1 itself is stripped from the rendered body. A PascalCase H1 (`# PriceTag`) is split into words; anything else is shown exactly as you wrote it. With no H1, the folder name is title-cased.
- **The first paragraph after the H1 is the summary**, one line, used on catalog cards and in the page description. `package.json#description` wins if set; the component's JSDoc is the fallback if neither exists.
- **```` ```jsx ```` and ```` ```tsx ```` blocks run live.** Each one is rendered as a working example above its code, editable in place. Other languages (```` ```bash ````, ```` ```scss ````) render as plain code.
- **Import lines are stripped** before a snippet runs, because every export of every registry package is already in the sandbox scope. Write the imports anyway: readers copy them.
- A snippet that is a bare JSX expression is rendered directly (siblings are allowed). A snippet that declares a component (`function Example() {}` or `const Example = () => …`) is rendered as `<Example />`. A snippet that calls hooks at the top level is wrapped in a component for you.
- Everything else is GitHub-flavoured Markdown: headings, tables, lists, links.

Example from `registry/example/atoms/rating-stars/README.md`:

````markdown
# Rating Stars

A read-only star rating. Fractional values are drawn with a clipped fill
rather than rounded to a half, so 4.3 and 4.7 look different.

## Usage

```jsx
import { RatingStars } from '@example/atoms.rating-stars';

<RatingStars value={4.3} count={128} />
```
````

## Compositions

`<name>.composition.tsx` holds the examples shown on the Compositions tab, in the Playground, and as the live thumbnail on the catalog card.

- **Each named export that starts with a capital letter is one example.** `export const BasicRatingStars = () => <RatingStars value={4} />;` becomes the example "Basic Rating Stars"; the title is the export name split at capitals.
- **A JSDoc comment above the export becomes its description.**
- **File-level helpers are pulled in.** Fixtures, interfaces and functions you declare at the top level without exporting are included in an example when the example references them (transitively), so the editor shows the ten lines that matter rather than the whole file.
- **Imports are dropped**, as with README snippets; the package's own exports and every other registry export are in scope.
- Each example is turned into a react-live program that ends with `render(<Name />)`, so you can edit it in the browser.

```tsx
import { RatingStars } from "./rating-stars.js";

const reviews = { value: 4.3, count: 128 };

/** A fractional rating with its review count. */
export const FractionalRatingStars = () => <RatingStars value={reviews.value} count={reviews.count} />;
```

Compositions are excluded from the package build by `tsconfig.json` but shipped in the tarball as source, so other tools can render them.

## The props table

The Properties section on the Overview tab is generated by react-docgen-typescript from your component's TypeScript, at build time.

- **Write JSDoc on each prop.** The comment becomes the Description column. `/** Number of stars; defaults to 5 */ max?: number;`
- **Required props come first**, then the rest alphabetically. Defaults from destructuring (`size = "md"`) appear in the Default column.
- **Unions of literals are expanded.** `size?: RatingStarsSize` where `type RatingStarsSize = "sm" | "md" | "lg"` is shown as `"sm" | "md" | "lg"`, not as the alias name (up to 12 members; longer unions show the alias). The alias is one click away on the Code tab.
- **Native attributes are not listed.** Props inherited from `node_modules` types are filtered out, so `extends HTMLAttributes<HTMLDivElement>` does not bury your five props under three hundred. When the interface extends a native or library type the table says "Also accepts the native attributes" instead.
- **The component's own JSDoc** (the comment above `export const RatingStars`) is its description and the summary fallback.

The same computation is written to `docs.json` by `bht-registry-docgen` during the package build, so the docs site and the published package agree.

## Status and tags: the `registry` field

Each component's `package.json` may carry:

```json
{
  "name": "@example/atoms.rating-stars",
  "registry": {
    "status": "beta",
    "tags": ["feedback"]
  }
}
```

- `status` is one of `stable`, `beta`, `draft`, `deprecated`. It defaults to `stable` when omitted and shows as a badge in the component header and on the catalog card.
- `tags` is a list of short strings, shown as a tag list in the same places. They are display-only; search on the scope page matches titles.

Changing status or tags is a commit, reviewed like any other change. The hosted version adds a dashboard and roles for this; see [FAQ](faq.md).

## Removing a component

1. Delete the folder: `rm -rf registry/acme/atoms/button`.
2. Remove `@acme/atoms.button` from `apps/docs/package.json#dependencies` if it is listed (the catalog step adds registry packages there; it does not remove them).
3. Run `pnpm install`.
4. Add a changeset describing the removal: `pnpm changeset`. Pick any package that references the removed one, or write a `.changeset/*.md` note by hand so the removal shows up in the release notes.
5. Already-published versions stay on the registry. If consumers should move off them, run `npm deprecate @acme/atoms.button "Removed; use @acme/atoms.new-button"`.

## Related

- [Getting started](getting-started.md)
- [Scopes](scopes.md)
- [Publishing](publishing.md)
- [Design tokens](design-tokens.md)
- [Testing and CI](testing-and-ci.md)
- [FAQ](faq.md)
