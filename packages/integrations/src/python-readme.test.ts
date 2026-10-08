import type { PlanContext } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { pythonAppReadme } from "./python-readme.js";

describe("generated Python run instructions", () => {
  it.each(["uv", "pip"] as const)(
    "uses %s and advertises only selected tools",
    (packageManager) => {
      const context: PlanContext = {
        config: {
          schemaVersion: 1,
          project: { name: "demo" },
          runtime: { id: "python" },
          packageManager,
          framework: { id: "fastapi" },
          integrations: [],
        },
        projectRoot: ".",
        options: {},
      };
      const readme = pythonAppReadme(context, "FastAPI", "fastapi dev");
      expect(readme).toContain(packageManager === "uv" ? "`uv run fastapi dev`" : "`fastapi dev`");
      expect(readme).not.toContain("pytest");
      if (packageManager === "pip") expect(readme).not.toContain("uv run");
      context.config.integrations = [{ id: "pytest" }];
      expect(pythonAppReadme(context, "FastAPI", "fastapi dev")).toContain(
        packageManager === "uv" ? "`uv run pytest`" : "`pytest`",
      );
    },
  );
});
