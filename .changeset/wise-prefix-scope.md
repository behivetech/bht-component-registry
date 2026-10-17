---
"create-bht-component-registry": minor
---

Template: a scope can name the class prefix its components use. `registry/<scope>/scope.json` takes `"classPrefix": "BHT"` and `pnpm gen component` puts it on every new component's root class (`BHT__Button`, `.BHT__Button { &__label {} }`). Without it the prefix is the scope in CONSTANT_CASE, as before, so existing registries are unaffected. Set it before a scope's first component so the whole scope shares one prefix.
