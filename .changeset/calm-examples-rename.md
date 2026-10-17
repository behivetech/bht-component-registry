---
"create-bht-component-registry": minor
---

Template: compositions are now examples. A component's live examples live in `<name>.example.tsx` (the generators write that), the site's tab and route are **Examples** (`/examples`), and the guide, seeds and tooling use the word throughout. The old `*.composition.tsx` name is still read, with a build-time warning naming the file, so a registry can take this update first and rename at leisure; template 0.5 stops reading it.
