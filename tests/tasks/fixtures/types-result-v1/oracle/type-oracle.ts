import { decodePage, type Page } from "../src/page.js";
import { mapResult, type Result } from "../src/result.js";
function narrow(r: Result<number, string>): number {
  if (r.ok) return r.value;
  return r.error.length;
}
const result = decodePage(null);
if (result.ok) {
  const page: Page = result.value;
  void page;
  // @ts-expect-error readonly items
  result.value.items.push({ id: "x", label: "X" });
  // @ts-expect-error readonly item fields
  result.value.items[0]!.id = "changed";
} else {
  const errors: readonly unknown[] = result.error;
  void errors;
}
const mapped: Result<string, string> = mapResult({ ok: true, value: 1 }, String);
void mapped;
void narrow;
