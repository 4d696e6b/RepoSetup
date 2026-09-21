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

  return false;
}
