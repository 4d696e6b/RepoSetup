import { categoryName, release } from "./release.js";

export interface RelationshipTarget {
  type: string;
  id?: string;
  category?: string;
}

export function relationshipTarget(target: RelationshipTarget) {
  if (target.type === "integration" && target.id !== undefined) {
    const integration = release.integrations.find((item) => item.id === target.id);
    return {
      label: `${integration?.name ?? target.id} (${target.id})`,
      href: `#/integrations/${target.id}`,
    };
  }
  if (target.type === "category" && target.category !== undefined) {
    return {
      label: `${categoryName(target.category)} category`,
      href: `#/integrations?category=${encodeURIComponent(target.category)}`,
    };
  }
  throw new Error("A released relationship must identify an integration or category.");
}
