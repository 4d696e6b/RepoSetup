import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { BEGINNER_CATALOG, createBuiltInRegistry } from "@reposetup/integrations";
import { createWebsiteCatalog } from "@reposetup/registry";

const catalog = createWebsiteCatalog(BEGINNER_CATALOG, createBuiltInRegistry());
const directory = fileURLToPath(new URL("../src/generated/", import.meta.url));
await mkdir(directory, { recursive: true });
await writeFile(
  `${directory}/catalog.json`,
  await format(JSON.stringify(catalog), {
    ...(await resolveConfig(`${directory}/catalog.json`)),
    parser: "json",
  }),
);
console.log(
  `Validated ${catalog.integrations.length} integrations and ${catalog.variants.length} finite variants.`,
);
