import { it } from "vitest";
import { cases as compatibility } from "./compat.mjs";
import { cases as publicAcceptance } from "./acceptance.mjs";
for (const check of [...compatibility, ...publicAcceptance]) it(check.id, check.run);
