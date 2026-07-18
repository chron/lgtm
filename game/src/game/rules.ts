import { disciplineLabel, getCard, getCycle } from "../domain/content";
import type {
  CardDefinition,
  CardInstance,
  CycleReport,
  CycleState,
  DeveloperId,
  Discipline,
  RequirementState,
  RunState,
  TaskState,
  WorkKind,
} from "../domain/models";

export interface CardTarget {
  taskId: string;
  discipline?: Discipline;
}

export type CardResolution =
  | {
      kind: "work";
      legal: true;
      cost: number;
      taskId: string;
      discipline: Discipline;
      amount: number;
      workKind: WorkKind;
      pitchedIn: boolean;
      triggeredPassiveIds: DeveloperId[];
      label: string;
    }
  | {
      kind: "review";
      legal: true;
      cost: number;
      taskId: string;
      amount: number;
      triggeredPassiveIds: DeveloperId[];
      label: string;
    }
  | { legal: false; reason: string };

const disciplineOrder: readonly Discipline[] = ["frontend", "backend", "infra"];

export function requirementProgress(requirement: RequirementState): number {
  return requirement.verified + requirement.unverified;
}

export function remainingWork(requirement: RequirementState): number {
  return Math.max(0, requirement.target - requirementProgress(requirement));
}

export function isTaskReady(task: TaskState): boolean {
  return task.requirements.every((requirement) => remainingWork(requirement) === 0);
}

export function isCycleReady(cycle: CycleState): boolean {
  return cycle.tasks.every(isTaskReady);
}

export function taskUnverifiedWork(task: TaskState): number {
  return task.requirements.reduce((total, requirement) => total + requirement.unverified, 0);
}

function totalUnverifiedWork(cycle: CycleState): number {
  return cycle.tasks.reduce((total, task) => total + taskUnverifiedWork(task), 0);
}

function totalWork(cycle: CycleState): number {
  return cycle.tasks.reduce(
    (taskTotal, task) =>
      taskTotal +
      task.requirements.reduce(
        (requirementTotal, requirement) => requirementTotal + requirementProgress(requirement),
        0,
      ),
    0,
  );
}

export function getCurrentIntent(cycle: CycleState, task: TaskState) {
  if (isTaskReady(task)) return undefined;
  const definition = getCycle(cycle.cycleId).tasks.find(
    (candidate) => candidate.id === task.taskId,
  );
  return definition?.intents[cycle.day - 1];
}

export function incomingMorale(cycle: CycleState): number {
  return cycle.tasks.reduce((total, task) => {
    const intent = getCurrentIntent(cycle, task);
    return total + (intent?.kind === "crunch" ? intent.moraleLoss : 0);
  }, 0);
}

export function shippingPreview(cycle: CycleState): {
  unverified: number;
  defects: number;
  moraleLoss: number;
  techDebt: boolean;
} {
  const unverified = totalUnverifiedWork(cycle);
  const defects = Math.ceil(unverified / 3);
  return {
    unverified,
    defects,
    moraleLoss: defects,
    techDebt: defects >= 2,
  };
}

export function effectiveCardCost(
  card: CardDefinition,
  cycle: CycleState,
  squad: readonly DeveloperId[],
): number {
  const paulDiscount =
    squad.includes("paul") && !cycle.triggeredPassiveIds.includes("paul") ? 1 : 0;
  const blockedCost =
    card.discipline &&
    card.discipline !== "flexible" &&
    cycle.blockedDisciplines.includes(card.discipline)
      ? 1
      : 0;

  return Math.max(0, card.cost - paulDiscount) + blockedCost;
}

function addTriggeredPassive(passiveIds: DeveloperId[], id: DeveloperId): DeveloperId[] {
  return passiveIds.includes(id) ? passiveIds : [...passiveIds, id];
}

export function resolveCardTarget(
  run: RunState,
  instance: CardInstance,
  target: CardTarget,
): CardResolution {
  const cycle = run.cycle;
  if (!cycle) return { legal: false, reason: "No active Cycle." };

  const card = getCard(instance.cardId);
  if (card.kind === "status") {
    return { legal: false, reason: `${card.name} is unplayable.` };
  }

  const task = cycle.tasks.find((candidate) => candidate.taskId === target.taskId);
  if (!task) return { legal: false, reason: "Choose a Task." };

  const cost = effectiveCardCost(card, cycle, run.squad);
  if (cost > cycle.focus) return { legal: false, reason: "Not enough Focus." };

  let triggeredPassiveIds: DeveloperId[] = [];
  if (run.squad.includes("paul") && !cycle.triggeredPassiveIds.includes("paul")) {
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "paul");
  }

  if (card.kind === "review") {
    const available = taskUnverifiedWork(task);
    if (available === 0) {
      return { legal: false, reason: "This Task has no Unverified Work." };
    }

    const odinBonus =
      run.squad.includes("odin") && !cycle.triggeredPassiveIds.includes("odin") ? 1 : 0;
    if (odinBonus) {
      triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "odin");
    }
    const amount = Math.min(available, card.amount + odinBonus);
    return {
      kind: "review",
      legal: true,
      cost,
      taskId: task.taskId,
      amount,
      triggeredPassiveIds,
      label: `Verify ${amount}`,
    };
  }

  if (!target.discipline) {
    return { legal: false, reason: "Choose a requirement." };
  }

  const requirement = task.requirements.find(
    (candidate) => candidate.discipline === target.discipline,
  );
  if (!requirement || remainingWork(requirement) === 0) {
    return { legal: false, reason: "That requirement is complete." };
  }

  const pitchedIn = card.discipline !== "flexible" && card.discipline !== target.discipline;
  const workKind: WorkKind = pitchedIn ? "unverified" : (card.workKind ?? "verified");
  let amount = pitchedIn ? 1 : card.amount;

  if (
    workKind === "verified" &&
    run.squad.includes("irene") &&
    !cycle.triggeredPassiveIds.includes("irene")
  ) {
    amount += 1;
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "irene");
  }

  if (
    !pitchedIn &&
    card.tags.includes("ai-assisted") &&
    run.squad.includes("madi") &&
    !cycle.triggeredPassiveIds.includes("madi")
  ) {
    amount += 1;
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "madi");
  }

  amount = Math.min(amount, remainingWork(requirement));
  const label = pitchedIn
    ? `Pitch In · ${amount} Unverified`
    : `${disciplineLabel(target.discipline)} +${amount} ${workKind}`;

  return {
    kind: "work",
    legal: true,
    cost,
    taskId: task.taskId,
    discipline: target.discipline,
    amount,
    workKind,
    pitchedIn,
    triggeredPassiveIds,
    label,
  };
}

export function verifyTask(task: TaskState, amount: number): TaskState {
  let remaining = amount;
  const requirements = disciplineOrder
    .map((discipline) => task.requirements.find((item) => item.discipline === discipline))
    .filter((requirement): requirement is RequirementState => Boolean(requirement))
    .map((requirement) => {
      const verified = Math.min(requirement.unverified, remaining);
      remaining -= verified;
      return {
        ...requirement,
        verified: requirement.verified + verified,
        unverified: requirement.unverified - verified,
      };
    });

  return { ...task, requirements };
}

export function createCycleReport(
  cycle: CycleState,
  outcome: CycleReport["outcome"],
  moraleDelta: number,
  creditsGained: number,
  techDebtAdded: boolean,
): CycleReport {
  const definition = getCycle(cycle.cycleId);
  const preview = shippingPreview(cycle);
  return {
    nodeId: cycle.nodeId,
    cycleName: definition.name,
    outcome,
    day: cycle.day,
    tasks: cycle.tasks.map((task) => {
      const taskDefinition = definition.tasks.find((candidate) => candidate.id === task.taskId);
      return {
        taskId: task.taskId,
        name: taskDefinition?.name ?? task.taskId,
        completed: isTaskReady(task),
        verifiedWork: task.requirements.reduce((sum, requirement) => sum + requirement.verified, 0),
        unverifiedWork: taskUnverifiedWork(task),
      };
    }),
    shippedProgress: totalWork(cycle),
    unverifiedProgress: preview.unverified,
    defects: outcome === "shipped" ? preview.defects : 0,
    moraleDelta,
    creditsGained,
    techDebtAdded,
    resolvedIntents: cycle.resolvedIntents,
  };
}
