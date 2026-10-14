import { describe, expect, it } from "vitest";
import {
  taskTypeScriptCheckConfigSchema,
  validateTaskToolMetadata,
  qualifiedTaskCheckSchema,
} from "./check-qualification.js";

describe("qualified check metadata boundaries", () => {
  it.each([
    { compilerOptions: { composite: true } },
    { compilerOptions: { incremental: true } },
    { compilerOptions: {}, extends: "unreviewed.json" },
    { compilerOptions: {}, references: [{ path: "other-project" }] },
  ])("rejects emitting/build/imported TypeScript configuration profiles", (config) => {
    expect(taskTypeScriptCheckConfigSchema.safeParse(config).success).toBe(false);
  });
  it("allows explicit non-build compiler options and requires exact tool metadata", () => {
    expect(
      taskTypeScriptCheckConfigSchema.safeParse({
        compilerOptions: { strict: true, composite: false },
        include: ["src/**/*.ts"],
      }).success,
    ).toBe(true);
    expect(
      validateTaskToolMetadata(
        { name: "eslint", version: "10.11.0", scripts: { postinstall: "unused" } },
        "eslint",
        "10.11.0",
      ),
    ).toBe(true);
    expect(
      validateTaskToolMetadata({ name: "eslint", version: "10.10.0" }, "eslint", "10.11.0"),
    ).toBe(false);
    expect(
      validateTaskToolMetadata({ name: "other", version: "10.11.0" }, "eslint", "10.11.0"),
    ).toBe(false);
  });
  it("cannot interpret executable commands or an unversioned object as check authority", () => {
    expect(
      qualifiedTaskCheckSchema.safeParse({ command: "npm run test", arguments: [] }).success,
    ).toBe(false);
  });
});
