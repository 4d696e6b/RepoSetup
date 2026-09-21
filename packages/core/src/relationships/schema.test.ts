import { describe, expect, it } from "vitest";

import { integrationRelationshipSchema } from "./schema.js";

describe("integrationRelationshipSchema", () => {
  it("accepts a hard requirement targeting an integration", () => {
    const parsed = integrationRelationshipSchema.parse({
      kind: "requires",
      target: { type: "integration", id: "sqlite" },
      reason: "Prisma needs a database",
    });

    expect(parsed.kind).toBe("requires");
  });

  it("accepts a recommendation targeting a category", () => {
    const parsed = integrationRelationshipSchema.parse({
      kind: "recommends",
      target: { type: "category", category: "validation" },
      reason: "A schema library is useful with form handling",
    });

    expect(parsed.kind).toBe("recommends");
  });

  it("rejects treating an alternative as a requirement", () => {
    const parsed = integrationRelationshipSchema.safeParse({
      kind: "requires",
      target: { type: "integration" },
      reason: "Missing id",
    });

    expect(parsed.success).toBe(false);
  });
});
