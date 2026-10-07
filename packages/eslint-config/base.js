import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    // tsup writes this as a transient temp file while bundling tsup.config.ts,
    // then deletes it. Since `lint` doesn't depend on `build` for the same
    // package, they can run concurrently and ESLint's directory glob can
    // catch it mid-flight, causing an ENOENT when it tries to read the file.
    ignores: ["dist/**", "**/tsup.config.bundled_*.mjs"],
  },
];
