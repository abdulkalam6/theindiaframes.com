import { defineConfig, devices } from "@playwright/test";

const browserChannel = process.platform === "win32" && !process.env.CI ? "msedge" : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    channel: browserChannel,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], channel: browserChannel },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"], channel: browserChannel },
    },
  ],
});
