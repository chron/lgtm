import type { Discipline, IntentDefinition } from "../models";

interface ConversionRequirement {
  discipline: Discipline;
  target: number;
  verified: number;
  unverified: number;
}

interface ConversionTask {
  taskId: string;
  status: "open" | "ready" | "shipped";
  requirements: readonly ConversionRequirement[];
}

interface TobyConversionTarget {
  taskId: string;
  requirementIndex: number;
  amount: number;
}

export function tobyConversionRequirementIndex(
  requirements: readonly ConversionRequirement[],
): number | undefined {
  return requirements
    .map((requirement, index) => ({
      index,
      discipline: requirement.discipline,
      remaining: requirement.target - requirement.verified - requirement.unverified,
    }))
    .filter((requirement) => requirement.remaining > 0)
    .sort(
      (left, right) =>
        Number(right.discipline === "infra") - Number(left.discipline === "infra") ||
        left.remaining - right.remaining ||
        left.index - right.index,
    )[0]?.index;
}

export function tobyCrunchConversions(
  tasks: readonly ConversionTask[],
  sourceTaskId: string,
  preventedDamage: number,
  mode: "source-task" | "all-open-tasks" = "source-task",
): readonly TobyConversionTarget[] {
  if (preventedDamage <= 0) return [];

  const candidateTasks = tasks.filter(
    (task) =>
      task.status !== "shipped" && (mode === "all-open-tasks" || task.taskId === sourceTaskId),
  );

  return candidateTasks.flatMap((task) => {
    const requirementIndex = tobyConversionRequirementIndex(task.requirements);
    return requirementIndex === undefined
      ? []
      : [{ taskId: task.taskId, requirementIndex, amount: preventedDamage }];
  });
}

export function canTobyTriage(intent: IntentDefinition | undefined): boolean {
  return Boolean(intent && intent.kind !== "crunch");
}
