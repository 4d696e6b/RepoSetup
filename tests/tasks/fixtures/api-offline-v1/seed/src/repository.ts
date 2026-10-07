export type Repository = {
  list(query: { readonly limit: number; readonly cursor: string | null }): Promise<
    | {
        readonly ok: true;
        readonly items: readonly { readonly id: string }[];
        readonly nextCursor: string | null;
      }
    | { readonly ok: false; readonly error: "invalid_cursor" | "unavailable" }
  >;
};
