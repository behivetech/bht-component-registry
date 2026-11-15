# Working in this registry

This repository is a component registry: one npm package per component under
`registry/<scope>/<category>/<name>`, docs generated from source, a static docs site in `apps/docs`.
`CLAUDE.md` at the root is the full map and rule set; the guide is in `apps/docs/default-docs/guide/`.

## Scaffold with the generators, never by hand

Do not hand-write a new component, hook or util package, docs page or generator, and do not copy an existing
one as a starting point. Run the generator and then edit what it wrote:

```bash
pnpm gen                                   # the list, with a description of each
pnpm gen component <scope> <category> <name>
pnpm gen hook <scope> <name>               # registry/<scope>/hooks/<name>, a React hook package
pnpm gen util <scope> <name>               # registry/<scope>/utils/<name>, a plain function package
pnpm gen doc <section> "<Page title>" <description|-> <order> <blank|contributing|standards|override|hide>
pnpm gen generator <name>                  # a skeleton for a generator of your own
```

The generators are where the conventions live — folder layout, `package.json` (name, `publishConfig`,
build scripts, `registry` metadata), the example and README shape, docs frontmatter. A copy made
by hand drifts from them and `update` cannot bring it back in line. If no generator produces what is
needed, extend the generator (or write a new one under `generators/<name>/` with `pnpm gen generator`)
rather than working around it.

## The docs app's chrome is the @behivetech packages

The site's own buttons, cards, badges, tables, text fields, empty states and hero come from the
published `@behivetech` components (pinned in `apps/docs/package.json`), with `@behivetech/cms.base-styles`
as the token sheet. Do not copy a component into `apps/docs` or style a package's classes from the app;
change the package. `globals.scss` holds only the site-level font wiring; the colours come from `src/generated/theme.css`, generated from `registry.config.json#site.theme`, and the owner's brand files live in `branding/` at the root (never under `apps/docs/public`).

## Class names are BEM through `getClassName`

Every styled element gets its class from `getClassName` (`@behivetech/bht-class-names`): the root is
`rootClass` (`<classPrefix>__<PascalName>` in a registry package — `classPrefix` from `scope.json`, else the scope in CONSTANT_CASE — and `<PascalName>` in the docs app), children are
`getChildClass("kebab-name")`, variants are `modifiers`, and the `.module.scss` mirrors that tree with
`&__child` and `&--modifier`. Never write `styles.foo`, a literal class string, a selector that reaches into
another component's classes (pass it `className` instead), or a class for a state the DOM already carries
(`aria-current`, `disabled`) — style the attribute.

## Modifiers in SCSS are written one way

Hard rule, in every `.module.scss`. Inside `&--modifier` there are exactly two kinds of block: `&.Root` for the root's own properties (declarations, `&:hover`, `&::after`), and `.Root { &__child { … } }` for the children the modifier changes.

```scss
.ComponentName {
  &__child {
    // child
  }

  &--md {
    &.ComponentName {
      // the root itself under the modifier
    }

    .ComponentName {
      &__child {
        // the child under the modifier
      }
    }
  }
}
```

Never `&--md &__child`, `&--md { .ComponentName__child {} }`, `&--md:hover`, a top-level `.ComponentName--md …`, or a declaration directly in `&--md`. One block per modifier. The re-opened `.ComponentName` holds `&__child` blocks only. When you open a stylesheet written another way, fix it in the same change and check that the extra class from `&.Root` changes no winner in the cascade.

## One stylesheet per component

Hard rule. Each component has its own `.module.scss`, which styles that component only: no class of another component, no second block, no `@use` of another component's stylesheet. To style a child component, give it a prop or pass it `className` and style that class in the parent's file.

`pnpm check:scss` checks both rules (it is part of `pnpm verify`). The Components guide (`apps/docs/default-docs/guide/components.md`, "Modifiers in the stylesheet") explains them.

Keep the other repo rules from `CLAUDE.md`: no required environment variables, nothing hardcoded to a
scope name, `docs/` and `registry/` and `generators/` are the owner's and `update` never touches them.

<!-- This file is template-owned and replaced by `npx create-bht-component-registry update`.
     Add your own Copilot instructions as .github/instructions/*.instructions.md instead. -->
