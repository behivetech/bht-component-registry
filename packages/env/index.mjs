import { spawnSync } from "node:child_process";
import { sassPlugin, postcssModules } from "esbuild-sass-plugin";

/** Set on the chained pass below so it builds one format and does not re-chain. */
const CHAINED_FORMAT = "BHT_BUILD_FORMAT";

/**
 * Build config shared by every component package.
 *
 * The formats are built as two sequential tsup runs rather than one run listing
 * both. tsup builds the formats of a single config concurrently, and each
 * format's esbuild pass writes the compiled stylesheet to the same
 * `dist/index.css`. Two writers racing on one path leave the file torn: the
 * shorter output lands over the longer one and the tail of the longer survives,
 * which shows up as a stray `;` and an unmatched `}`. Strict parsers
 * (Turbopack, lightningcss) reject that outright while the JS output is fine.
 *
 * It reproduced on roughly a third of clean `atoms.icon` builds, and shipped in
 * `@behivetech/atoms.icon@0.2.1`. The two passes' CSS differs only in
 * esbuild-sass-plugin's banner comment, which is why the banner that survives
 * varies between releases and reads like a plugin upgrade rather than a race.
 *
 * Chaining through `onSuccess` keeps this in one place: every package's `build`
 * script stays a plain `tsup`. Watch mode keeps the original single-run
 * behaviour — it rebuilds constantly and never publishes, and chaining a second
 * process on every keystroke would cost more than the race does there.
 */
export function createComponentConfig(overrides = {}) {
  const { esbuildPlugins = [], ...rest } = overrides;
  const chainedFormat = process.env[CHAINED_FORMAT];
  const isWatch = process.argv.includes("--watch") || process.argv.includes("-w");

  const base = {
    entry: ["index.ts"],
    sourcemap: false,
    injectStyle: true,
    external: ["react", "react-dom"],
    // Workspace tooling (the class-name helper) is private to this repo, so a
    // published package must not depend on it at runtime: bundle it in.
    noExternal: [/^@bht-component-registry\//],
    esbuildPlugins: [
      sassPlugin({
        transform: postcssModules({ generateScopedName: "[local]" }),
      }),
      ...esbuildPlugins,
    ],
  };

  // One run, both formats, one declaration pass — see the note above on why watch
  // mode keeps the original behaviour.
  if (isWatch) {
    return { ...base, format: ["cjs", "esm"], dts: true, clean: true, ...rest };
  }

  // The second pass. `clean` stays off or it would delete the first pass's output.
  //
  // This pass owns the declarations. Every package is `"type": "module"`, so the
  // esm pass emits `index.d.ts` — the file each package's `exports["."].types`
  // actually points at — while the cjs pass would emit `index.d.cts`, which no
  // package references. Generating declarations in both passes meant paying for
  // the slowest part of the build twice per package, sequentially, across ~30
  // component packages. That is what once pushed another app's deploy past its
  // 45 minute build limit once the passes were serialized.
  if (chainedFormat) {
    return { ...base, format: [chainedFormat], dts: true, clean: false, ...rest };
  }

  return {
    ...base,
    format: ["cjs"],
    dts: false,
    clean: true,
    onSuccess: async () => {
      const result = spawnSync("tsup", [], {
        stdio: "inherit",
        env: { ...process.env, [CHAINED_FORMAT]: "esm" },
      });

      if (result.error) {
        throw new Error(`esm build failed to start: ${result.error.message}`);
      }
      if (result.status !== 0) {
        throw new Error(`esm build exited with ${result.status}`);
      }
    },
    ...rest,
  };
}
