import type { AddPackagesRequest, InstallProjectRequest, PackageManagerAdapter } from "./types.js";
import { createPackageManagerCommand } from "./command.js";
import { validateCwd, validatePackageSpecs } from "./validate.js";

/**
 * pnpm CLI commands verified from:
 * https://pnpm.io/cli/add
 * https://pnpm.io/cli/install
 *
 * - add: `pnpm add <pkg>`
 * - add (dev): `--save-dev, -D, -d`
 * - install project: `pnpm install` (alias `i`)
 */
export const pnpmAdapter: PackageManagerAdapter = {
  id: "pnpm",
  runtimeId: "node",

  add(request: AddPackagesRequest) {
    const cwdError = validateCwd(request.cwd);
    if (cwdError !== undefined) {
      return { ok: false, error: cwdError };
    }

    const specError = validatePackageSpecs(request.packages);
    if (specError !== undefined) {
      return { ok: false, error: specError };
    }

    const args = request.dev === true ? ["add", "--save-dev"] : ["add"];

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "pnpm",
        args: [...args, ...request.packages],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },

  install(request: InstallProjectRequest) {
    const cwdError = validateCwd(request.cwd);
    if (cwdError !== undefined) {
      return { ok: false, error: cwdError };
    }

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "pnpm",
        args: ["install"],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },
};
