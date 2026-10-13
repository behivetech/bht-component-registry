import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * The Vitest config every component package tests with.
 *
 * Packages run `vitest run` with no config of their own: Vitest walks up
 * from the package folder to the nearest `vitest.config.*`, and the repo
 * root's is a one-line re-export of this. Globals and jsdom so specs read
 * like React Testing Library specs, plus a setup file with the jest-dom
 * matchers and the DOM stubs jsdom lacks.
 *
 * A repo with a root config of its own can spread `componentTest` into it
 * instead, or scope it to `registry/**` with Vitest's `projects` option.
 */
export const componentTest = {
  globals: true,
  environment: "jsdom",
  setupFiles: [path.join(here, "vitest.setup.ts")],
};

export default defineConfig({ test: componentTest });
