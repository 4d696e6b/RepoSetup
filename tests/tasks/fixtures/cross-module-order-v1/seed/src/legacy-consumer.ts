import { calculateTotal } from "./totals.js";
export const legacyTotal = () => calculateTotal([{ sku: "old", quantity: 1, unitCents: 100 }], 0);
