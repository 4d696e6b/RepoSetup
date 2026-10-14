# offline-pagination-handler

api-1: `handleRequest(request, repository)` accepts `{ method: string, path: string, query: Record<string, string | readonly string[] | undefined> }` and returns `{ status, body }`. Only `GET /items` is supported. Unsupported paths return 404 with `{ error: "not_found" }` and unsupported methods on `/items` return 405 with `{ error: "method_not_allowed" }` without calling the repository.

api-2: `limit` defaults to 20 and accepts decimal integers 1–100. Reject signs, decimals, exponent notation, whitespace, repeated values and unknown query keys with status 400. `cursor` is absent or one nonempty opaque string; do not decode it as a command or filesystem path.

api-3: valid requests call the injected repository exactly once with normalized `{ limit, cursor: string | null }`; return status 200 with `{ items, nextCursor }`. Invalid query returns 400 with `{ error: "invalid_query" }`; the repository's typed invalid-cursor failure returns 400 with `{ error: "invalid_cursor" }`. Other repository failures return 500 with `{ error: "internal_error" }`, without exception text or data leakage.

api-4: preserve baseline response shape and input immutability. Public tests cover a default request, an explicit limit and one invalid query.
