---
"create-bht-component-registry": minor
---

Template: one modifier shape in every stylesheet, and a check for it. Inside `&--modifier` there are two kinds of block: `&.Root { … }` for the root's own properties and `.Root { &__child { … } }` for the children the modifier changes; never `&--modifier &__child` or a declaration directly in the modifier. The docs app and the example components are converted (nothing renders differently). `pnpm check:scss` (`scripts/check-scss-conventions.mjs`, part of `pnpm verify`) checks the shape and "one stylesheet per component" on every `.module.scss`; your own `registry/**` stylesheets are checked too, so convert them or the check fails. Guide: Components ("Modifiers in the stylesheet", "One stylesheet per component"), Standards, Contributing, and a new FAQ entry on why this registry rather than another component framework.
