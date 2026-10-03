import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:4173", headless: true },
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
  ],
  webServer: {
    command: "pnpm preview --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: false,
  },
  reporter: "list",
});
