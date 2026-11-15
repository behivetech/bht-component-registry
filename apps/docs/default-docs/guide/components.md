---
title: Components
description: The anatomy of a component folder, scaffolding, README and example conventions, status and tags.
order: 2
---

# Components

A component is a folder at `registry/<scope>/<category>/<name>`, which is also the npm package `@<scope>/<category>.<name>`. Everything the docs site shows for it is derived from that folder at build time: the README is the Overview tab, the examples are the live examples, the TypeScript interface is the props table, the CHANGELOG is the Changelog tab, and `package.json` carries the version, status and tags. There is no record anywhere else to keep in step.

## Anatomy of a component folder

`pnpm gen component acme atoms button` writes:

```
registry/acme/atoms/button/
├─ button.tsx                 the component and its exported ButtonProps interface
├─ button.module.scss         styles (CSS Modules), compiled into dist/index.css
├─ button.example.tsx         named exports that become the live examples
├─ button.spec.tsx            unit tests (Vitest + Testing Library)
├─ index.ts                   the package's public exports
├─ README.md                  the Overview tab
├─ CHANGELOG.md               written by Changesets; the Changelog tab
├─ package.json               @acme/atoms.button, scripts, files, sideEffects, publishConfig, registry, license (MIT by default; yours to change)
├─ tsup.config.ts             createComponentConfig() from @bht-component-registry/env
├─ tsconfig.json              extends the env's tsconfig (which also types *.module.scss imports); excludes specs and examples from the build
└─ eslint.config.mjs          re-exports the env's ESLint config
```

The last three are one line each: everything a package builds, lints, type-checks and tests with comes from `packages/env`, so a change there reaches every component. See [The env package](env.md).

Two files appear after a build and are gitignored:

- `dist/`: the tsup output (ESM, CJS, types, `index.css`).
- `docs.json`: the props table as react-docgen computes it, written by `bht-registry-docgen`. It ships in the tarball so the published package describes itself. See [Publishing](publishing.md).

Why each file is there:

- `<name>.tsx` holds exactly one exported component whose props interface is `<Name>Props`. The docs engine documents every exported, capitalised component it finds in the package's `.tsx` files (specs and examples excluded), so keep helpers un-exported or in `index.ts`.
- `<name>.module.scss` is compiled by the shared tsup config into `dist/index.css`, which the package exposes as `./styles.css`. A package declares `"sideEffects": ["**/*.css"]` (a hook or util, which has no styles, `false`) so a bundler keeps its stylesheet and still drops what an app does not use. The docs site loads a package's stylesheet only for a page or example that uses that package.
- `<name>.example.tsx`: each named export is one example. See below.
- `index.ts` is what consumers and the docs sandbox import. Only export from here what you want in the Playground scope.
- `README.md` and `CHANGELOG.md` are shown as-is. The generator writes a CHANGELOG containing only the package-name heading; Changesets adds releases under it.

### Styling: BEM through `getClassName`

Every class name in a component — and in the docs site itself — comes from `getClassName` (`@behivetech/bht-class-names`), so the markup and the stylesheet agree by construction:

```tsx
const [rootClass, getChildClass] = getClassName({
  rootClass: "ACME__Button", // <classPrefix>__<PascalName> — scope.json's classPrefix, else the scope in CONSTANT_CASE
  styles, // the CSS-module map, so names resolve to the hashed classes
  className, // whatever the consumer passed, merged onto the root
  modifiers: { loading }, // `ACME__Button--loading` while true
});

<button className={rootClass}>
  <span className={getChildClass("label")}>…</span> // ACME__Button__label
</button>;
```

The stylesheet is the same tree: `.ACME__Button { &__label {} &--loading {} }`. Three rules follow from it: no `styles.foo` or hand-written class strings anywhere; a stylesheet styles its own component only (position a child by passing it `className`, never by selecting its classes); and a state the DOM already carries (`aria-current`, `disabled`) is styled from that attribute rather than a second class.

### Modifiers in the stylesheet

A modifier is written one way, in every stylesheet:

```scss
.ACME__Button {
  padding: 0 1rem;

  &__label {
    font-weight: 500;
  }

  &--loading {
    // The root itself, while loading.
    &.ACME__Button {
      cursor: wait;
    }

    // Its children, while loading.
    .ACME__Button {
      &__label {
        opacity: 0;
      }
    }
  }
}
```

Inside the modifier block, the root class appears twice and means two different things. `&.ACME__Button` (with the `&`) is the root element carrying the modifier, so the root's own properties go there, along with its states (`&:hover`) and pseudo-elements (`&::after`). `.ACME__Button` (without the `&`) re-opens the block as a descendant, so every child the modifier changes goes inside it as `&__child`, exactly as it is written at the top of the file.

The rules that follow:

- Nothing sits directly in `&--modifier` except those two blocks: no declarations, no `&:hover`, no `&__child`.
- A child is never reached on the modifier's own line (`&--loading &__label`), by its full class (`.ACME__Button__label`), or from a rule outside the root block (`.ACME__Button--loading .ACME__Button__label`).
- One block per modifier. When a second child changes under the same modifier, add it to the block that is already there. Modifiers that share rules may also be grouped in a list (`&--left, &--right { … }`) beside each one's own block.
- The re-opened `.ACME__Button` holds `&__child` blocks and nothing else. A `&:hover` or a declaration placed there would style a button nested inside this one, not this one.
- Two modifiers together are a compound, written with the second modifier's full class: `&--invalid { &.ACME__Button--loading { … } }`, or inside the root compound when the first has properties of its own, `&--invalid { &.ACME__Button { … &.ACME__Button--loading { … } } }`.
- A condition from outside the component, such as the page theme, wraps the blocks inside the modifier: `&--paired { :root[data-theme="dark"] & { .ACME__Header { &__logo { … } } } }`.
- Pseudo-classes are states, not modifiers, and stay as they are: `&:hover { … }`. A state of the root under a modifier nests in the root compound: `&--linked { &.ACME__Button { &:hover { … } } }`, never `&--linked:hover`.
- A modifier whose name is built in a loop follows the same shape: `&--cols-#{$n} { &.ACME__Grid { … } }`.

Why this shape: each modifier is one place that lists everything it changes, a new child under a modifier has an obvious home, and the child selectors read the same under a modifier as they do at the top of the file. Every modifier rule also gets the same specificity (two classes), so a modifier always beats the base rule whatever the order in the file, and no rule wins by accident.

### One stylesheet per component

Each component has its own `.module.scss`, and that file styles that component only: every class in it belongs to its own root block, and it never pulls another component's stylesheet in. When a component needs a child component to look different, there are two ways, and no third:

- give the child a prop, which the child turns into a modifier in its own stylesheet; or
- pass the child a `className` (one of your own `getChildClass` classes) and style that class in your file. Every component accepts `className` for this.

A child element that needs a modifier of its own becomes its own component, with its own stylesheet, inside the parent package.

One packaging exception exists. A package whose component renders another package's component may `@use` that package's stylesheet by its package path, unchanged, so that its own published `styles.css` works without a second import (a Modal that renders a Card as its panel, for example). It re-emits the other stylesheet; it still never styles the other component's classes. Each case is listed by file in `scripts/lib/scss-files.mjs`, and a new one is a decision to make first, not a default.

`pnpm check:scss` checks the modifier shape and the one-component rule on every `.module.scss`; it runs on commit and in CI. It skips `docs-history`, which is generated. Two things it cannot see stay with the reviewer: a child element that needs a modifier (it becomes its own component), and whether a class you pass to a child still wins over what the child's modifier sets (a modifier rule has two classes, so use the child's prop for anything its modifiers control).

Categories offered by the generator are `atoms`, `molecules`, `forms`, `organisms`, `templates`. The catalog also recognises `utils` and `theme`, in case you need them. Display order is atoms, molecules, organisms, templates, forms, utils, theme.

## Scaffolding with `pnpm gen`

Interactive:

```bash
pnpm gen component
```

It asks for the scope (defaulting to the one in `registry.config.json`; existing scopes are listed), the category (a list) and the name (kebab-case, for example `date-picker`). Each prompt shows where the result lands. Scope and name are validated; an empty or malformed scope is refused, because the package name would not be a valid scoped name, and a name that already exists in that scope is refused too.

Without prompts — the answers in order:

```bash
pnpm gen component acme atoms date-picker
```

`pnpm gen` on its own lists every generator, including any you have added; see [Generators](generators.md). The files come from `scripts/generators/component/templates/*.hbs` (Handlebars: `{{ pascalCase name }}`, `{{ constantCase scope }}` and friends). Edit them to change what a new component starts with; they are template-owned, so keep such edits in a commit you can re-apply after an update — or copy the generator into `generators/` and make it yours.

After either form:

```bash
pnpm install
pnpm dev
```

The catalog step notices the new package and adds it to `apps/docs/package.json#dependencies` as `workspace:*`; `pnpm install` links it. If `pnpm dev` is already running, stop it first: installing under a running dev server makes Turbopack lose modules.

## README conventions

The README is the Overview tab. A few rules make it work as docs:

- **The H1 is the title.** `# Price Tag` is shown as the page title and on the catalog card; the H1 itself is stripped from the rendered body. A PascalCase H1 (`# PriceTag`) is split into words; anything else is shown exactly as you wrote it. With no H1, the folder name is title-cased.
- **The first paragraph after the H1 is the summary**, one line, used on catalog cards and in the page description. It is also the published package's `description`: `pnpm release` writes it into `package.json` just for the publish and restores the file after, so leave `package.json#description` empty and the sentence lives in one place. The component's JSDoc is the fallback when a README has no summary.
- **No props table.** The Props tab is generated from the TypeScript interface and its JSDoc, so a hand-written table in the README is a second copy that drifts. The README is for what the component is for, how to use it, and the decisions behind it.
- **Linking back from npm is automatic.** With the site URL set, as `registry.config.json#site.url` or the `BHT_DOCS_SITE_URL` environment variable that overrides it (see [Scopes](scopes.md)), `pnpm release` publishes each package with its docs page as `homepage` and a `Docs: <url>` line under the summary; neither is written into the repo.
- **` ```jsx ` and ` ```tsx ` blocks run live.** Each one is rendered as a working example above its code, editable in place. Other languages (` ```bash `, ` ```scss `) render as plain code.
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
import { RatingStars } from "@example/atoms.rating-stars";

<RatingStars value={4.3} count={128} />;
```
````

## Examples

`<name>.example.tsx` holds the examples shown on the Examples tab, in the Playground, and, for the first example, as the thumbnail on the catalog card.

Until template 0.4 the file was `<name>.composition.tsx`. The site still reads that name and warns about it at build time; rename when convenient — 0.5 stops reading it.

Every live example runs in its own document — an iframe the site serves at `/sandbox` — so a component that portals to `document.body` or positions itself `fixed` (a modal, a drawer, a toast) opens inside its preview and never over the docs page. The frame grows to fit its content; **Expand** gives an overlay room to open, and **Open in new tab** runs the example on its own, including any edits you have made. Catalog tiles are not frames at all (dozens of them would be heavy): the site renders each tile's first example to static markup when it is built, in Node, so that example must render on the server, with no `window` or `document` touched during render (use an effect for those). A component that fails to render there, or that only opens as an overlay, has nothing to show in a tile: for an overlay, say so with `"registry": { "preview": { "thumbnail": false } }` in its `package.json`; either way the tile shows a placeholder.

A page loads only what it renders. A frame reads its program, loads the registry packages whose exports the program names (and their dependencies' styles) and nothing else; a frame far from the viewport is unmounted and mounts again when you scroll back; the code editor loads when you open **Edit code**. So an example may use any component from the registry without importing it, and the cost of a page is the cost of what it shows.

- **Each named export that starts with a capital letter is one example.** `export const BasicRatingStars = () => <RatingStars value={4} />;` becomes the example "Basic Rating Stars"; the title is the export name split at capitals.
- **A JSDoc comment above the export becomes its description.**
- **File-level helpers are pulled in.** Fixtures, interfaces and functions you declare at the top level without exporting are included in an example when the example references them (transitively), so the editor shows the ten lines that matter rather than the whole file.
- **Imports are dropped**, as with README snippets; the package's own exports and every other registry export are in scope.
- Each example is turned into a react-live program that ends with `render(<Name />)`, so you can edit it in the browser.

```tsx
import { RatingStars } from "./rating-stars.js";

const reviews = { value: 4.3, count: 128 };

/** A fractional rating with its review count. */
export const FractionalRatingStars = () => (
  <RatingStars value={reviews.value} count={reviews.count} />
);
```

Examples are excluded from the package build by `tsconfig.json` but shipped in the tarball as source, so other tools can render them.

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
- `design` is a list of `{ "label", "url" }` links to the component's design — a Figma frame, a spec, anything. It gives the component a Design tab. See [Design links](design-links.md).
- `preview.thumbnail: false` keeps the component off its catalog tile (for anything that opens as an overlay).

Changing status or tags is a commit, reviewed like any other change. The [expanded version](expanded.md) adds a dashboard and roles for this.

## Removing a component

1. Delete the folder: `rm -rf registry/acme/atoms/button`.
2. Remove `@acme/atoms.button` from `apps/docs/package.json#dependencies` if it is listed (the catalog step adds registry packages there; it does not remove them).
3. Run `pnpm install`.
4. Add a changeset describing the removal: `pnpm changeset`. Pick any package that references the removed one, or write a `.changeset/*.md` note by hand so the removal shows up in the release notes.
5. Already-published versions stay on the registry. If consumers should move off them, run `npm deprecate @acme/atoms.button "Removed; use @acme/atoms.new-button"`.

## Related

- [Getting started](getting-started.md)
- [Generators](generators.md)
- [The env package](env.md)
- [Scopes](scopes.md)
- [Publishing](publishing.md)
- [Design tokens](design-tokens.md)
- [Testing and CI](testing-and-ci.md)
- [FAQ](faq.md)
