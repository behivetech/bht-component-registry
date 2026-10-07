## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## Why

## Checklist

- [ ] `pnpm verify` passes locally
- [ ] `pnpm test:e2e` passes locally (or the change cannot affect the site)
- [ ] The matching guide in `docs/` is updated if behaviour changed
- [ ] A changeset is added if a published package changed (`pnpm changeset`)
- [ ] `template.manifest.json` is updated if a new top-level file should be managed by `update`
- [ ] No new required environment variable, server-side code or private registry dependency
- [ ] Commit subjects follow the conventional style (`feat(docs): …`, `fix(gen): …`)

## How to test it

<!-- Commands or clicks a reviewer can follow. -->
