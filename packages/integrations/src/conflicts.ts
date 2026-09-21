import type { IntegrationConflict } from "@reposetup/core";

export const APP_FRAMEWORK_CONFLICTS: IntegrationConflict[] = [
  {
    kind: "conflicts",
    target: { type: "category", category: "framework" },
    reason: "Choose a single application framework.",
  },
  {
    kind: "conflicts",
    target: { type: "category", category: "backend-framework" },
    reason: "Choose a single application framework.",
  },
];

export const DATABASE_CONFLICTS: IntegrationConflict[] = [
  {
    kind: "conflicts",
    target: { type: "category", category: "database" },
    reason: "Choose a single database.",
  },
];

export const ORM_CONFLICTS: IntegrationConflict[] = [
  {
    kind: "conflicts",
    target: { type: "category", category: "orm" },
    reason: "Choose a single data layer.",
  },
];
