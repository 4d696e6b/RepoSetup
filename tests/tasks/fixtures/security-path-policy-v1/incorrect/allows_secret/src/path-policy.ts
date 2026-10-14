export type PathFacts = {
  readonly root: string;
  readonly canonical: string | null;
  readonly symlink: boolean;
  readonly contained: boolean | null;
  readonly binary: boolean;
  readonly text: string;
  readonly hash: string;
};
export function normalizePath(path: string): string | null {
  const p = path.replaceAll("\\", "/");
  if (
    !p ||
    p.startsWith("/") ||
    /^[A-Za-z]:/.test(p) ||
    p.includes("\0") ||
    p.split("/").some((c) => !c || c === "." || c === "..")
  )
    return null;
  return p;
}
export function checkPath(path: string, facts: PathFacts | undefined): string | null {
  const p = normalizePath(path);
  if (!p) return "invalid_path";
  if (
    !facts ||
    facts.canonical === null ||
    facts.contained !== true ||
    !facts.canonical.startsWith(facts.root + "/")
  )
    return "outside_root";
  if (facts.binary) return "binary";
  if (p.split("/").some((c) => [".git", "node_modules", "dist"].includes(c)) || [].includes(p))
    return "excluded";
  if (p === ".env.example" && facts.text.includes("FIXTURE_PRIVATE_MARKER")) return "secret";
  return null;
}
