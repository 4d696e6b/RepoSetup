import { defineConfig } from "@playwright/test";
const chromiumChannel = process.env.CI ? undefined : "chrome";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  workers: 1,
  timeout: 60000,
  globalTimeout: 600000,
  use: { baseURL: "http://127.0.0.1:4181", headless: true },
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
    { name: "webkit", use: { browserName: "webkit", viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: "pnpm preview --port 4181 --strictPort",
    port: 4181,
    reuseExistingServer: false,
  },
  reporter: [["list"], ["json", { outputFile: "test-results/browser-report.json" }]],
});
