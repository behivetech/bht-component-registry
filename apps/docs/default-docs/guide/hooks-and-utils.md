---
title: Hooks and utilities
description: Packages that are functions rather than components — how they are generated, documented and shown.
order: 4
---

# Hooks and utilities

A registry holds more than components. A React hook or a plain function is a package like any other — its own folder, version, changelog and page — and its docs are generated from its TypeScript and JSDoc the way a component's props table is.

```
registry/<scope>/hooks/use-toggle    →  @<scope>/hooks.use-toggle    exports useToggle
registry/<scope>/utils/format-price  →  @<scope>/utils.format-price  exports formatPrice
```

## Scaffolding

```bash
pnpm gen hook      # scope → name (use-…) → visibility
pnpm gen util      # scope → name → visibility
```

A hook package has a `use-<name>.ts`, a composition, a spec (with `renderHook`) and a README; a util package has a `<name>.ts`, a spec and a README. Both share the component template's tooling (tsconfig, ESLint, tsup, CHANGELOG) and publish the same way. A util package has no React dependency at all.

## What the docs show

For every exported function whose name starts with a lowercase letter — hooks are `useX`, utilities are anything else; PascalCase exports are treated as components — the site shows:

- the **signature**, as TypeScript prints it (`useToggle(initial?: boolean): [boolean, () => void]`), one per overload;
- a **parameters** table: name, type, default (as written in the signature, `initial = false`), and the `@param` text — the same columns as a component's props table;
- the **return** type and the `@returns` text;
- each **`@example`** block as code (a ```` ```ts ```` fence inside the tag is fine).

Hooks additionally get **live examples** from their compositions, exactly like components: a composition is a small component that uses the hook, and the Compositions tab and the catalog page run it.

Everything above comes from the source file. The same information is written into the package's `docs.json` on build, so a published version documents itself.

## The JSDoc convention

Every exported function carries a JSDoc block with:

```ts
/**
 * One or two sentences on what it does and when to reach for it.
 *
 * @param value   What the parameter means, not just its type.
 * @returns       What comes back, and under what conditions it differs.
 * @example
 * ```ts
 * formatPrice(1999, "USD"); // → "$19.99"
 * ```
 */
```

- The first paragraph is the description; keep it to the point.
- One `@param` per parameter, matched by name. A parameter without one shows an empty description — the type alone is rarely enough.
- `@returns` is worth writing even when the type is obvious: say what the value *means*.
- At least one `@example`, runnable as written. For a hook, a composition is the better example because it runs live; use `@example` for the one-liner.

The generators write a block in this shape with `TODO` text; replace the text, keep the tags.

## Related

- [Components](components.md)
- [Generators](generators.md)
- [Publishing](publishing.md)
