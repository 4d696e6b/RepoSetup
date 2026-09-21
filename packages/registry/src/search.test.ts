import { describe, expect, it } from "vitest";

import { createRegistry } from "./create-registry.js";
import { fakeIntegration } from "./fake-integration.js";

describe("registry search and byCategory", () => {
  const registry = createRegistry([
    fakeIntegration({
      id: "fake-orm",
      name: "Fake ORM",
      category: "orm",
      description: "Maps objects onto tables",
      keywords: ["mapper", "schema"],
    }),
    fakeIntegration({
      id: "fake-db",
      name: "Fake Database",
      category: "database",
      description: "Stores rows for tests",
      keywords: ["storage"],
    }),
    fakeIntegration({
      id: "fake-lint",
      name: "Fake Linter",
      category: "linting",
      description: "Checks source style",
    }),
  ]);

  it("searches by id, name, category, keywords, and description", () => {
    expect(registry.search("fake-orm").map((definition) => definition.id)).toEqual(["fake-orm"]);
    expect(registry.search("Fake Database").map((definition) => definition.id)).toEqual([
      "fake-db",
    ]);
    expect(registry.search("ORM").map((definition) => definition.id)).toEqual(["fake-orm"]);
    expect(registry.search("mapper").map((definition) => definition.id)).toEqual(["fake-orm"]);
    expect(registry.search("stores rows").map((definition) => definition.id)).toEqual(["fake-db"]);
  });

  it("returns search hits in stable id order", () => {
    expect(registry.search("fake").map((definition) => definition.id)).toEqual([
      "fake-db",
      "fake-lint",
      "fake-orm",
    ]);
  });

  it("does not treat an empty query as a match", () => {
    expect(registry.search("")).toEqual([]);
    expect(registry.search("   ")).toEqual([]);
  });

  it("filters by category in stable id order", () => {
    const extraDatabase = fakeIntegration({
      id: "another-db",
      category: "database",
    });
    const withExtra = createRegistry([...registry.list(), extraDatabase]);

    expect(withExtra.byCategory("database").map((definition) => definition.id)).toEqual([
      "another-db",
      "fake-db",
    ]);
    expect(withExtra.byCategory("ui")).toEqual([]);
  });
});
