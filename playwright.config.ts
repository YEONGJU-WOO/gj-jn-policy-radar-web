import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:53100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "corepack pnpm dev -- -H 127.0.0.1 -p 53100",
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:53100",
    reuseExistingServer: true,
  },
});
