import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  // Tests are independent pages; spread every file across all workers, as CI does.
  fullyParallel: true,
  // Shared CI runners render in software and run several browsers per core;
  // give real-time cases room and retry once so one slow frame is reported
  // as flaky instead of failing the deploy.
  timeout: process.env.CI ? 90000 : 45000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["json"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5187",
    // Tests open any scenario directly; the unlock test clears this flag.
    storageState: "tests/fixtures/unlocked-campaign.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5187 --strictPort",
    url: "http://127.0.0.1:5187",
    // Local runs share one dev server between concurrent invocations; CI starts fresh.
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    // Native kernels and fixture comparisons run once; only browser behavior
    // needs Chromium. Mobile UI fixes use focused manual verification.
    { name: "logic", grep: /@logic/ },
    { name: "desktop", grepInvert: /@logic/, use: { ...devices["Desktop Chrome"] } },
  ],
});
