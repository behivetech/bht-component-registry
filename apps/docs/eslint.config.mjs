import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Build output.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated at build time by scripts/generate-catalog.ts.
    "src/generated/**",
    // Playwright artifacts — the HTML report ships minified JavaScript.
    "playwright-report/**",
    "test-results/**",
    "e2e/.auth/**",
  ]),
]);

export default eslintConfig;
