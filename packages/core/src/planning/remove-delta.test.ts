import { describe, expect, it } from "vitest";

import { createMemoryDetectionFs } from "../detection/filesystem.js";
import { readPackageJson } from "../detection/package-json.js";
import type { InstallationOperation } from "../operations/types.js";

import { filterRemoveOperations } from "./remove-delta.js";

describe("filterRemoveOperations", () => {
  it("keeps uninstalls only for packages that are still declared", async () => {
    const files = createMemoryDetectionFs({
      "package.json": JSON.stringify({
        dependencies: { zod: "4.0.0" },
        devDependencies: {},
      }),
      ".prettierrc": "{}\n",
    });
    const packageJson = await readPackageJson(files);
    const operations: InstallationOperation[] = [
      {
        type: "run_command",
        command: "pnpm",
        args: ["remove", "zod"],
        cwd: ".",
        description: "Remove Zod",
      },
      {
        type: "run_command",
        command: "pnpm",
        args: ["remove", "prettier"],
        cwd: ".",
        description: "Remove Prettier",
      },
      {
        type: "create_file",
        path: ".prettierrc",
        content: "{}\n",
        behavior: "fail_if_exists",
        description: "Must not reverse install file steps",
      },
      {
        type: "show_message",
        message: "Leave Prettier config in place",
        description: "Leave Prettier config files in place",
      },
    ];

    const remaining = await filterRemoveOperations(operations, files, packageJson);
    expect(remaining).toEqual([
      expect.objectContaining({ description: "Remove Zod" }),
      expect.objectContaining({ description: "Leave Prettier config files in place" }),
    ]);
  });

  it("is a no-op when the package is already absent, including leftover config messages", async () => {
    const files = createMemoryDetectionFs({
      "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }),
      ".prettierrc": "{}\n",
    });
    const packageJson = await readPackageJson(files);
    const remaining = await filterRemoveOperations(
      [
        {
          type: "run_command",
          command: "pnpm",
          args: ["remove", "prettier"],
          cwd: ".",
          description: "Remove Prettier",
        },
        {
          type: "show_message",
          message: "Leave Prettier config in place",
          description: "Leave Prettier config files in place",
        },
      ],
      files,
      packageJson,
    );
    expect(remaining).toEqual([]);
  });

  it("keeps uv remove when pyproject.toml still declares the package", async () => {
    const files = createMemoryDetectionFs({
      "pyproject.toml": '[project]\ndependencies = ["fastapi[standard]", "pydantic"]\n',
    });
    const remaining = await filterRemoveOperations(
      [
        {
          type: "run_command",
          command: "uv",
          args: ["remove", "pydantic"],
          cwd: ".",
          description: "Remove Pydantic",
        },
        {
          type: "run_command",
          command: "uv",
          args: ["remove", "ruff"],
          cwd: ".",
          description: "Remove Ruff",
        },
      ],
      files,
      undefined,
    );
    expect(remaining).toEqual([expect.objectContaining({ description: "Remove Pydantic" })]);
  });
});
