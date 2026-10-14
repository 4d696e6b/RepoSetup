# typed-input-boundary

type-1: export a discriminated `Result<T, E>` with `ok: true, value: T` or `ok: false, error: E`; `mapResult` preserves the failure and maps only the success. Success/failure branches narrow without `any`.

type-2: `decodePage(value: unknown)` returns `Result<Page, readonly InputIssue[]>`; `Page` contains readonly items `{ id: string; label: string }` and `nextCursor: string | null`. Reject unknown object fields, missing keys, non-array items, empty IDs/labels, duplicate IDs and cursors other than null or nonempty strings.

type-3: report all invalid fields as stable `{ path: string; code: "type" | "missing" | "unknown" | "empty" | "duplicate" }` issues sorted by path, then code. Use `$` for the root and dot paths such as `items.0.id`; report a duplicate on the later item's ID. A wrong parent type reports one `type` issue without inventing child errors. Return errors rather than throwing for invalid data; preserve the input object and arrays.

type-4: preserve the existing exported names and the valid-input behavior exercised by baseline tests. Public examples cover one success, one invalid item and mapping a failure.
