import { decodeQuery, type Query } from "./query.js";
import type { Repository } from "./repository.js";
export async function handleRequest(
  request: { method: string; path: string; query: Query },
  repository: Repository,
) {
  if (request.path !== "/items") return { status: 404, body: { error: "not_found" } };
  if (request.method !== "GET") return { status: 405, body: { error: "method_not_allowed" } };
  const query = decodeQuery(request.query);
  if (!query) return { status: 400, body: { error: "invalid_query" } };
  try {
    const result = await repository.list(query);
    return result.ok
      ? { status: 200, body: { items: result.items, nextCursor: result.nextCursor } }
      : {
          status: result.error === "invalid_cursor" ? 400 : 500,
          body: { error: result.error === "invalid_cursor" ? "invalid_cursor" : "internal_error" },
        };
  } catch {
    return { status: 500, body: { error: "internal_error" } };
  }
}
