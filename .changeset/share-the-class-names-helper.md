---
"@behivetech/bht-class-names": minor
---

First published version of the shared `getClassName` helper, renamed from the workspace-only `@bht-component-registry/class-names`. It no longer depends on `classnames`: the part it used is `joinClassNames` in this package, with byte-identical output (the `classnames` test cases are ported, and a differential test against `classnames` 2.5.1, a test-only devDependency, compares 200,000 generated inputs with zero differences). Better types (`ClassValue`, `GetChildClass`, `IGetClassNameProps` are exported) and JSDoc; a value `classnames` threw on (an object with no prototype, or a `toString` key that is not a function) is read as a plain object. Published to GitHub Packages for now; it moves to npm with the rest of the `@behivetech` packages.
