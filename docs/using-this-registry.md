---
title: Using this registry
description: How to install and use the components published from this registry.
order: 1
---

# Using this registry

Every component here is its own npm package under `@example/`, published from this repo. Pick one from the catalog, install it, import it.

## Install

```bash
pnpm add @example/atoms.price-tag
```

The package name is always `@example/<category>.<name>`, which is also its folder in this repo: `registry/example/<category>/<name>`.

## Use

```tsx
import { PriceTag } from "@example/atoms.price-tag";
import "@example/atoms.price-tag/styles.css";

<PriceTag amount={19.99} />;
```

Each package ships its compiled JavaScript, its stylesheet (`styles.css`, imported once per app), its TypeScript types, and — because the docs on this site are generated from the same source — a `docs.json` with everything the Overview and Properties tabs show.

## Versions

Packages follow semver and each has its own version; the Changelog tab on a component's page lists what changed in each release. Pin what you depend on and read the changelog before a major bump.

## Questions, bugs, requests

See [Contributing](contributing.md) for how to propose a change or a new component, and [Standards](standards.md) for the rules every component follows.
