import type { ListInput } from "./domain.js";
export function buildListView(input: ListInput) {
  const search = input.search.trim().toLowerCase();
  const rows = input.items
    .filter(
      (i) =>
        (input.filter === "all" || i.status === input.filter) &&
        i.label.toLowerCase().includes(search),
    )
    .slice()
    .sort((a, b) => {
      const x = a.label.toLowerCase(),
        y = b.label.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });
  return {
    rows,
    total: input.items.length,
    openCount: input.items.filter((i) => i.status === "open").length,
    doneCount: input.items.filter((i) => i.status === "done").length,
    selectedId: rows.some((i) => i.id === input.selectedId) ? input.selectedId : null,
    state: input.loading ? "loading" : rows.length ? "ready" : "empty",
  };
}
