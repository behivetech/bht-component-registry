import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
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
      onlyWarn,
    },
  },
  {
    // tsup writes this as a transient temp file while bundling tsup.config.ts,
    // then deletes it. A build running next to lint (two terminals, or a
    // runner that parallelises them) can let ESLint's directory glob catch it
    // mid-flight, causing an ENOENT when it tries to read the file.
    ignores: ["dist/**", "**/tsup.config.bundled_*.mjs"],
  },
];
