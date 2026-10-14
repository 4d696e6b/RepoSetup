import type { Task, TaskDependency } from "./plan-schema.js";
import { compareTaskIds } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";

export function orderTaskGraph(
  tasks: readonly Task[],
  edges: readonly TaskDependency[],
): TaskParseResult<string[]> {
  const incoming = new Map(tasks.map((task) => [task.taskId, 0]));
  const consumers = new Map(tasks.map((task) => [task.taskId, [] as string[]]));
  const seen = new Set<string>();
  if (incoming.size !== tasks.length)
    return taskFailure("TASK_ID_DUPLICATE", "Task IDs must be unique.");
  for (const edge of edges) {
    if (!incoming.has(edge.predecessorTaskId) || !incoming.has(edge.consumerTaskId)) {
      return taskFailure("TASK_REFERENCE_INVALID", "Dependency refers to an absent task.");
    }
    if (edge.predecessorTaskId === edge.consumerTaskId) {
      return taskFailure("TASK_DEPENDENCY_CYCLE", "A task cannot depend on itself.");
    }
    const key = `${edge.predecessorTaskId}/${edge.consumerTaskId}`;
    if (seen.has(key))
      return taskFailure("TASK_ARTIFACT_INVALID", "Dependency edges must be unique.");
    seen.add(key);
    consumers.get(edge.predecessorTaskId)!.push(edge.consumerTaskId);
    incoming.set(edge.consumerTaskId, incoming.get(edge.consumerTaskId)! + 1);
  }
  const ready = [...incoming.keys()].filter((id) => incoming.get(id) === 0).sort(compareTaskIds);
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(id);
    for (const consumer of consumers.get(id)!) {
      const remaining = incoming.get(consumer)! - 1;
      incoming.set(consumer, remaining);
      if (remaining === 0) {
        ready.push(consumer);
        ready.sort(compareTaskIds);
      }
    }
  }
  return order.length === tasks.length
    ? { success: true, data: order }
    : taskFailure("TASK_DEPENDENCY_CYCLE", "Task dependencies contain a cycle.");
}
