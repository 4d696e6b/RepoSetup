import { describe, expect, it } from "vitest";

import type { InstallPackageOperation } from "../operations/types.js";
import { createPipRequirements } from "./pip-requirements.js";

const install = (packages: string[], dev = false): InstallPackageOperation => ({
  type: "install_package",
  packageManager: "pip",
  packages,
  dev,
  cwd: "apps/api",
  requiresNetwork: true,
  description: "Install selected packages",
});

describe("create pip dependency manifest", () => {
  it("records runtime, extras and dev selections without freezing unrelated environment packages", () => {
    expect(
      createPipRequirements(
        [
          install(["fastapi[standard]==0.141.1", "pydantic==2.13.5"]),
          install(["pytest==9.1.1", "pydantic==2.13.5"], true),
        ],
        "apps/api",
      ),
    ).toEqual({
      type: "create_file",
      path: "apps/api/requirements.txt",
      content: "fastapi[standard]==0.141.1\npydantic==2.13.5\npytest==9.1.1\n",
      behavior: "fail_if_exists",
      description: expect.any(String),
    });
  });
  it("does not create a pip manifest for another manager", () => {
    expect(
      createPipRequirements([{ ...install(["fastapi"]), packageManager: "uv" }], "."),
    ).toBeUndefined();
  });
});
