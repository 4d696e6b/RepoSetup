import type { SupportContext, SupportResult } from "@reposetup/core";

export function supportsPythonUvPip(context: SupportContext): SupportResult {
  if (context.runtimeId !== "python") {
    return { supported: false, reason: "This phase supports Python only." };
  }

  if (context.packageManager !== "uv" && context.packageManager !== "pip") {
    return { supported: false, reason: "This phase supports uv and pip only." };
  }

  return { supported: true };
}

export function supportsNodeOrPython(context: SupportContext): SupportResult {
  if (context.runtimeId !== "node" && context.runtimeId !== "python") {
    return { supported: false, reason: "This phase supports Node.js and Python." };
  }

  return { supported: true };
}
