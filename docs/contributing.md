---
title: Contributing
description: How a change gets into this registry, from idea to published package.
order: 2
---

# Contributing

How a change gets into this registry, from idea to published package. This page is yours — edit it to match how your team works.

## Proposing a component

- Check the catalog first: does an existing component cover it with one more prop? Prefer extending over adding.
- Open an issue (or a short design note) with the use case, the proposed props and a sketch of the states it has.
- Agree on the category and the name before scaffolding; both are part of the package name and cannot be renamed later without a new package.

## Building it

```bash
pnpm gen component          # scope → category → name
pnpm install
pnpm dev
```

A component ships with its source, a `.module.scss`, a `*.example.tsx` of named examples, a spec and a README. The docs site is generated from exactly those files, so there is nothing else to update.

## Writing the stylesheet

Two rules, with no exceptions to argue for in review. `pnpm check:scss` checks both on commit and in CI.

**A modifier is written one way.** Inside `&--modifier` there are two kinds of block and nothing else: `&.Root` for the root's own properties, and `.Root { &__child { … } }` for the children the modifier changes.

```scss
.ACME__Button {
  &__label {
    font-weight: 500;
  }

  &--loading {
    &.ACME__Button {
      cursor: wait; // the root itself, and its &:hover or &::after
    }

    .ACME__Button {
      &__label {
        opacity: 0; // a child under the modifier
      }
    }
  }
}
```

Never `&--loading &__label`, a declaration directly in `&--loading`, or `&--loading:hover`. One block per modifier: a new child goes into the block that is already there.

**One stylesheet per component.** A component's `.module.scss` styles that component only. To change how a child component looks, give it a prop, or pass it a `className` and style that class in your own file. Never select its classes or pull in its stylesheet.

The [Components guide](guide/components.md) ("Modifiers in the stylesheet") has the full shape and the reasons.

## Before you open a pull request

- `pnpm verify` is green (build, lint, types, unit tests, the stylesheet check).
- Every public prop has a JSDoc line; the props table on the site is generated from them.
- There is an example for each visual state that matters.
- You have run `pnpm changeset` and described the change the way you would want to read it in the changelog.

## Releasing

Merging to `main` lets the release workflow open a "Version Packages" pull request; merging that one publishes every bumped package. See [Publishing](guide/publishing.md) for the details.
