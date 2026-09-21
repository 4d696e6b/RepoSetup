import type { AddPackagesRequest, InstallProjectRequest, PackageManagerAdapter } from "./types.js";
import { createPackageManagerCommand } from "./command.js";
import { validateCwd, validatePackageSpecs } from "./validate.js";

/**
 * npm CLI commands verified from:
 * https://docs.npmjs.com/cli/v12/commands/npm-install/
 *
 * - add: `npm install [<package-spec> ...]`
 * - add (dev): `-D, --save-dev`
 * - install project: `npm install` with no package-spec (uses package-lock.json)
 */
export const npmAdapter: PackageManagerAdapter = {
  id: "npm",
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

    const args = request.dev === true ? ["install", "--save-dev"] : ["install"];

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "npm",
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
        command: "npm",
        args: ["install"],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },
};
