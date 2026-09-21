import { describe, expect, it } from "vitest";

import { pythonDistributionName, textDeclaresPythonPackage } from "./python-package.js";

describe("python package detection", () => {
  it("strips extras from a PEP 508 spec", () => {
    expect(pythonDistributionName("fastapi[standard]")).toBe("fastapi");
    expect(pythonDistributionName("SQLAlchemy")).toBe("sqlalchemy");
  });

  it("finds declared dependencies in pyproject.toml and requirements.txt", () => {
    expect(
      textDeclaresPythonPackage(
        '[project]\ndependencies = ["fastapi[standard]>=0.115"]\n',
        "fastapi",
      ),
    ).toBe(true);
    expect(textDeclaresPythonPackage("flask==3.1.0\n# comment\n", "Flask")).toBe(true);
    expect(textDeclaresPythonPackage('dependencies = ["pydantic"]\n', "django")).toBe(false);
  });
});
