---
"create-bht-component-registry": minor
---

Template: public and private packages side by side. `registry.config.json#privateRegistry` names where private packages go (GitHub Packages, Verdaccio, …); `pnpm gen component` asks for a visibility and writes the matching `publishConfig`; the Changelog tab looks each package up on its own registry; private packages carry a Private badge; the release workflow adds the private registry's token (`PRIVATE_REGISTRY_TOKEN`, or the job's `GITHUB_TOKEN` for GitHub Packages). A package's registry is permanent after its first release: `pnpm check:publish` (in `verify` and CI) refuses a change.
