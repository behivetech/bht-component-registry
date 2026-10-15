---
"create-bht-component-registry": patch
---

Template: the docs site's own components and routes now name every class through `getClassName` with BEM names, the way registry components do — a root class per component, `__child` elements, `--modifier` variants, one stylesheet per component with no selectors into another's. The convention is written down in the Standards seed page, the Components guide, `CLAUDE.md` and the Copilot instructions. No visual change.
