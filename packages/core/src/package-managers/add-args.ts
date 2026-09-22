import type { AddPackagesRequest } from "./types.js";

export function npmAddArgs(request: AddPackagesRequest): string[] {
  const args = ["install"];
  if (request.dev === true) {
    args.push("--save-dev");
  }
  if (request.exact === true) {
    args.push("--save-exact");
  }
  args.push(...request.packages);
  return args;
}

export function pnpmAddArgs(request: AddPackagesRequest): string[] {
  const args = ["add"];
  if (request.dev === true) {
    args.push("--save-dev");
  }
  if (request.exact === true) {
    args.push("--save-exact");
  }
  for (const name of request.allowBuild ?? []) {
    args.push(`--allow-build=${name}`);
  }
  args.push(...request.packages);
  return args;
}
