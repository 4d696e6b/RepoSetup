export function isSafeExecutableName(command: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(command);
}

export function isSafeProcessArg(arg: string): boolean {
  return !arg.includes("\0");
}
