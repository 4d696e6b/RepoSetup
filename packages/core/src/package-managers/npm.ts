import { npmAddArgs } from "./add-args.js";
import { createPackageManagerCommand } from "./command.js";
import type {
  AddPackagesRequest,
  InstallProjectRequest,
  PackageManagerAdapter,
  RemovePackagesRequest,
} from "./types.js";
import { validateCwd, validatePackageSpecs } from "./validate.js";

/**
 * npm CLI commands verified from:
 * https://docs.npmjs.com/cli/v12/commands/npm-install/
 * https://docs.npmjs.com/cli/v12/commands/npm-uninstall
 *
 * - add: `npm install [<package-spec> ...]`
 * - add (dev): `-D, --save-dev`
 * - install project: `npm install` with no package-spec (uses package-lock.json)
 * - remove: `npm uninstall <pkg>` (aliases `unlink`, `remove`, `rm`, `r`, `un`; default `--save`)
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

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "npm",
        args: npmAddArgs(request),
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

  remove(request: RemovePackagesRequest) {
    const cwdError = validateCwd(request.cwd);
    if (cwdError !== undefined) {
      return { ok: false, error: cwdError };
    }

    const specError = validatePackageSpecs(request.packages);
    if (specError !== undefined) {
      return { ok: false, error: specError };
    }

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "npm",
        args: ["uninstall", ...request.packages],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },
};
