import { defineConfig } from "@playwright/test";

const chromiumChannel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "tests/production",
  outputDir: "test-results/production",
  fullyParallel: true,
  workers: 1,
  timeout: 60000,
  globalTimeout: 300000,
  use: {
    baseURL: process.env.REPOSETUP_WEBSITE_URL ?? "https://reposetup.vercel.app/",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        channel: chromiumChannel,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        channel: chromiumChannel,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "firefox", use: { browserName: "firefox", viewport: { width: 1440, height: 1000 } } },
  ],
  reporter: [["list"], ["json", { outputFile: "test-results/production-report.json" }]],
});
