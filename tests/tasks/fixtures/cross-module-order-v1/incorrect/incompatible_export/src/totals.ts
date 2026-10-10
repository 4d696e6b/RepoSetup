import { validateLine, type OrderLine, type OrderResult } from "./domain.js";
export function calculateOrderTotal(
  lines: readonly OrderLine[],
  discountBasisPoints: number,
): OrderResult {
  if (
    !Number.isInteger(discountBasisPoints) ||
    discountBasisPoints < 0 ||
    discountBasisPoints > 10000
  )
    return { ok: false, error: { code: "invalid_discount" } };
  let sum = 0;
  for (const line of lines) {
    if (!validateLine(line)) return { ok: false, error: { code: "invalid_line" } };
    const subtotal = line.quantity * line.unitCents;
    if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(sum + subtotal))
      return { ok: false, error: { code: "overflow" } };
    sum += subtotal;
  }
  // Integer arithmetic avoids an unsafe intermediate multiplication.
  const total = Number((BigInt(sum) * BigInt(10000 - discountBasisPoints)) / 10000n);
  return { ok: true, value: total };
}
