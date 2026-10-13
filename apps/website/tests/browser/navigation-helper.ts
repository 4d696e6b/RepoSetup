import type { Page } from "@playwright/test";

/** Reach the same destinations through the compact desktop/mobile disclosure. */
export async function revealNavigation(page: Page, destination: string) {
  const header = page.locator(".site-header");
  const mobile = header.getByRole("button", { name: "Open navigation", exact: true });
  if (await mobile.isVisible()) await mobile.click();
  if (destination !== "Docs" && destination !== "Search") {
    const explore = header.getByRole("button", { name: "Explore", exact: true });
    if ((await explore.getAttribute("aria-expanded")) !== "true") await explore.click();
  }
}
