export type Query = Record<string, string | readonly string[] | undefined>;
export function decodeQuery(query: Query): { limit: number; cursor: string | null } | null {
  if (Object.keys(query).some((k) => k !== "limit" && k !== "cursor")) return null;
  const limit =
    query.limit === undefined
      ? 20
      : typeof query.limit === "string" && /^[0-9]+$/.test(query.limit)
        ? Number(query.limit)
        : NaN;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  const cursor = query.cursor === undefined ? null : query.cursor;
  if (cursor !== null && (typeof cursor !== "string" || !cursor.length)) return null;
  return { limit, cursor };
}
