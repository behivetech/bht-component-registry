import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the STATIC BUILD, served the way a static host
 * would serve it. There is no auth, no database and no env to set up, so the
 * suite runs the same on a laptop and in CI.
 *
 * `pnpm build` (which regenerates the catalog first) writes apps/docs/out;
 * `serve` hosts that folder on :3000 and answers unknown paths with the
 * exported 404.html and a real 404 status, which the routing specs rely on.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm serve",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
