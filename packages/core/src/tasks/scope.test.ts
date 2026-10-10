import { describe, expect, it } from "vitest";
import { isSafeTaskPath } from "./primitives.js";
import { isTaskPathExcluded, taskCanRead, taskCanWrite, taskSelectorContains } from "./scope.js";
import { makeTask, makeCompilation } from "./fixtures.test-helper.js";
import { compileTaskPlan } from "./compile.js";

describe("task scope policy", () => {
  it.each([
    "/root/a",
    "C:/a",
    "\\\\server\\a",
    "src\\a",
    "src/../a",
    "./src/a",
    "src//a",
    "src/",
    "src/\u0000a",
    "src/*",
    "src/a?",
    "src/a[1]",
    " src/a",
    "src/a\n",
    "src/cafe\u0301.ts",
  ])("rejects unsafe exact path %j", (path) => {
    expect(isSafeTaskPath(path)).toBe(false);
  });
  it("uses full segments and deny precedence, including a matching read and deny", () => {
    expect(taskSelectorContains({ type: "subtree", path: "src/a" }, "src/ab.ts")).toBe(false);
    const task = makeTask("edit", "req", "src/private/file.ts");
    task.scope.deny = [{ type: "subtree", path: "src/private" }];
    expect(taskCanRead(task, "src/private/file.ts")).toBe(false);
    expect(taskCanWrite(task, "src/private/file.ts")).toBe(false);
    expect(taskCanRead(task, "src/public.ts")).toBe(true);
  });
  it.each([
    ".git/config",
    "src/node_modules/a.ts",
    "src/dist/out.ts",
    ".env",
    ".env.local",
    "src/id_rsa",
    "src/credentials-prod.json",
    "src/a.pem",
    "src/image.png",
    "src/holdout/oracle.ts",
    "src/.npmrc",
    "src/.netrc",
    "src/.ssh/config",
    "src/.aws/credentials",
  ])("excludes prohibited read/write target %s", (path) => {
    expect(isTaskPathExcluded(path, "read")).toBe(true);
    expect(isTaskPathExcluded(path, "write")).toBe(true);
  });
  it.each([
    "package.json",
    "pnpm-lock.yaml",
    "AGENTS.md",
    "src/AGENTS.md",
    "tsconfig.json",
    "eslint.config.js",
    "vitest.config.ts",
    "reposetup.tasks.json",
    "scripts/check.ts",
    "test/public/fixture.test.ts",
  ])("keeps verifier/config authority read-only: %s", (path) => {
    expect(isTaskPathExcluded(path, "write")).toBe(true);
  });
  it("rejects protected write authority even if a caller and draft both permit it", () => {
    const input = makeCompilation();
    input.draft.tasks[0]!.scope = {
      read: [{ type: "file", path: "package.json" }],
      write: ["package.json"],
      deny: [],
    };
    input.policy.authority.read.push({ type: "subtree", path: "package.json" });
    input.policy.authority.write.push("package.json");
    const result = compileTaskPlan(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_SCOPE_VIOLATION");
  });
});
