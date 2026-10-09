import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inject, pageview, type BeforeSendEvent } from "@vercel/analytics";
import { injectSpeedInsights, type BeforeSendMiddleware } from "@vercel/speed-insights";
import { initializeObservability, publicPagePath } from "../src/observability.js";
import { release } from "../src/release.js";
import { docPages } from "../src/docs/model.js";
import { browserCsp, productionOrigins } from "../src/security.js";

const mocks = vi.hoisted(() => ({ setRoute: vi.fn() }));
vi.mock("@vercel/analytics", () => ({ inject: vi.fn(), pageview: vi.fn() }));
vi.mock("@vercel/speed-insights", () => ({
  injectSpeedInsights: vi.fn(() => ({ setRoute: mocks.setRoute })),
}));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("public website observability", () => {
  it("tracks every checked-in public page using a bounded route", () => {
    for (const page of docPages)
      expect(publicPagePath(`#/docs/${page.slug}`)).toBe(`/docs/${page.slug}`);
    for (const integration of release.integrations)
      expect(publicPagePath(`#/integrations/${integration.id}`)).toBe(
        `/integrations/${integration.id}`,
      );
    for (const preset of release.presets)
      expect(publicPagePath(`#/builder/${preset.id}`)).toBe("/builder");
    expect(publicPagePath("#/docs/create?token=private#confirmation")).toBe("/docs/create");
    expect(publicPagePath("#/integrations?goal=private-search")).toBe("/integrations");
    for (const hash of [
      "#/docs/private-name",
      "#/builder/private-project",
      "#//private",
      "#/docs/create/private",
    ])
      expect(publicPagePath(hash)).toBe("/not-found");
  });

  it("does not initialize SDKs on local, development, preview, or unknown hosts", () => {
    for (const origin of [
      "http://127.0.0.1:4181",
      "http://localhost:4181",
      "https://unknown.vercel.app",
      "http://reposetupcli.com",
    ])
      initializeObservability(true, { origin, hash: "#/" })();
    initializeObservability(false, { origin: productionOrigins[0]!, hash: "#/" })();
    expect(inject).not.toHaveBeenCalled();
    expect(injectSpeedInsights).not.toHaveBeenCalled();
    expect(pageview).not.toHaveBeenCalled();
  });

  it.each(productionOrigins)("redacts URLs and custom events on %s", (origin) => {
    const location = { origin, hash: "#/builder/react-vite?name=secret-project#private-fragment" };
    const record = initializeObservability(true, location);
    record();
    const analytics = vi.mocked(inject).mock.calls[0]![0]!;
    const speed = vi.mocked(injectSpeedInsights).mock.calls[0]![0]!;
    expect(analytics.disableAutoTrack).toBe(true);
    const raw: BeforeSendEvent = {
      type: "pageview",
      url: `${origin}/?token=private#/builder/secret`,
    };
    expect(analytics.beforeSend!(raw)).toEqual({ type: "pageview", url: `${origin}/builder` });
    expect(analytics.beforeSend!({ ...raw, type: "event" })).toBeNull();
    expect(
      (speed.beforeSend as BeforeSendMiddleware)({ type: "vital", url: raw.url, route: "private" }),
    ).toEqual({ type: "vital", url: `${origin}/builder`, route: "/builder" });
    expect(pageview).toHaveBeenCalledExactlyOnceWith({ path: "/builder", route: "/builder" });
    location.hash = "#/builder/next-sqlite?config=private";
    record();
    expect(pageview).toHaveBeenCalledTimes(1);
    location.hash = "#/docs/create#confirmation";
    record();
    expect(pageview).toHaveBeenLastCalledWith({ path: "/docs/create", route: "/docs/create" });
    expect(mocks.setRoute).toHaveBeenLastCalledWith("/docs/create");
  });

  it("permits requests only to the production observability paths", () => {
    const sources = browserCsp.split("connect-src ")[1]!.split(";")[0]!.split(" ");
    expect(sources).toEqual(
      productionOrigins.flatMap((origin) => [
        `${origin}/_vercel/insights/`,
        `${origin}/_vercel/speed-insights/`,
      ]),
    );
    expect(browserCsp).not.toContain("unsafe-inline");
    expect(browserCsp).not.toContain("unsafe-eval");
  });
});
