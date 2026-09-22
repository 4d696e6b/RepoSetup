export function packageNameFromSpec(spec: string): string {
  if (spec.startsWith("@")) {
    const slash = spec.indexOf("/");
    if (slash === -1) {
      return spec;
    }

    const versionAt = spec.indexOf("@", slash);
    return versionAt === -1 ? spec : spec.slice(0, versionAt);
  }

  const versionAt = spec.indexOf("@");
  return versionAt === -1 ? spec : spec.slice(0, versionAt);
}

export function packageSpecsFromAddArgs(args: readonly string[]): string[] {
  const start = args[0] === "add" || args[0] === "install" ? 1 : 0;
  return args.slice(start).filter((arg) => !arg.startsWith("-"));
}

export function isPackageAddCommand(command: string, args: readonly string[]): boolean {
  if (command === "pnpm" && args[0] === "add") {
    return packageSpecsFromAddArgs(args).length > 0;
  }

  if (command === "npm" && args[0] === "install") {
    return packageSpecsFromAddArgs(args).length > 0;
  }

  if (command === "uv" && args[0] === "add") {
    return packageSpecsFromAddArgs(args).length > 0;
  }

  if (command === "python" && args[0] === "-m" && args[1] === "pip" && args[2] === "install") {
    return args.slice(3).filter((arg) => !arg.startsWith("-")).length > 0;
  }

  return false;
}

export function packageSpecsFromRemoveArgs(args: readonly string[]): string[] {
  const start = args[0] === "remove" || args[0] === "uninstall" ? 1 : 0;
  return args.slice(start).filter((arg) => !arg.startsWith("-"));
}

export function isPackageRemoveCommand(command: string, args: readonly string[]): boolean {
  if (command === "pnpm" && args[0] === "remove") {
    return packageSpecsFromRemoveArgs(args).length > 0;
  }

  if (command === "npm" && args[0] === "uninstall") {
    return packageSpecsFromRemoveArgs(args).length > 0;
  }

  if (command === "uv" && args[0] === "remove") {
    return packageSpecsFromRemoveArgs(args).length > 0;
  }

  return false;
}
