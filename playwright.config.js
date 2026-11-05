import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  use: { baseURL: "http://127.0.0.1:5187" },
  webServer: {
    command: "npm run dev -- --port 5187 --strictPort",
    url: "http://127.0.0.1:5187",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "iphone",
      use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" },
    },
  ],
});
