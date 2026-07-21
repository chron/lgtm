import type { Discipline, IntentDefinition } from "../models";

export interface TobyConversionRequirement {
  discipline: Discipline;
  target: number;
  verified: number;
  unverified: number;
}

export interface TobyConversionTask {
  taskId: string;
  status: "open" | "ready" | "shipped";
  requirements: readonly TobyConversionRequirement[];
}

export interface TobyConversionTarget {
  taskId: string;
  requirementIndex: number;
  amount: number;
}

export interface TobyIntentSnapshot {
  taskId: string;
  status: "open" | "ready" | "shipped";
  stunned: boolean;
  intent?: IntentDefinition | null;
}

export interface TobyCrunchEvent {
  taskId: string;
  moraleLoss: number;
}

export interface TobyCrunchResolution extends TobyCrunchEvent {
  blockBefore: number;
  blocked: number;
  blockAfter: number;
  moraleLost: number;
  conversions: readonly TobyConversionTarget[];
}

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function remainingWork(requirement: TobyConversionRequirement): number {
  return Math.max(
    0,
    nonNegative(requirement.target) -
      nonNegative(requirement.verified) -
      nonNegative(requirement.unverified),
  );
}

/**
 * Select Quietly On It's destination: Infra first, then least remaining Work,
 * then requirement board order. Complete requirements never participate.
 */
export function tobyConversionRequirementIndex(
  requirements: readonly TobyConversionRequirement[],
): number | undefined {
  return requirements
    .map((requirement, index) => ({
      index,
      discipline: requirement.discipline,
      remaining: remainingWork(requirement),
    }))
    .filter((requirement) => requirement.remaining > 0)
    .sort(
      (left, right) =>
        Number(right.discipline === "infra") - Number(left.discipline === "infra") ||
        left.remaining - right.remaining ||
        left.index - right.index,
    )[0]?.index;
}

/** Produce Work packets without mutating the board; the normal Work pipeline applies them. */
export function tobyCrunchConversions(
  tasks: readonly TobyConversionTask[],
  sourceTaskId: string,
  preventedDamage: number,
  mode: "source-task" | "all-open-tasks" = "source-task",
): readonly TobyConversionTarget[] {
  const amount = nonNegative(preventedDamage);
  if (amount === 0) return [];

  const candidateTasks = tasks.filter(
    (task) =>
      task.status !== "shipped" && (mode === "all-open-tasks" || task.taskId === sourceTaskId),
  );

  return candidateTasks.flatMap((task) => {
    const requirementIndex = tobyConversionRequirementIndex(task.requirements);
    return requirementIndex === undefined
      ? []
      : [{ taskId: task.taskId, requirementIndex, amount }];
  });
}

/** Current displayed Crunch total, excluding shipped and Stunned Tasks. */
export function tobyIncomingMorale(intents: readonly TobyIntentSnapshot[]): number {
  return intents.reduce((total, snapshot) => {
    if (snapshot.status === "shipped" || snapshot.stunned || snapshot.intent?.kind !== "crunch") {
      return total;
    }
    return total + nonNegative(snapshot.intent.moraleLoss);
  }, 0);
}

/** Above and Beyond gains its flat two Block before doubling the whole pool. */
export function aboveAndBeyondBlock(currentBlock: number): number {
  return (nonNegative(currentBlock) + 2) * 2;
}

/**
 * Resolve multiple Crunch Intents against the shared Block pool in board order.
 * Each event emits only the amount actually prevented, so the passive cannot
 * duplicate damage or preserve Block accidentally.
 */
export function resolveTobyCrunchSequence(
  tasks: readonly TobyConversionTask[],
  startingBlock: number,
  events: readonly TobyCrunchEvent[],
  mode: "source-task" | "all-open-tasks" = "source-task",
): {
  block: number;
  moraleLost: number;
  events: readonly TobyCrunchResolution[];
} {
  let block = nonNegative(startingBlock);
  let moraleLost = 0;
  const resolutions: TobyCrunchResolution[] = [];

  for (const event of events) {
    const incoming = nonNegative(event.moraleLoss);
    const blockBefore = block;
    const blocked = Math.min(block, incoming);
    block -= blocked;
    const eventMoraleLost = incoming - blocked;
    moraleLost += eventMoraleLost;
    resolutions.push({
      ...event,
      moraleLoss: incoming,
      blockBefore,
      blocked,
      blockAfter: block,
      moraleLost: eventMoraleLost,
      conversions: tobyCrunchConversions(tasks, event.taskId, blocked, mode),
    });
  }

  return { block, moraleLost, events: resolutions };
}

export function canTobyTriage(intent: IntentDefinition | null | undefined): boolean {
  return Boolean(intent && intent.kind !== "crunch");
}
