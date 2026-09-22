import { describe, expect, it } from "vitest";

import { installationOperationSchema } from "./schema.js";

describe("installationOperationSchema", () => {
  it("accepts a run_command operation with a separate args array", () => {
    const parsed = installationOperationSchema.parse({
      type: "run_command",
      command: "pnpm",
      args: ["dlx", "create-next-app"],
      cwd: ".",
      description: "Scaffold Next.js",
      requiresNetwork: true,
    });

    expect(parsed.type).toBe("run_command");
    if (parsed.type === "run_command") {
      expect(parsed.args).toEqual(["dlx", "create-next-app"]);
    }
  });

  it("rejects a run_command operation that interpolates a shell string as args", () => {
    const parsed = installationOperationSchema.safeParse({
      type: "run_command",
      command: "pnpm",
      args: "add prisma && rm -rf /",
      cwd: ".",
      description: "Unsafe command",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a create_file operation with explicit overwrite behavior", () => {
    const parsed = installationOperationSchema.parse({
      type: "create_file",
      path: ".env.example",
      content: 'DATABASE_URL="<DATABASE_CONNECTION_STRING>"\n',
      behavior: "fail_if_exists",
      description: "Add env placeholders",
    });

    expect(parsed.type).toBe("create_file");
  });

  it("rejects an operation path that leaves the project root", () => {
    const parsed = installationOperationSchema.safeParse({
      type: "create_directory",
      path: "../outside",
      behavior: "create_if_missing",
      description: "Escape the project",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a modify_json merge operation", () => {
    const parsed = installationOperationSchema.parse({
      type: "modify_json",
      path: "package.json",
      merge: { type: "module" },
      behavior: "merge",
      description: "Set package type",
    });

    expect(parsed.type).toBe("modify_json");
  });

  it("rejects an unknown operation type", () => {
    const parsed = installationOperationSchema.safeParse({
      type: "eval_script",
      script: "echo hi",
      description: "Not a supported operation",
    });

    expect(parsed.success).toBe(false);
  });
});
