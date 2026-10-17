import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Fresh throwaway database on every run; never touches data/expenseme.db.
    command: `sh -c "mkdir -p data && rm -f data/e2e.db* && next dev -p ${PORT}"`,
    url: `http://localhost:${PORT}/login`,
    env: { EXPENSEME_DB: "data/e2e.db" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
