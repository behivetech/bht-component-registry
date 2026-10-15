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
pnpm gen doc <section> "<Page title>" "<description>" <order> <preset>
pnpm gen generator <name>                  # a skeleton for a generator of your own
```

The generators are where the conventions live — folder layout, `package.json` (name, `publishConfig`,
build scripts, `registry` metadata), the composition and README shape, docs frontmatter. A copy made
by hand drifts from them and `update` cannot bring it back in line. If no generator produces what is
needed, extend the generator (or write a new one under `generators/<name>/` with `pnpm gen generator`)
rather than working around it.

## Class names are BEM through `getClassName`

Every styled element gets its class from `getClassName` (`@bht-component-registry/class-names`): the root is
`rootClass` (`<SCOPE>__<PascalName>` in a registry package, `<PascalName>` in the docs app), children are
`getChildClass("kebab-name")`, variants are `modifiers`, and the `.module.scss` mirrors that tree with
`&__child` and `&--modifier`. Never write `styles.foo`, a literal class string, a selector that reaches into
another component's classes (pass it `className` instead), or a class for a state the DOM already carries
(`aria-current`, `disabled`) — style the attribute.

Keep the other repo rules from `CLAUDE.md`: no required environment variables, nothing hardcoded to a
scope name, `docs/` and `registry/` and `generators/` are the owner's and `update` never touches them.

<!-- This file is template-owned and replaced by `npx create-bht-component-registry update`.
     Add your own Copilot instructions as .github/instructions/*.instructions.md instead. -->
