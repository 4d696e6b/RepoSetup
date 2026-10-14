export type Item = {
  readonly id: string;
  readonly label: string;
  readonly status: "open" | "done";
};
export type ListInput = {
  readonly items: readonly Item[];
  readonly search: string;
  readonly filter: "all" | "open" | "done";
  readonly selectedId: string | null;
  readonly loading: boolean;
};
