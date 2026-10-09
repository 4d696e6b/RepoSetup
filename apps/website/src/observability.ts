import { inject, pageview, type BeforeSendEvent } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { docBySlug } from "./docs/model.js";
import { release } from "./release.js";
import { productionOrigins } from "./security.js";

const publicPaths = new Set([
  "/",
  "/docs",
  "/integrations",
  "/presets",
  "/release",
  ...[...docBySlug.keys()].map((id) => `/docs/${id}`),
  ...release.integrations.map(({ id }) => `/integrations/${id}`),
]);
const builderPaths = new Set(release.presets.map(({ id }) => `/builder/${id}`));

export function publicPagePath(hash: string): string {
  const path = (hash.replace(/^#/, "") || "/").split(/[?#]/)[0]!;
  if (builderPaths.has(path)) return "/builder";
  return publicPaths.has(path) ? path : "/not-found";
}

export function initializeObservability(
  production = import.meta.env.PROD,
  currentLocation: Pick<Location, "origin" | "hash"> = window.location,
): () => void {
  if (!production || !productionOrigins.includes(currentLocation.origin)) return () => {};
  let path = publicPagePath(currentLocation.hash);
  let previous: string | undefined;
  const publicUrl = () => `${currentLocation.origin}${path}`;

  inject({
    mode: "production",
    disableAutoTrack: true,
    beforeSend: (event: BeforeSendEvent) =>
      event.type === "pageview" ? { type: "pageview", url: publicUrl() } : null,
  });
  const speed = injectSpeedInsights({
    route: path,
    beforeSend: () => ({ type: "vital", url: publicUrl(), route: path }),
  });

  return () => {
    path = publicPagePath(currentLocation.hash);
    speed?.setRoute(path);
    // Heading links, filters, and project edits are not additional page views.
    if (path === previous) return;
    previous = path;
    pageview({ path, route: path });
  };
}
