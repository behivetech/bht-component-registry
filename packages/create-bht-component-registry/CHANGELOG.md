# create-bht-component-registry

## 0.4.2

### Patch Changes

- c5f453b: Template: a configured `site.primaryColor` no longer breaks the dark scheme. The site used the light scheme's colour as the dark primary and left the dark label on it, about 2:1 with the default colour, and the same colour as link and outlined-button text on dark surfaces, under 3:1. The dark scheme now derives a lighter primary and a dark label from the configured colour in OKLCH (6:1 or better on each other, 8:1 on the surfaces); without a configured colour the sheet's own pair applies as before. The Scopes guide says which colour to pick, and the e2e suite measures the contrast in both schemes.

## 0.4.1

### Patch Changes

- 669e359: Template: `ALLOWED_DEV_ORIGINS=<host,...> pnpm dev` opens the dev server by LAN address or from another device. Next refuses dev resources from hosts it was not told about, so such a page loaded but never hydrated and showed no live examples; the guide's Getting started and FAQ pages say so.

## 0.4.0

### Minor Changes

- 55711bd: Template: compositions are now examples. A component's live examples live in `<name>.example.tsx` (the generators write that), the site's tab and route are **Examples** (`/examples`), and the guide, seeds and tooling use the word throughout. The old `*.composition.tsx` name is still read, with a build-time warning naming the file, so a registry can take this update first and rename at leisure; template 0.5 stops reading it.
- 9ef1ae5: Template: a scope can name the class prefix its components use. `registry/<scope>/scope.json` takes `"classPrefix": "BHT"` and `pnpm gen component` puts it on every new component's root class (`BHT__Button`, `.BHT__Button { &__label {} }`). Without it the prefix is the scope in CONSTANT_CASE, as before, so existing registries are unaffected. Set it before a scope's first component so the whole scope shares one prefix.

## 0.3.0

### Minor Changes

- d61ffb4: Template: two new guide pages — The expanded version (what it adds, that it runs on your infrastructure with standard unchanged underneath, and that it is set up through Behive Tech consulting) and Terms (as-is, no warranty, limitation of liability, your responsibilities, third-party terms, privacy), also shipped as TERMS.md. The footer links Terms while the page exists; the "hosted" wording and the default "Hosted & expanded version" link are gone.
- 7e32883: Template: public and private packages side by side. `registry.config.json#privateRegistry` names where private packages go (GitHub Packages, Verdaccio, …); `pnpm gen component` asks for a visibility and writes the matching `publishConfig`; the Changelog tab looks each package up on its own registry; private packages carry a Private badge; the release workflow adds the private registry's token (`PRIVATE_REGISTRY_TOKEN`, or the job's `GITHUB_TOKEN` for GitHub Packages). A package's registry is permanent after its first release: `pnpm check:publish` (in `verify` and CI) refuses a change.
- f792e08: Template: hooks and utilities are first-class packages. `pnpm gen hook` and `pnpm gen util` scaffold them (categories `hooks` and `utils`, in new registries' defaults); the docgen reads every exported function's signature, `@param`, `@returns` and `@example` with the TypeScript compiler and shows them on the component page (hooks also get live examples from their compositions); `docs.json` carries them too. New guide page: Hooks and utilities, with the JSDoc convention.
- 4872c20: Template: a Docs section on the site. Every Markdown file under `docs/` is a page (frontmatter: title, description, section, order; a folder is a section), listed in the header and a sidebar, with relative `.md` links resolved and ```jsx live fences running as examples. The site reads the template's guide (`apps/docs/default-docs/`, replaced by `update`) and your `docs/` (never touched) as one tree: a file under `docs/` at the same relative path replaces the default page, and `hidden: true` in its frontmatter removes it — so making a guide page yours is a copy, with no bookkeeping. New registries start with their own Using this registry, Contributing and Standards pages under `docs/`.
- 2dd5f59: Template: generators are now plop. `pnpm gen` lists every generator; `pnpm gen component` (or `pnpm gen component <scope> <category> <name>` to skip the prompts) replaces `pnpm gen --args …`. New `doc` generator writes a Markdown page into `docs/` from a preset, and `pnpm gen generator` writes a commented skeleton into `generators/<name>/`. Both folders are yours: `update` never touches them. The template's own guide moved from `docs/` to `apps/docs/default-docs/guide/` (owned with the app), and a file at the same relative path under `docs/` replaces the default page. `CLAUDE.md` and a new `.github/copilot-instructions.md` tell AI assistants to scaffold with the generators rather than by hand; the Generators guide says how to give the same rule to any other assistant. Prompts show examples, where the result lands, and how to fix an invalid answer.
- 5faa6d3: Template: live examples run in an isolated preview frame (`/sandbox`). A modal, drawer or toast now opens inside its own preview instead of over the docs page; previews size to their content, can be expanded, and open on their own in a new tab with any edits kept. A package can opt out of its catalog thumbnail with `registry.preview.thumbnail: false`.
- df2f200: Template: `@bht-component-registry/env` now carries everything a component package builds, lints, type-checks and tests with. The Vitest config and setup (jest-dom matchers, jsdom stubs) moved into it — the root `vitest.config.ts` is a one-line re-export and is template-owned — and the `*.module.scss` typings come from the env's tsconfig, so generated packages no longer carry a `global.d.ts`. New guide page: The env package.
- 7e2b771: Template: design links. A component's `package.json` can declare `registry.design: [{ label, url }]` (the generator asks for a Figma URL); the site gains a Design tab with a card per link, Figma links optionally embedded (`site.embedDesigns`, off by default), and `site.design` links the design-system file from the tokens page. New guide page: Design links.
- cb39e3d: Template: a hook's or utility's parameter table has a Default column, like a component's props table. The docgen records a parameter's initializer as written (`initial = false` → `false`) in `docs.json` (`defaultValue`, null when there is none).

### Patch Changes

- 4445c71: Template: the Terms page and `TERMS.md` are now a short plain-language notice grounded in the MIT licence, the way open-source component libraries present theirs — what the licence means here, what is yours, third-party services, trademarks, privacy, and that consulting and the expanded version are under a separate agreement. Every package carries `"license": "MIT"`, and the component, hook and util generators write it into new packages (change it to your own licence if you like).
- 4735c5d: Template: the docs site's own components and routes now name every class through `getClassName` with BEM names, the way registry components do — a root class per component, `__child` elements, `--modifier` variants, one stylesheet per component with no selectors into another's. The convention is written down in the Standards seed page, the Components guide, `CLAUDE.md` and the Copilot instructions. No visual change.
- dd40cb9: Template: README snippets that call hooks at the top level and then render a multi-line element now run in the live preview. The setup/JSX split happened at the last line opening a tag — the closing tag of a multi-line element — so the opening tags stayed in the setup region and react-live got invalid code. It now splits at the first.

## 0.2.1

### Patch Changes

- d9ea91c: Template: the release workflow publishes with npm trusted publishing by default (repository variable `NPM_TRUSTED_PUBLISHING=true`), with `NPM_TOKEN` as the fallback, and private packages are hidden from `pnpm changeset` and never versioned.

## 0.2.0

### Minor Changes

- 0a11740: The template no longer uses a task runner. `update` now owns `scripts/**` (the `pnpm gen` generator and its templates) and removes `turbo.json` and `turbo/generators/**` from repos created from pre-release templates.

### Patch Changes

- 661a0af: `create` and `update` download the template from the tag `changeset publish` creates for this package (`create-bht-component-registry@<version>`), so a release needs no separate `v<version>` tag.
