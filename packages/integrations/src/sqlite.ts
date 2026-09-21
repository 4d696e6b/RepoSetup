import { defineIntegration, VERIFIED_AT } from "./define.js";

export const sqliteIntegration = defineIntegration({
  id: "sqlite",
  name: "SQLite",
  category: "database",
  description:
    "Selects SQLite as a file-based database. RepoSetup does not install a database server.",
  status: "experimental",
  documentationUrl: "https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/sqlite",
  keywords: ["database", "file", "libsql"],
  verification: { verifiedAt: VERIFIED_AT },
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase supports SQLite with Node.js only." };
    }

    return { supported: true };
  },
  plan() {
    return [
      {
        type: "show_message",
        message:
          "SQLite is file-based. RepoSetup will not install a database server. Prisma uses DATABASE_URL=file:./dev.db.",
        description: "Explain that SQLite needs no system package",
      },
    ];
  },
});
