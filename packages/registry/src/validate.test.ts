import { describe, expect, it } from "vitest";

import { fakeIntegration } from "./fake-integration.js";
import { validateRegistry } from "./validate.js";

describe("validateRegistry", () => {
  it("accepts a unique acyclic catalog", () => {
    const result = validateRegistry([
      fakeIntegration({
        id: "fake-db",
        category: "database",
      }),
      fakeIntegration({
        id: "fake-orm",
        category: "orm",
        requirements: [
          {
            kind: "requires",
            target: { type: "integration", id: "fake-db" },
            reason: "Needs a database",
          },
        ],
        recommendations: [
          {
            kind: "recommends",
            target: { type: "category", category: "validation" },
            reason: "Schema validation is useful",
          },
        ],
      }),
    ]);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("detects duplicate ids", () => {
    const result = validateRegistry([
      fakeIntegration({ id: "dup" }),
      fakeIntegration({ id: "dup", name: "Other" }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_INTEGRATION",
        details: { integrationId: "dup" },
      }),
    ]);
  });

  it("detects missing integration references", () => {
    const result = validateRegistry([
      fakeIntegration({
        id: "fake-orm",
        requirements: [
          {
            kind: "requires",
            target: { type: "integration", id: "missing-db" },
            reason: "Needs a database",
          },
        ],
        conflicts: [
          {
            kind: "conflicts",
            target: { type: "integration", id: "missing-other" },
            reason: "Incompatible",
          },
        ],
      }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual([
      "UNKNOWN_INTEGRATION",
      "UNKNOWN_INTEGRATION",
    ]);
    expect(result.errors.map((error) => error.details)).toEqual([
      expect.objectContaining({ referencedId: "missing-db" }),
      expect.objectContaining({ referencedId: "missing-other" }),
    ]);
  });

  it("does not treat recommendations as requirement edges", () => {
    const result = validateRegistry([
      fakeIntegration({
        id: "alpha",
        recommendations: [
          {
            kind: "recommends",
            target: { type: "integration", id: "beta" },
            reason: "Nice to have",
          },
        ],
      }),
      fakeIntegration({
        id: "beta",
        recommendations: [
          {
            kind: "recommends",
            target: { type: "integration", id: "alpha" },
            reason: "Also nice",
          },
        ],
      }),
    ]);

    expect(result.valid).toBe(true);
  });

  it("does not treat conflicts or alternatives as requirement cycles", () => {
    const result = validateRegistry([
      fakeIntegration({
        id: "alpha",
        conflicts: [
          {
            kind: "conflicts",
            target: { type: "integration", id: "beta" },
            reason: "Pick one",
          },
        ],
        alternatives: [
          {
            kind: "alternative",
            target: { type: "integration", id: "beta" },
            reason: "Either works",
          },
        ],
      }),
      fakeIntegration({
        id: "beta",
        conflicts: [
          {
            kind: "conflicts",
            target: { type: "integration", id: "alpha" },
            reason: "Pick one",
          },
        ],
      }),
    ]);

    expect(result.valid).toBe(true);
  });

  it("detects a requirement cycle", () => {
    const result = validateRegistry([
      fakeIntegration({
        id: "alpha",
        requirements: [
          {
            kind: "requires",
            target: { type: "integration", id: "beta" },
            reason: "Needs beta",
          },
        ],
      }),
      fakeIntegration({
        id: "beta",
        requirements: [
          {
            kind: "requires",
            target: { type: "integration", id: "alpha" },
            reason: "Needs alpha",
          },
        ],
      }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "DEPENDENCY_CYCLE",
        details: { cycle: ["alpha", "beta", "alpha"] },
      }),
    ]);
  });

  it("returns the same errors for the same catalog", () => {
    const catalog = [
      fakeIntegration({
        id: "omega",
        requirements: [
          {
            kind: "requires",
            target: { type: "integration", id: "missing-z" },
            reason: "Gone",
          },
        ],
      }),
      fakeIntegration({ id: "dup" }),
      fakeIntegration({ id: "dup" }),
      fakeIntegration({
        id: "alpha",
        requirements: [
          {
            kind: "requires",
            target: { type: "integration", id: "beta" },
            reason: "Needs beta",
          },
        ],
      }),
      fakeIntegration({
        id: "beta",
        requirements: [
          {
            kind: "requires",
            target: { type: "integration", id: "alpha" },
            reason: "Needs alpha",
          },
        ],
      }),
    ];

    const first = validateRegistry(catalog);
    const second = validateRegistry([...catalog].reverse());

    expect(first.valid).toBe(false);
    expect(second).toEqual(first);
    expect(first.errors.map((error) => error.code)).toEqual([
      "DEPENDENCY_CYCLE",
      "DUPLICATE_INTEGRATION",
      "UNKNOWN_INTEGRATION",
    ]);
  });
});
