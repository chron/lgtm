import type { IntentDefinition } from "../models";

export interface ElspethIntentSnapshot {
  status: "open" | "ready" | "shipped";
  stunned: boolean;
  intent?: IntentDefinition | null;
}

export interface HealthyPaceResolution {
  legal: boolean;
  focusAfterCost: number;
  blockGained: number;
  blockAfterPassive: number;
}

export type HealthyGuardrailsStep =
  | { kind: "pay-focus"; amount: number }
  | { kind: "gain-block"; amount: number; source: "healthy-pace" }
  | { kind: "work"; amount: 1; workKind: "verified" }
  | { kind: "install-guard"; amount: 2 }
  | { kind: "trigger-guard"; amount: 2 };

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function healthyPaceBlock(tags: readonly string[], psychologicalSafetyStacks = 0): number {
  if (!tags.includes("flexible")) return 0;
  return 2 + Math.floor(nonNegative(psychologicalSafetyStacks)) * 2;
}

export function airCoverBlock(openTaskCount: number): number {
  return Math.floor(nonNegative(openTaskCount)) * 3;
}

export function countElspethOpenTasks(
  tasks: readonly { status: "open" | "ready" | "shipped" }[],
): number {
  return tasks.filter((task) => task.status !== "shipped").length;
}

export function elspethIncomingMorale(intents: readonly ElspethIntentSnapshot[]): number {
  return intents.reduce((total, snapshot) => {
    if (snapshot.status === "shipped" || snapshot.stunned || snapshot.intent?.kind !== "crunch") {
      return total;
    }
    return total + nonNegative(snapshot.intent.moraleLoss);
  }, 0);
}

export function roomToBreatheDraw(block: number, incomingMorale: number): number {
  return nonNegative(block) >= nonNegative(incomingMorale) ? 1 : 0;
}

export function blockAfterHealthyPace(
  currentBlock: number,
  tags: readonly string[],
  psychologicalSafetyStacks = 0,
): number {
  return nonNegative(currentBlock) + healthyPaceBlock(tags, psychologicalSafetyStacks);
}

/** Pay Focus first, then resolve Healthy Pace before the card's own effects. */
export function resolveHealthyPacePlay(input: {
  currentFocus: number;
  cardCost: number;
  currentBlock: number;
  tags: readonly string[];
  psychologicalSafetyStacks?: number;
}): HealthyPaceResolution {
  const focus = nonNegative(input.currentFocus);
  const cost = nonNegative(input.cardCost);
  if (focus < cost) {
    return {
      legal: false,
      focusAfterCost: focus,
      blockGained: 0,
      blockAfterPassive: nonNegative(input.currentBlock),
    };
  }
  const blockGained = healthyPaceBlock(input.tags, input.psychologicalSafetyStacks);
  return {
    legal: true,
    focusAfterCost: focus - cost,
    blockGained,
    blockAfterPassive: nonNegative(input.currentBlock) + blockGained,
  };
}

/** Healthy Guardrails' exact effect sequence after legality/target checks. */
export function healthyGuardrailsSteps(
  psychologicalSafetyStacks = 0,
): readonly HealthyGuardrailsStep[] {
  return [
    { kind: "pay-focus", amount: 1 },
    {
      kind: "gain-block",
      amount: healthyPaceBlock(["flexible"], psychologicalSafetyStacks),
      source: "healthy-pace",
    },
    { kind: "work", amount: 1, workKind: "verified" },
    { kind: "install-guard", amount: 2 },
    { kind: "trigger-guard", amount: 2 },
  ];
}

export function sustainablePaceResolution(input: { currentBlock: number; currentFocus: number }): {
  block: number;
  focus: number;
  cardsDrawn: 3;
} {
  return {
    block: nonNegative(input.currentBlock) + 10,
    focus: nonNegative(input.currentFocus) + 3,
    cardsDrawn: 3,
  };
}
