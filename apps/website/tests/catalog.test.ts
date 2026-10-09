import { describe, expect, it } from "vitest";

import { discoveryGoals, filterIntegrations } from "../src/catalog";
import { release } from "../src/release";
import { relationshipTarget } from "../src/relationships";

const ids = (goal: string) => filterIntegrations("", "", goal).map((item) => item.id);

describe("release-specific goal discovery", () => {
  it("finds every frontend and backend scaffold when a beginner wants to build an app", () => {
    expect(ids("app")).toEqual(["nextjs", "react-vite", "express", "fastify", "fastapi", "flask"]);
  });

  it("includes data layers and migration tools with database choices", () => {
    expect(ids("data")).toEqual([
      "sqlite",
      "postgresql",
      "mongodb",
      "prisma",
      "drizzle",
      "mongoose",
      "sqlalchemy",
      "alembic",
    ]);
  });

  it("finds actual workflow categories and keeps search and explicit categories bounded", () => {
    expect(ids("workflow")).toEqual([
      "eslint",
      "prettier",
      "ruff",
      "docker",
      "docker-compose",
      "github-actions",
    ]);
    expect(filterIntegrations(" PYTHON ", "", "app").map((item) => item.id)).toEqual([
      "fastapi",
      "flask",
    ]);
    expect(filterIntegrations("", "formatting", "workflow").map((item) => item.id)).toEqual([
      "prettier",
    ]);
    expect(filterIntegrations("", "database", "app")).toEqual([]);
    expect(filterIntegrations("absent-query", "", "workflow")).toEqual([]);
    expect(ids("")).toHaveLength(37);
    for (const goal of discoveryGoals) {
      for (const category of goal.categories) expect(release.categories).toContain(category);
    }
  });
});

describe("relationship target discovery", () => {
  it("names and links all referenced integration IDs and category targets", () => {
    for (const item of release.integrations) {
      for (const relation of [
        ...item.requirements,
        ...item.recommendations,
        ...item.conflicts,
        ...item.includes,
        ...item.alternatives,
      ]) {
        const target = relationshipTarget(relation.target);
        if ("id" in relation.target && relation.target.id !== undefined) {
          const targetId = relation.target.id;
          const integration = release.integrations.find((entry) => entry.id === targetId);
          expect(integration).toBeDefined();
          expect(target.label).toContain(integration!.name);
          expect(target.label).toContain(integration!.id);
          expect(target.href).toBe(`#/integrations/${integration!.id}`);
        } else {
          const category = relation.target.category;
          expect(release.categories).toContain(category);
          expect(target.label).toContain("category");
          expect(new URLSearchParams(target.href.split("?")[1]).get("category")).toBe(category);
        }
      }
    }
    expect(() => relationshipTarget({ type: "missing" })).toThrow();
  });
});
