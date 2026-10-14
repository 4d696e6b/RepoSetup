export type OrderLine = {
  readonly sku: string;
  readonly quantity: number;
  readonly unitCents: number;
};
export type Issue = { readonly code: "invalid_line" | "invalid_discount" | "overflow" };
export type OrderResult =
  { readonly ok: true; readonly value: number } | { readonly ok: false; readonly error: Issue };
export function validateLine(line: OrderLine): boolean {
  return (
    typeof line.sku === "string" &&
    line.sku.length > 0 &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1 &&
    line.quantity <= 999 &&
    Number.isSafeInteger(line.unitCents) &&
    line.unitCents >= 0
  );
}
