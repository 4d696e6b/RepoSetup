# list-view-state

ui-1: `buildListView(input)` accepts `{ items, search, filter: "all" | "open" | "done", selectedId: string | null, loading: boolean }` with readonly items `{ id, label, status: "open" | "done" }`. Return matching `rows` preserving those fields plus the totals/selection/state below. Search trims whitespace and compares labels using `toLowerCase()`; an empty search matches every item.

ui-2: sort matching rows by normalized label, then ID; compute `total`, `openCount` and `doneCount` from the full input rather than the filtered rows. Keep item IDs as row keys.

ui-3: return `loading`, `empty` or `ready` display state in that priority order. Loading remains loading even with zero rows. An absent or filtered-out selection yields `selectedId: null`; a matching selection remains selected.

ui-4: preserve all inputs and baseline behavior, make repeated calls identical and handle labels containing markup-like text as plain strings. Public tests cover filtering, one selection and loading.
