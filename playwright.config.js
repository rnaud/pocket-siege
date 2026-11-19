import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
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
    reuseExistingServer: false,
  },
  projects: [
    // Native kernels and fixture comparisons run once; only browser behavior
    // needs Chromium. Mobile UI fixes use focused manual verification.
    { name: "logic", grep: /@logic/ },
    { name: "desktop", grepInvert: /@logic/, use: { ...devices["Desktop Chrome"] } },
  ],
});
