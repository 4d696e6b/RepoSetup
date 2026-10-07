import { normalizePath, checkPath, type PathFacts } from "./path-policy.js";
export type Policy = {
  readonly read: readonly string[];
  readonly write: readonly string[];
  readonly deny: readonly string[];
};
export function selectContext(
  requested: readonly string[],
  facts: Readonly<Record<string, PathFacts>>,
  policy: Policy,
  mode: "read" | "write" = "read",
) {
  const selected: { path: string; hash: string }[] = [];
  const excluded: { path: string; reason: string }[] = [];
  for (const raw of requested) {
    const p = normalizePath(raw);
    const reason = checkPath(raw, p ? facts[p] : undefined);
    if (reason) {
      excluded.push({ path: raw, reason });
      continue;
    }
    if (!policy[mode].includes(p!)) {
      excluded.push({ path: p!, reason: "unresolved" });
      continue;
    }
    selected.push({ path: p!, hash: facts[p!]!.hash });
  }
  return { selected, excluded };
}
