import type { DoctorResult } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { renderDoctor } from "./render-doctor.js";

function result(overrides: Partial<DoctorResult> = {}): DoctorResult {
  return {
    projectRoot: "/virtual/app",
    checks: [
      {
        id: "prerequisite:node",
        name: "Node.js",
        ok: true,
        message: "node is on PATH.",
      },
      {
        id: "nextjs",
        name: "Next.js",
        ok: false,
        message: "package.json does not include next.",
        code: "VERIFICATION_FAILED",
        suggestion: "Add next to the project. Doctor does not install packages.",
      },
    ],
    ...overrides,
  };
}

describe("renderDoctor", () => {
  it("prints a concise table with suggestions and a summary", () => {
    const output = renderDoctor(result(), { verbose: false, quiet: false });

    expect(output).toContain("Doctor");
    expect(output).toContain("ok");
    expect(output).toContain("Node.js");
    expect(output).toContain("fail");
    expect(output).toContain("package.json does not include next.");
    expect(output).toContain(
      "Suggestion: Add next to the project. Doctor does not install packages.",
    );
    expect(output).toContain("Doctor found 1 issue.");
    expect(output).not.toContain("/virtual/app");
  });

  it("includes project root and check ids when verbose", () => {
    const output = renderDoctor(result(), { verbose: true, quiet: false });

    expect(output).toContain("Project root  /virtual/app");
    expect(output).toContain("[nextjs]");
  });

  it("prints only failures when quiet", () => {
    const output = renderDoctor(result(), { verbose: false, quiet: true });

    expect(output).not.toContain("Node.js");
    expect(output).toContain("fail");
    expect(output).toContain("Next.js");
    expect(output).not.toContain("Doctor passed.");
    expect(output).not.toContain("Doctor found");
  });

  it("summarizes a healthy report", () => {
    const output = renderDoctor(
      result({
        checks: [
          {
            id: "prerequisite:node",
            name: "Node.js",
            ok: true,
            message: "node is on PATH.",
          },
        ],
      }),
      { verbose: false, quiet: false },
    );

    expect(output).toContain("Doctor passed.");
  });
});
