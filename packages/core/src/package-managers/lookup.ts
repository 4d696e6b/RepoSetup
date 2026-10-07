import { createRepoSetupError } from "../errors/model.js";
import type { PackageManager } from "../config/types.js";
import type { InstallPackageOperation } from "../operations/types.js";

import { npmAdapter } from "./npm.js";
import { pipAdapter } from "./pip.js";
import { pnpmAdapter } from "./pnpm.js";
import type { PackageManagerAdapter, PackageManagerCommandResult } from "./types.js";
import { uvAdapter } from "./uv.js";

type SupportedPackageManager = Exclude<PackageManager, "bun">;

const adapters: Record<SupportedPackageManager, PackageManagerAdapter> = {
  npm: npmAdapter,
  pnpm: pnpmAdapter,
  uv: uvAdapter,
  pip: pipAdapter,
};

export function getPackageManagerAdapter(id: PackageManager): PackageManagerAdapter | undefined {
  if (id === "bun") {
    return undefined;
  }

  return adapters[id];
}

export function toPackageManagerCommand(
  operation: InstallPackageOperation,
): PackageManagerCommandResult {
  const adapter = getPackageManagerAdapter(operation.packageManager);
  if (adapter === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNSUPPORTED_CONTEXT",
        message: `Package manager "${operation.packageManager}" is not supported yet.`,
        details: { packageManager: operation.packageManager },
        suggestion: "Use npm, pnpm, uv, or pip. Bun can follow after the Node path is stable.",
      }),
    };
  }

  return adapter.add({
    packages: operation.packages,
    cwd: operation.cwd,
    description: operation.description,
    ...(operation.dev === true ? { dev: true as const } : {}),
    ...(operation.exact === true ? { exact: true as const } : {}),
    ...(operation.allowBuild === undefined ? {} : { allowBuild: operation.allowBuild }),
  });
}
