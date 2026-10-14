import * as z from "zod";
import {
  taskPlanDraftSchema,
  taskProviderReplySchema,
  taskContentHash,
  decodeTaskJson,
  parseTaskDocument,
  taskContainsPrivateMaterial,
  taskFailure,
  type TaskParseResult,
  type TaskDocument,
} from "@reposetup/core";

// A model proposes text, not SHA-256 computations. The adapter derives only the
// ChangeSet digest; identities and all other values remain subject to core checks.
const reply = taskProviderReplySchema.shape.reply;
const codingWire = taskProviderReplySchema.extend({
  reply: z.discriminatedUnion("type", [
    reply.options[0].extend({
      changeSet: reply.options[0].shape.changeSet.omit({ changeSetId: true }),
    }),
    reply.options[1],
    reply.options[2],
  ]),
});
export function providerWireSchema(purpose: "coding" | "decomposition") {
  const json = z.toJSONSchema(purpose === "coding" ? codingWire : taskPlanDraftSchema, {
    target: "draft-7",
    reused: "inline",
    io: "input",
  });
  // The only optional domain field in these schemas is source.lineRange. The
  // Responses subset requires it as nullable. No unknown keys are discarded.
  const visit = (node: Record<string, unknown>): void => {
    if (node.oneOf) {
      const branches = node.oneOf as Record<string, unknown>[];
      // Zod emits oneOf for tagged unions. The provider documents anyOf;
      // equivalence requires a common required tag with distinct literal values.
      const properties = branches.map(
        (branch) => branch.properties as Record<string, Record<string, unknown>> | undefined,
      );
      const disjoint = Object.keys(properties[0] ?? {}).some((key) => {
        const tags = properties.map((fields) => fields?.[key]?.const);
        return (
          tags.every((tag) => typeof tag === "string") &&
          new Set(tags).size === branches.length &&
          branches.every((branch) => (branch.required as string[] | undefined)?.includes(key))
        );
      });
      if (!disjoint || node.anyOf) throw new Error("unsupported overlapping wire union");
      node.anyOf = branches;
      delete node.oneOf;
    }
    if (node.type === "object") {
      const properties = node.properties as Record<string, Record<string, unknown>>;
      const required = node.required as string[];
      for (const [key, child] of Object.entries(properties)) {
        visit(child);
        if (!required.includes(key)) {
          if (key !== "lineRange") throw new Error("unsupported optional wire field");
          properties[key] = { anyOf: [child, { type: "null" }] };
        }
      }
      node.required = Object.keys(properties);
      node.additionalProperties = false;
    } else {
      if (node.items) visit(node.items as Record<string, unknown>);
      for (const child of (node.anyOf ?? node.oneOf ?? []) as Record<string, unknown>[])
        visit(child);
    }
  };
  visit(json as Record<string, unknown>);
  delete json.$schema;
  return json;
}
export function parseProviderWire(
  text: string,
  purpose: "coding" | "decomposition",
): TaskParseResult<TaskDocument> {
  const decoded = decodeTaskJson(text);
  if (!decoded.success)
    return taskFailure("TASK_PROVIDER_OUTPUT_INVALID", "Provider JSON is invalid.");
  const value = decoded.data;
  // Normalize only an explicit nullable lineRange on a source reference. Leave
  // every extra field intact for strict domain validation to reject.
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const record = node as Record<string, unknown>;
    if (
      typeof record.path === "string" &&
      typeof record.fileHash === "string" &&
      record.lineRange === null
    )
      delete record.lineRange;
    Object.values(record).forEach(visit);
  };
  visit(value);
  if (purpose === "coding") {
    const wire = codingWire.safeParse(value);
    if (!wire.success)
      return taskFailure(
        "TASK_PROVIDER_OUTPUT_INVALID",
        "Provider reply violates the proposal contract.",
      );
    if (wire.data.reply.type === "change_set") {
      const cs = wire.data.reply.changeSet;
      wire.data.reply.changeSet = { ...cs, changeSetId: taskContentHash(cs) } as typeof cs;
    }
    const parsed = parseTaskDocument(wire.data);
    return parsed.success && !taskContainsPrivateMaterial(parsed.data)
      ? parsed
      : taskFailure(
          "TASK_PROVIDER_OUTPUT_INVALID",
          "Provider proposal failed domain/privacy validation.",
        );
  }
  const parsed = parseTaskDocument(value);
  return parsed.success &&
    parsed.data.kind === "task_plan_draft" &&
    !taskContainsPrivateMaterial(parsed.data)
    ? parsed
    : taskFailure(
        "TASK_PROVIDER_OUTPUT_INVALID",
        "Provider draft failed domain/privacy validation.",
      );
}
