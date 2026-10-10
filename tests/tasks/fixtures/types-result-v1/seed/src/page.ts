import type { Result } from "./result.js";
export type InputIssue = {
  readonly path: string;
  readonly code: "type" | "missing" | "unknown" | "empty" | "duplicate";
};
export type Page = {
  readonly items: readonly { readonly id: string; readonly label: string }[];
  readonly nextCursor: string | null;
};
export function decodePage(value: unknown): Result<Page, readonly InputIssue[]> {
  const issues: InputIssue[] = [];
  const object = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const issue = (path: string, code: InputIssue["code"]) => issues.push({ path, code });
  if (!object(value)) return { ok: false, error: [{ path: "$", code: "type" }] };
  const keys = (v: Record<string, unknown>, allowed: string[], prefix: string) => {
    for (const key of Object.keys(v)) if (!allowed.includes(key)) issue(prefix + key, "unknown");
    for (const key of allowed) if (!Object.hasOwn(v, key)) issue(prefix + key, "missing");
  };
  keys(value, ["items", "nextCursor"], "");
  const items: { id: string; label: string }[] = [];
  const ids = new Set<string>();
  if (Object.hasOwn(value, "items")) {
    if (!Array.isArray(value.items)) issue("items", "type");
    else
      value.items.forEach((item: unknown, i: number) => {
        const path = "items." + i;
        if (!object(item)) {
          issue(path, "type");
          return;
        }
        keys(item, ["id", "label"], path + ".");
        for (const key of ["id", "label"])
          if (Object.hasOwn(item, key)) {
            if (typeof item[key] !== "string") issue(path + "." + key, "type");
            else if (item[key].length === 0) issue(path + "." + key, "empty");
          }
        if (typeof item.id === "string" && item.id.length > 0) {
          ids.add(item.id);
        }
        if (typeof item.id === "string" && typeof item.label === "string")
          items.push({ id: item.id, label: item.label });
      });
  }
  const cursor = value.nextCursor;
  if (Object.hasOwn(value, "nextCursor") && cursor !== null) {
    if (typeof cursor !== "string") issue("nextCursor", "type");
    else if (!cursor.length) issue("nextCursor", "empty");
  }
  issues.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0,
  );
  return issues.length
    ? { ok: false, error: issues }
    : { ok: true, value: { items, nextCursor: cursor as string | null } };
}
