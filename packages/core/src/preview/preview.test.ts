import { describe, expect, it } from "vitest";
import type { InstallationOperation } from "../operations/types.js";
import { previewOperations } from "./preview.js";

describe("change previews", () => {
  it("classifies deterministic files, preservation, dependencies and unknown generator effects", () => {
    const operations: InstallationOperation[] = [
      {
        type: "create_file",
        path: "app/工具.txt",
        content: "generated secret-like text",
        behavior: "fail_if_exists",
        description: "create",
      },
      {
        type: "create_file",
        path: "app/keep.txt",
        content: "replacement",
        behavior: "create_if_missing",
        description: "keep",
      },
      {
        type: "install_package",
        packageManager: "pnpm",
        packages: ["zod"],
        cwd: "app",
        description: "install",
      },
      { type: "run_command", command: "generator", args: [], cwd: "app", description: "generate" },
    ];
    const preview = previewOperations(operations, {
      "app/keep.txt": { kind: "file", content: "user secret" },
    });
    expect(preview.changes.map((change) => change.category)).toEqual([
      "create",
      "preserve",
      "unknown",
      "unknown",
    ]);
    expect(JSON.stringify(preview)).not.toContain("user secret");
    expect(JSON.stringify(preview)).not.toContain("generated secret-like text");
    expect(preview.blocked).toBe(false);
  });

  it("blocks existing-file conflicts and symlink boundaries without showing values", () => {
    const preview = previewOperations(
      [
        {
          type: "create_file",
          path: "existing.txt",
          content: "new",
          behavior: "fail_if_exists",
          description: "create",
        },
        {
          type: "modify_text",
          path: "linked/config.txt",
          oldText: "private",
          newText: "public",
          description: "edit",
        },
      ],
      {
        "existing.txt": { kind: "file", content: "private" },
        "linked/config.txt": {
          kind: "blocked",
          reason: "Symlink boundary requires manual review.",
        },
      },
    );
    expect(preview.blocked).toBe(true);
    expect(preview.changes.map((change) => change.category)).toEqual(["blocked", "blocked"]);
    expect(JSON.stringify(preview)).not.toContain("private");
  });

  it("recognizes existing env keys across CRLF and preserves a repeated application", () => {
    const operation: InstallationOperation = {
      type: "add_env_example",
      path: ".env.example",
      entries: [{ key: "API_KEY", placeholder: "secret placeholder" }],
      description: "add",
    };
    const preview = previewOperations([operation], {
      ".env.example": { kind: "file", content: "API_KEY=custom\r\n" },
    });
    expect(preview.changes[0]?.category).toBe("preserve");
    expect(JSON.stringify(preview)).not.toContain("custom");
  });

  it("blocks malformed JSON and ambiguous text replacements, but accepts one CRLF match", () => {
    const json: InstallationOperation = {
      type: "modify_json",
      path: "package.json",
      merge: { scripts: { test: "vitest" } },
      behavior: "merge",
      description: "merge",
    };
    const text: InstallationOperation = {
      type: "modify_text",
      path: "README.md",
      oldText: "line\n",
      newText: "updated\n",
      description: "edit",
    };
    expect(
      previewOperations([json], { "package.json": { kind: "file", content: "{" } }).blocked,
    ).toBe(true);
    expect(
      previewOperations([text], { "README.md": { kind: "file", content: "line\nline\n" } }).blocked,
    ).toBe(true);
    expect(
      previewOperations([text], {
        "README.md": { kind: "file", content: "before\r\nline\r\nafter\r\n" },
      }).changes[0]?.category,
    ).toBe("modify");
  });

  it("treats generator-created targets as unknown rather than promising exact output", () => {
    const preview = previewOperations(
      [
        {
          type: "run_command",
          command: "generator",
          args: [],
          cwd: ".",
          description: "Generate app",
        },
        {
          type: "create_file",
          path: "src/app.ts",
          content: "export {};",
          behavior: "fail_if_exists",
          description: "Write app",
        },
      ],
      {},
    );
    expect(preview.changes.map((change) => change.category)).toEqual(["unknown", "unknown"]);
  });
});
