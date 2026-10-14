# dependency-output-contract

cross-1: add readonly order lines `{ sku, quantity, unitCents }` and validate nonempty SKU, integer quantity 1–999 and nonnegative safe-integer unit price. Invalid input returns a typed issue; no floating-point currency calculation.

cross-2: `calculateTotal(lines, discountBasisPoints)` accepts an integer discount 0–10000, validates multiplication/aggregation for safe-integer overflow, then applies the discount once to the aggregate with rounding down in cents. Empty lines total zero.

cross-3: `presentOrder` consumes the calculation result and returns either an error view or `{ totalCents, formattedTotal }`, formatting cents with exactly two decimal digits without locale-dependent output.

cross-4: preserve legacy exported APIs/caller compilation. Public acceptance traces domain → total → presentation. The compiled plan must declare predecessor output artifacts for dependent tasks; execute and accept predecessors before consumers.
