import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit and component tests. Runs in jsdom so React Testing Library works;
// files that need only Node can opt out with `// @vitest-environment node`.
// Playwright covers everything that needs a real server (see playwright.config.ts).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: {
      // Real class names from *.module.scss, so assertions can target them.
      modules: { classNameStrategy: "non-scoped" },
    },
  },
});
