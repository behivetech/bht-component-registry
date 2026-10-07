import { defineConfig } from "vitest/config";

// Pure Node: the CLI touches the filesystem and spawns pnpm, nothing renders.
// Tests stub the network (template download) and pnpm through the commands'
// options objects, so the suite runs offline and without a pnpm on PATH.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
