import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  reporter: process.env.CI ? [["line"], ["json"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5187",
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
    // needs coverage in both Chromium and iPhone WebKit.
    { name: "logic", grep: /@logic/ },
    { name: "desktop", grepInvert: /@logic/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "iphone",
      grepInvert: /@logic/,
      use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" },
    },
  ],
});
