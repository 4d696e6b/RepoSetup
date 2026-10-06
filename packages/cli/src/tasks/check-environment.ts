import path from "node:path";

/** Executor-owned absolute directories only; no ambient environment is consulted. */
export function createTaskCheckEnvironment(input: {
  executableDirectory: string;
  homeDirectory: string;
  temporaryDirectory: string;
}): Readonly<Record<string, string>> {
  for (const value of Object.values(input)) {
    if (
      !path.isAbsolute(value) ||
      path.normalize(value) !== value ||
      [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    )
      throw new Error("Trusted check environment requires canonical absolute directories.");
  }
  return Object.freeze({
    PATH: input.executableDirectory,
    HOME: input.homeDirectory,
    TMPDIR: input.temporaryDirectory,
    TMP: input.temporaryDirectory,
    TEMP: input.temporaryDirectory,
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
    CI: "1",
  });
}
