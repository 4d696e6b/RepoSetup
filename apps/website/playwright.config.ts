import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  workers: 3,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:4175", headless: true },

  projects: [
    {
      name: "chromium-desktop",
      use: { browserName: "chromium", channel: "chrome", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "chromium-mobile",
      use: {
        browserName: "chromium",
        channel: "chrome",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "firefox-desktop",
      use: { browserName: "firefox", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "webkit-desktop",
      use: { browserName: "webkit", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "webkit-mobile",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "pnpm preview --port 4175 --strictPort",
    port: 4175,
    reuseExistingServer: false,
  },
  reporter: [["list"], ["json", { outputFile: "test-results/browser-report.json" }]],
});
