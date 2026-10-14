import type { OrderLine } from "./domain.js";
import { calculateTotal } from "./totals.js";
export function presentOrder(lines: readonly OrderLine[], discountBasisPoints: number) {
  const result = calculateTotal(lines, discountBasisPoints);
  return result.ok
    ? {
        totalCents: result.value,
        formattedTotal:
          Math.floor(result.value / 100) + "." + String(result.value % 100).padStart(2, "0"),
      }
    : { error: result.error.code };
}
