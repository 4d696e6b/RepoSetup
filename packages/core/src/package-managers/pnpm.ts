import { pnpmAddArgs } from "./add-args.js";
import { createPackageManagerCommand } from "./command.js";
import type {
  AddPackagesRequest,
  InstallProjectRequest,
  PackageManagerAdapter,
  RemovePackagesRequest,
} from "./types.js";
import { validateCwd, validatePackageSpecs } from "./validate.js";

/**
 * pnpm CLI commands verified from:
 * https://pnpm.io/cli/add
 * https://pnpm.io/cli/install
 * https://pnpm.io/cli/remove
 *
 * - add: `pnpm add <pkg>`
 * - add (dev): `--save-dev, -D, -d`
 * - install project: `pnpm install` (alias `i`)
 * - frozen install: `pnpm install --frozen-lockfile`
 *   (https://pnpm.io/cli/install). pnpm-lock.yaml is not updated.
 * - remove: `pnpm remove <pkg>` (aliases `rm`, `uninstall`, `un`)
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

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "pnpm",
        args: pnpmAddArgs(request),
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

    const args = request.frozen === true ? ["install", "--frozen-lockfile"] : ["install"];
    if (request.preferOffline === true) {
      args.push("--prefer-offline");
    }
    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "pnpm",
        args,
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
        command: "pnpm",
        args: ["remove", ...request.packages],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },
};
