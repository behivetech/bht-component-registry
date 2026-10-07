import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  // The bin is the only entry, so the shebang goes on the bundle itself.
  banner: { js: "#!/usr/bin/env node" },
  dts: false,
  sourcemap: false,
  clean: true,
  // `@bht-component-registry/scope` is a private workspace package that is
  // never published, so it must be inlined; a runtime dependency on it would
  // make the published CLI uninstallable. That is also why it sits in
  // devDependencies rather than dependencies.
  noExternal: ["@bht-component-registry/scope"],
});
