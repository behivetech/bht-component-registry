import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the STATIC BUILD, served the way a static host
 * would serve it. There is no auth, no database and no env to set up, so the
 * suite runs the same on a laptop and in CI.
 *
 * The root `pnpm build` runs every package's build in dependency order, regenerates the
 * catalog and writes apps/docs/out — building only this app would fail on a
 * fresh checkout, where the packages have no dist yet. `serve` hosts the
 * folder on :3000 and answers unknown paths with the exported 404.html and a
 * real 404 status, which the routing specs rely on.
 */
// PORT lets the suite run beside another dev server (default 3000).
const port = process.env.PORT ?? "3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // PORT lets the suite run beside another dev server (default 3000).
    command: `pnpm --dir ../.. build && pnpm exec serve out --listen ${port} --no-clipboard`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
