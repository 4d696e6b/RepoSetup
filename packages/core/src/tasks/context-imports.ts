import { posix } from "node:path";
import { isSafeTaskPath } from "./primitives.js";

/** Conservative lexical discovery only: no module/config loading, aliases or code evaluation. */
export function scanLocalTaskImports(text: string): { specifiers: string[]; computed: boolean } {
  const tokens =
    text.match(
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|[^\s]/g,
    ) ?? [];
  const clean = tokens.filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
  const specifiers = new Set<string>();
  let computed = false;
  const literal = (token: string | undefined) => token !== undefined && /^["']/.test(token);
  const add = (token: string) => {
    const specifier = token.slice(1, -1);
    if (!specifier.includes("\\") && specifier.startsWith(".")) specifiers.add(specifier);
    else if (
      specifier.startsWith("/") ||
      specifier.startsWith("@/") ||
      specifier.startsWith("~/") ||
      specifier.includes("\\")
    )
      computed = true;
  };
  for (let i = 0; i < clean.length; i++) {
    const token = clean[i];
    if (token !== "import" && token !== "export" && token !== "require") continue;
    if (clean[i + 1] === ".") continue;
    if (clean[i + 1] === "(") {
      if (literal(clean[i + 2]) && clean[i + 3] === ")") add(clean[i + 2]!);
      else computed = true;
    } else if (token === "import" && literal(clean[i + 1])) add(clean[i + 1]!);
    else {
      for (let j = i + 1; j < Math.min(clean.length, i + 128); j++) {
        if ([";", "import", "export"].includes(clean[j]!)) break;
        if (clean[j] === "from" && literal(clean[j + 1])) {
          add(clean[j + 1]!);
          break;
        }
      }
    }
  }
  return { specifiers: [...specifiers].sort(), computed };
}
export function resolveLocalTaskImport(
  source: string,
  specifier: string,
  files: Set<string>,
): string | null {
  const base = posix.normalize(posix.join(posix.dirname(source), specifier));
  if (!isSafeTaskPath(base)) return null;
  const stems = /\.[cm]?js$/.test(base) ? [base.replace(/\.[cm]?js$/, ".ts"), base] : [base];
  const candidates = stems.flatMap((stem) => [
    stem,
    `${stem}.ts`,
    `${stem}.mts`,
    `${stem}.cts`,
    `${stem}/index.ts`,
  ]);
  return candidates.find((candidate) => files.has(candidate)) ?? null;
}
