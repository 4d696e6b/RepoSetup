import { describe, expect, it } from "vitest";

import { createRegistry } from "./create-registry.js";
import { fakeIntegration } from "./fake-integration.js";

describe("createRegistry", () => {
  it("registers integrations and returns them by id", () => {
    const registry = createRegistry();
    const database = fakeIntegration({ id: "fake-db", category: "database" });
    registry.register(database);

    expect(registry.get("fake-db")).toBe(database);
    expect(registry.get("missing")).toBeUndefined();
  });

  it("lists registered integrations in stable id order", () => {
    const registry = createRegistry([
      fakeIntegration({ id: "zeta" }),
      fakeIntegration({ id: "alpha" }),
      fakeIntegration({ id: "mu" }),
    ]);

    expect(registry.list().map((definition) => definition.id)).toEqual(["alpha", "mu", "zeta"]);
  });

  it("rejects duplicate ids at registration time", () => {
    const registry = createRegistry([fakeIntegration({ id: "dup" })]);

    expect(() => registry.register(fakeIntegration({ id: "dup" }))).toThrow();

    try {
      registry.register(fakeIntegration({ id: "dup" }));
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        code: "DUPLICATE_INTEGRATION",
        details: { integrationId: "dup" },
      });
    }
  });
});
