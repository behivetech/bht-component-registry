---
"create-bht-component-registry": minor
---

Template: a hook's or utility's parameter table has a Default column, like a component's props table. The docgen records a parameter's initializer as written (`initial = false` → `false`) in `docs.json` (`defaultValue`, null when there is none).
