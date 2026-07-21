import {
  getEncounterCycleDefinition,
  getScheduledBossIntent,
  getScheduledBossMoraleLoss,
} from "../domain/bosses";
import { disciplineLabel, getCardForInstance } from "../domain/content";
import type {
  CardDefinition,
  CardInstance,
  CardTag,
  CycleReport,
  CycleState,
  DeveloperId,
  Discipline,
  IntentDefinition,
  RequirementState,
  RunState,
  TaskState,
  WorkKind,
} from "../domain/models";

interface TaskCardTarget {
  kind?: "task";
  taskId: string;
  discipline?: Discipline;
}

interface SquadCardTarget {
  kind: "squad";
}

interface DisciplineCardTarget {
  kind: "discipline";
  discipline: Discipline;
}

interface HandCardTarget {
  kind: "hand-card";
  instanceId: string;
}

interface ExhaustCardTarget {
  kind: "exhaust-card";
  instanceId: string;
}

export type CardTarget =
  | TaskCardTarget
  | SquadCardTarget
  | DisciplineCardTarget
  | HandCardTarget
  | ExhaustCardTarget;

interface ResolvedCardBase {
  legal: true;
  cost: number;
  blockGained: number;
  techDebtAdded: number;
  cardsDrawn: number;
  nextDayCardsDrawn: number;
  focusGained: number;
  generatedCards: readonly { cardId: string; dynamicDefinition?: CardDefinition }[];
  verifiedWorkHits: readonly {
    taskId: string;
    discipline: Discipline;
    amount: number;
  }[];
  discardedCardInstanceIds: string[];
  exhaustedCardInstanceIds: string[];
  retainedCard?: { instanceId: string; costReduction: number };
  retrievedExhaustCardInstanceId?: string;
  drawEntireDrawPile: boolean;
  returnDrawnToTop: number;
  queuedDistractions: number;
  cycleWorkBonus?: { tag: CardTag; amount: number };
  dayWorkBonus?: { amount: number; excludedTags: readonly CardTag[] };
  dayReviewStunFocusAdded: number;
  fullStackAdded: number;
  polishBudgetAdded: number;
  triggeredPassiveIds: DeveloperId[];
  chainAfterPlay: CycleState["chain"];
  label: string;
}

export type CardResolution =
  | (ResolvedCardBase & {
      kind: "work";
      taskId: string;
      discipline: Discipline;
      amount: number;
      workKind: WorkKind;
      scriptPowerAdded: number;
      guardPowerAdded: number;
      scriptInstallRunAmount: number;
      scriptTriggerRunAmount: number;
      scriptRunAmount: number;
      pitchedIn: boolean;
      countsAsWorkPlay: boolean;
      attemptedAmount: number;
      overflow: number;
      requirementCompleted: boolean;
    })
  | (ResolvedCardBase & {
      kind: "review";
      taskId?: string;
      amount: number;
      stun: boolean;
      reviews: readonly {
        taskId: string;
        amount: number;
        stun: boolean;
        scriptInstallations: readonly {
          discipline: Discipline;
          powerAdded: number;
          runAmount: number;
        }[];
      }[];
    })
  | (ResolvedCardBase & {
      kind: "tactic";
      taskId?: string;
      targetDiscipline?: Discipline;
      previewWorkAmount?: number;
      stun: boolean;
      sideQuestDiscipline?: Discipline;
    })
  | { legal: false; reason: string };

const disciplineOrder: readonly Discipline[] = ["frontend", "backend", "infra"];

export function requirementProgress(requirement: RequirementState): number {
  return requirement.verified + requirement.unverified;
}

export function isGeneratedCardInstance(instance: CardInstance): boolean {
  return instance.generated === true || Boolean(instance.generatedBy);
}

function advanceChain(cycle: CycleState, taskId: string | undefined): CycleState["chain"] {
  if (!taskId) return cycle.chain;
  if (cycle.chain.taskId === taskId) {
    return { ...cycle.chain, count: cycle.chain.count + 1 };
  }
  return {
    ...cycle.chain,
    taskId,
    count: cycle.chain.transfersBetweenTasks ? cycle.chain.count + 1 : 1,
  };
}

function remainingWork(requirement: RequirementState): number {
  return Math.max(0, requirement.target - requirementProgress(requirement));
}

export function requirementCompletedByVerifiedWork(
  requirement: RequirementState,
  verifiedAdded: number,
  unverifiedAdded = 0,
): boolean {
  const remaining = remainingWork(requirement);
  return remaining > 0 && verifiedAdded > 0 && verifiedAdded + unverifiedAdded >= remaining;
}

export function isTaskReady(task: TaskState): boolean {
  return task.status !== "open";
}

export function isCycleShipped(cycle: CycleState): boolean {
  const definition = getEncounterCycleDefinition(cycle);
  const primaryTaskId = definition.primaryTaskId;
  if (primaryTaskId) {
    const primaryShipped = cycle.tasks.some(
      (task) => task.taskId === primaryTaskId && task.status === "shipped",
    );
    const sideQuestsShipped = cycle.tasks
      .filter((task) => task.role === "side-quest")
      .every((task) => task.status === "shipped");
    const spawnedComplicationsShipped =
      definition.kind === "incident" ||
      cycle.tasks
        .filter((task) => task.role === "complication")
        .every((task) => task.status === "shipped");
    return primaryShipped && spawnedComplicationsShipped && sideQuestsShipped;
  }
  return cycle.tasks
    .filter((task) => task.role !== "bounty")
    .every((task) => task.status === "shipped");
}

export function refreshTaskStatus(task: TaskState): TaskState {
  if (task.status === "shipped") return task;
  const ready = task.requirements.every((requirement) => remainingWork(requirement) === 0);
  return { ...task, status: ready ? "ready" : "open" };
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

export function getScheduledIntent(cycle: CycleState, task: TaskState) {
  if (task.status === "shipped") return undefined;
  const definition = getEncounterCycleDefinition(cycle).tasks.find(
    (candidate) => candidate.id === task.taskId,
  );
  return definition?.intents[cycle.day - task.spawnedDay] ?? undefined;
}

export function getCurrentIntent(cycle: CycleState, task: TaskState) {
  return task.stunned ? undefined : getScheduledIntent(cycle, task);
}

function getTargetableIntent(
  run: RunState,
  cycle: CycleState,
  task: TaskState,
): Pick<IntentDefinition, "kind"> | undefined {
  const scheduled = getScheduledIntent(cycle, task);
  if (scheduled) return scheduled;
  const bossIntent = getScheduledBossIntent(run, cycle);
  return bossIntent?.sourceTaskId === task.taskId ? { kind: bossIntent.intentKind } : undefined;
}

export function absorbMoraleDamage(
  block: number,
  amount: number,
): { block: number; blocked: number; moraleLoss: number } {
  const blocked = Math.min(block, amount);
  return {
    block: block - blocked,
    blocked,
    moraleLoss: amount - blocked,
  };
}

export function incomingMorale(run: RunState, cycle: CycleState): number {
  const ordinaryMorale = cycle.tasks.reduce((total, task) => {
    const intent = getCurrentIntent(cycle, task);
    return total + (intent?.kind === "crunch" ? intent.moraleLoss : 0);
  }, 0);
  return ordinaryMorale + getScheduledBossMoraleLoss(run, cycle);
}

export function taskShippingPreview(task: TaskState): {
  unverified: number;
  defects: number;
  moraleLoss: number;
  techDebt: number;
} {
  const unverified = taskUnverifiedWork(task);
  const defects = Math.ceil(unverified / 3);
  const techDebt = Math.ceil(unverified / 2);
  return {
    unverified,
    defects,
    moraleLoss: 0,
    techDebt,
  };
}

export function taskShippingRewards(
  run: RunState,
  taskId: string,
): { cardsDrawn: number; focusGained: number; paulTriggers: boolean } {
  const cycle = run.cycle;
  if (!cycle) return { cardsDrawn: 0, focusGained: 0, paulTriggers: false };
  const cycleAfterShip: CycleState = {
    ...cycle,
    tasks: cycle.tasks.map((task) =>
      task.taskId === taskId ? { ...task, status: "shipped" } : task,
    ),
  };
  const paulTriggers = run.squad.includes("paul") && !isCycleShipped(cycleAfterShip);
  const nonFinalTask = !isCycleShipped(cycleAfterShip);
  const mergeQueue = run.tools.includes("merge-queue");
  return {
    cardsDrawn: (mergeQueue ? 2 : 0) + (nonFinalTask && run.tools.includes("reef-shark") ? 1 : 0),
    focusGained: (paulTriggers ? 1 : 0) + (mergeQueue ? 1 : 0),
    paulTriggers,
  };
}

function triggeredAutomationAmount(run: RunState, power: number): number {
  if (power <= 0) return 0;
  return (
    power * (run.tools.includes("cron-upgrade") ? 2 : 1) + (run.tools.includes("platypus") ? 1 : 0)
  );
}

function automationPacketLabel(source: "CI" | "Run", amount: number, run: RunState): string {
  const modifiers = [
    run.tools.includes("cron-upgrade") ? "Cron ×2" : undefined,
    run.tools.includes("platypus") ? "Platypus +1" : undefined,
  ].filter(Boolean);
  return `${source} +${amount}${modifiers.length > 0 ? ` (${modifiers.join(", ")})` : ""}`;
}

function cardBlockWithTools(run: RunState, block: number): number {
  return block > 0 && run.tools.includes("pangolin") ? block + 2 : block;
}

export function effectiveCardCost(
  card: CardDefinition,
  cycle: CycleState,
  _squad: readonly DeveloperId[],
  instance?: CardInstance,
): number {
  const blockedCost =
    card.discipline &&
    card.discipline !== "flexible" &&
    cycle.blockedDisciplines.includes(card.discipline)
      ? 1
      : 0;

  return Math.max(0, card.cost + blockedCost - (instance?.costReduction ?? 0));
}

function addTriggeredPassive(passiveIds: DeveloperId[], id: DeveloperId): DeveloperId[] {
  return passiveIds.includes(id) ? passiveIds : [...passiveIds, id];
}

function createStudiedWorkCard(
  lastWorkCard: NonNullable<CycleState["lastWorkCard"]>,
): CardDefinition {
  const workLabel =
    lastWorkCard.discipline === "flexible" ? "Any" : disciplineLabel(lastWorkCard.discipline);
  return {
    id: `studied-${lastWorkCard.discipline}-${lastWorkCard.amount}`,
    name: `Studied ${workLabel}`,
    cost: 0,
    kind: "work",
    discipline: lastWorkCard.discipline,
    amount: lastWorkCard.amount,
    workKind: "verified",
    exhaust: true,
    rules: `${workLabel} ${lastWorkCard.amount}. Verified. Exhaust.`,
    tags: [
      "exhaust",
      ...(lastWorkCard.discipline === "flexible" ? (["flexible"] as const) : []),
      "generated",
    ],
  };
}

function createLearnedCard(card: CardDefinition): CardDefinition {
  return {
    ...card,
    id: `learned-${card.id}`,
    name: `Learned ${card.name}`,
    cost: 0,
    exhaust: true,
    rules: `${card.rules} Costs 0. Generated. Exhaust.`,
    tags: [...new Set([...card.tags, "generated" as const, "exhaust" as const])],
  };
}

function resolveCardTargetOnce(
  run: RunState,
  instance: CardInstance,
  target: CardTarget,
): CardResolution {
  const cycle = run.cycle;
  if (!cycle) return { legal: false, reason: "No active Cycle." };

  const card = getCardForInstance(instance);
  if (card.kind === "status" && !card.cycleFlexibleBlockBonus) {
    return { legal: false, reason: `${card.name} is unplayable.` };
  }

  const cost = effectiveCardCost(card, cycle, run.squad, instance);
  if (cost > cycle.focus) return { legal: false, reason: "Not enough Focus." };

  const exhaustedCardInstanceIds = card.exhaustAllTechDebtCards
    ? [...cycle.hand, ...cycle.drawPile, ...cycle.discardPile]
        .filter(
          (candidate) =>
            candidate.instanceId !== instance.instanceId && candidate.cardId === "tech-debt",
        )
        .map((candidate) => candidate.instanceId)
    : card.exhaustHandTags
      ? cycle.hand
          .filter(
            (candidate) =>
              candidate.instanceId !== instance.instanceId &&
              card.exhaustHandTags?.some((tag) => getCardForInstance(candidate).tags.includes(tag)),
          )
          .map((candidate) => candidate.instanceId)
      : card.exhaustOtherHand
        ? cycle.hand
            .filter((candidate) => candidate.instanceId !== instance.instanceId)
            .map((candidate) => candidate.instanceId)
        : [];
  const generatedCardSpecs = card.generatedCards
    ? Array.isArray(card.generatedCards)
      ? card.generatedCards
      : [card.generatedCards]
    : [];
  const generatedCards: { cardId: string; dynamicDefinition?: CardDefinition }[] =
    generatedCardSpecs.flatMap((generated) =>
      Array.from({ length: generated.count }, () => ({ cardId: generated.cardId })),
    );
  if (card.generateLastWorkCopy && cycle.lastWorkCard) {
    const dynamicDefinition = createStudiedWorkCard(cycle.lastWorkCard);
    generatedCards.push({ cardId: dynamicDefinition.id, dynamicDefinition });
  }
  if (card.generateLastNonGeneratedCopy && cycle.lastNonGeneratedCard) {
    const dynamicDefinition = createLearnedCard(cycle.lastNonGeneratedCard.definition);
    generatedCards.push({ cardId: dynamicDefinition.id, dynamicDefinition });
  }
  if (card.generatedCardsPerChain) {
    const count = Math.floor(cycle.chain.count / card.generatedCardsPerChain.divisor);
    generatedCards.push(
      ...Array.from({ length: count }, () => ({
        cardId: card.generatedCardsPerChain!.cardId,
      })),
    );
  }
  if (card.generatedCardPerExhaustedHandCard) {
    generatedCards.push(
      ...exhaustedCardInstanceIds.map(() => ({
        cardId: card.generatedCardPerExhaustedHandCard!,
      })),
    );
  }
  if (generatedCards.length > 0 && run.tools.includes("boilerplate-generator")) {
    generatedCards.push({ cardId: "snippet" });
  }
  const generatedOutputBonus =
    run.squad.includes("kirsten") && isGeneratedCardInstance(instance) ? 1 : 0;
  const chainedTaskBeforePlay =
    "taskId" in target && target.taskId ? cycle.chain.taskId === target.taskId : false;
  const momentumBeforePlay =
    "taskId" in target &&
    target.taskId &&
    (cycle.chain.taskId === target.taskId || cycle.chain.transfersBetweenTasks)
      ? cycle.chain.count
      : 0;
  let chainAfterPlay =
    "taskId" in target && target.taskId ? advanceChain(cycle, target.taskId) : cycle.chain;
  if (card.additionalChain && chainAfterPlay.taskId) {
    chainAfterPlay = { ...chainAfterPlay, count: chainAfterPlay.count + card.additionalChain };
  }
  if (card.doubleChain && cycle.chain.count > 0) {
    chainAfterPlay = {
      ...cycle.chain,
      count: cycle.chain.count * 2,
      transfersBetweenTasks: card.transferChainThisDay || cycle.chain.transfersBetweenTasks,
    };
  }
  const chainMilestoneBaseline =
    cycle.chain.taskId && chainAfterPlay.taskId === cycle.chain.taskId
      ? cycle.chain.count
      : cycle.chain.transfersBetweenTasks
        ? cycle.chain.count
        : 0;
  const pomodoroDraws = run.tools.includes("pomodoro-timer")
    ? Math.max(0, Math.floor(chainAfterPlay.count / 3) - Math.floor(chainMilestoneBaseline / 3))
    : 0;
  const printedBlock =
    (card.block ?? 0) +
    ((card.block ?? 0) > 0 ? generatedOutputBonus : 0) +
    (card.blockPerCardPlayed ?? 0) * cycle.cardsPlayedThisDay +
    (card.blockPerExhaustedThisDay ?? 0) * cycle.cardsExhaustedThisDay +
    (card.blockPerChain ?? 0) * cycle.chain.count +
    (card.blockPerCompletedRequirement ?? 0) *
      cycle.tasks
        .filter((task) => task.status === "open")
        .flatMap((task) => task.requirements)
        .filter((requirement) => remainingWork(requirement) === 0).length;
  const flexiblePassiveBlock =
    run.squad.includes("elspeth") && card.tags.includes("flexible")
      ? 2 + (cycle.psychologicalSafetyStacks ?? 0) * 2
      : 0;
  const contextualBlock =
    (card.blockEqualIncomingMorale ? incomingMorale(run, cycle) : 0) +
    (card.blockPerOpenTask ?? 0) * cycle.tasks.filter((task) => task.status !== "shipped").length;
  const grantedBlock = cardBlockWithTools(
    run,
    printedBlock + contextualBlock + flexiblePassiveBlock,
  );
  const tacticBlock = card.doubleCurrentBlock ? cycle.block + grantedBlock * 2 : grantedBlock;
  const tacticBase: Omit<ResolvedCardBase, "label"> = {
    legal: true,
    cost,
    blockGained: tacticBlock,
    techDebtAdded: card.techDebtAdded ?? 0,
    cardsDrawn:
      (card.cardsDrawn ?? 0) +
      (card.cardsDrawnIfBlockCoversIncoming &&
      cycle.block + tacticBlock >= incomingMorale(run, cycle)
        ? card.cardsDrawnIfBlockCoversIncoming
        : 0) +
      (card.drawIfContinuesChain && chainedTaskBeforePlay ? card.drawIfContinuesChain : 0) +
      (card.exhaustHandTags ? exhaustedCardInstanceIds.length : 0) +
      pomodoroDraws,
    nextDayCardsDrawn: card.nextDayCardsDrawn ?? 0,
    focusGained:
      (card.focusGained ?? 0) +
      (card.exhaustAllTechDebtCards ? exhaustedCardInstanceIds.length : 0) +
      (card.focusPerGeneratedCardsPlayed
        ? Math.floor(cycle.generatedCardsPlayedThisDay / card.focusPerGeneratedCardsPlayed)
        : 0),
    generatedCards,
    verifiedWorkHits: [],
    discardedCardInstanceIds: card.discardedHandTags
      ? cycle.hand
          .filter(
            (candidate) =>
              candidate.instanceId !== instance.instanceId &&
              card.discardedHandTags?.some((tag) =>
                getCardForInstance(candidate).tags.includes(tag),
              ),
          )
          .map((candidate) => candidate.instanceId)
      : [],
    exhaustedCardInstanceIds,
    drawEntireDrawPile: card.drawEntireDrawPile ?? false,
    returnDrawnToTop: card.returnDrawnToTop ?? 0,
    queuedDistractions: card.queuedDistractions ?? 0,
    cycleWorkBonus: card.cycleWorkBonus,
    dayWorkBonus: card.dayWorkBonus
      ? { amount: card.dayWorkBonus.amount, excludedTags: card.dayWorkBonus.excludedTags ?? [] }
      : undefined,
    dayReviewStunFocusAdded: card.dayReviewStunFocusBonus ?? 0,
    fullStackAdded: card.fullStackAdded ?? 0,
    polishBudgetAdded: card.blockPerFinishingTouchesReview ?? 0,
    triggeredPassiveIds: [
      ...(generatedOutputBonus > 0 ? (["kirsten"] as const) : []),
      ...(flexiblePassiveBlock > 0 ? (["elspeth"] as const) : []),
    ],
    chainAfterPlay,
  };

  if (card.exhaustHandTarget || card.retainHandTarget) {
    if (target.kind !== "hand-card") {
      return { legal: false, reason: "Choose another card in hand." };
    }
    const handTarget = cycle.hand.find(
      (candidate) =>
        candidate.instanceId === target.instanceId && candidate.instanceId !== instance.instanceId,
    );
    if (!handTarget) return { legal: false, reason: "Choose another card in hand." };
    return {
      ...tacticBase,
      kind: "tactic",
      stun: false,
      exhaustedCardInstanceIds: card.exhaustHandTarget
        ? [...tacticBase.exhaustedCardInstanceIds, handTarget.instanceId]
        : tacticBase.exhaustedCardInstanceIds,
      retainedCard: card.retainHandTarget
        ? { instanceId: handTarget.instanceId, costReduction: card.targetCostReduction ?? 0 }
        : undefined,
      label: card.exhaustHandTarget
        ? `Exhaust ${getCardForInstance(handTarget).name} · Draw ${tacticBase.cardsDrawn}`
        : `Retain ${getCardForInstance(handTarget).name} · Cost −${card.targetCostReduction ?? 0}`,
    };
  }

  if (card.retrieveGeneratedFromExhaust) {
    if (target.kind !== "exhaust-card") {
      return { legal: false, reason: "Choose a Generated card from Exhaust." };
    }
    const exhaustTarget = cycle.exhaustPile.find(
      (candidate) =>
        candidate.instanceId === target.instanceId && isGeneratedCardInstance(candidate),
    );
    if (!exhaustTarget) {
      return { legal: false, reason: "Choose a Generated card from Exhaust." };
    }
    return {
      ...tacticBase,
      kind: "tactic",
      stun: false,
      retrievedExhaustCardInstanceId: exhaustTarget.instanceId,
      label: `Return ${getCardForInstance(exhaustTarget).name}`,
    };
  }

  if (card.spawnSideQuest) {
    if (target.kind !== "discipline") {
      return { legal: false, reason: "Choose a Side Quest discipline." };
    }
    if (cycle.tasks.some((task) => task.role === "side-quest" && task.status !== "shipped")) {
      return { legal: false, reason: "Ship the current Side Quest first." };
    }
    return {
      ...tacticBase,
      kind: "tactic",
      stun: false,
      sideQuestDiscipline: target.discipline,
      label: `Add ${disciplineLabel(target.discipline)} Side Quest`,
    };
  }

  if (card.cycleFlexibleBlockBonus) {
    if (target.kind !== "squad") {
      return { legal: false, reason: "Aim this at the squad." };
    }
    return {
      ...tacticBase,
      kind: "tactic",
      stun: false,
      label: `Flexible Block +${card.cycleFlexibleBlockBonus}`,
    };
  }

  const installsGuardOnly =
    card.kind === "tactic" &&
    card.automation?.kind === "install" &&
    card.automation.power === 0 &&
    (card.automation.blockPower ?? 0) > 0;
  if (installsGuardOnly && card.automation?.kind === "install") {
    if (target.kind !== "squad") {
      return { legal: false, reason: "Aim this at the squad." };
    }
    const installedGuardPower = cycle.guardPower + (card.automation.blockPower ?? 0);
    const afterInstallLabels = (card.triggerAutomationAfterInstall ?? []).map((meter) =>
      meter === "guard"
        ? automationPacketLabel("Run", triggeredAutomationAmount(run, installedGuardPower), run)
        : undefined,
    );
    return {
      ...tacticBase,
      kind: "tactic",
      stun: false,
      label: [`Guard +${card.automation.blockPower ?? 0}`, ...afterInstallLabels]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (
    target.kind === "squad" &&
    (card.doubleTargetAutomationMeters || card.triggerTargetAutomation)
  ) {
    if (cycle.guardPower <= 0) {
      return { legal: false, reason: "Install Guard first." };
    }
    const guardPower = card.doubleTargetAutomationMeters ? cycle.guardPower * 2 : cycle.guardPower;
    const triggerCount = card.triggerTargetAutomation?.guard
      ? card.triggerTargetAutomation.times
      : 0;
    return {
      ...tacticBase,
      kind: "tactic",
      stun: false,
      label: [
        card.doubleTargetAutomationMeters ? "Guard ×2" : undefined,
        triggerCount > 0
          ? automationPacketLabel(
              "Run",
              triggeredAutomationAmount(run, guardPower) * triggerCount,
              run,
            )
          : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (
    (card.kind === "tactic" && card.automation?.kind === "install") ||
    card.triggerAutomationAfterInstall ||
    card.doubleTargetAutomationMeters ||
    card.triggerTargetAutomation
  ) {
    if (target.kind !== undefined && target.kind !== "task") {
      return { legal: false, reason: "Choose a requirement." };
    }
    if (!target.taskId || !target.discipline) {
      return { legal: false, reason: "Choose a requirement." };
    }
    const task = cycle.tasks.find((candidate) => candidate.taskId === target.taskId);
    const requirement = task?.requirements.find(
      (candidate) => candidate.discipline === target.discipline,
    );
    if (!task || task.status === "shipped" || !requirement) {
      return { legal: false, reason: "Choose an open requirement." };
    }
    if (
      (card.requiresTargetAutomation || card.triggerTargetAutomation) &&
      requirement.scriptPower === 0
    ) {
      return { legal: false, reason: "Install a Script here first, or aim at the squad's Guard." };
    }
    const installedScriptPower =
      requirement.scriptPower + (card.automation?.kind === "install" ? card.automation.power : 0);
    const installedGuardPower =
      cycle.guardPower +
      (card.automation?.kind === "install" ? (card.automation.blockPower ?? 0) : 0);
    let previewRemaining = remainingWork(requirement);
    const ciRunAmount =
      card.automation?.kind === "install" &&
      card.automation.power > 0 &&
      run.tools.includes("ci-runner")
        ? Math.min(triggeredAutomationAmount(run, card.automation.power), previewRemaining)
        : 0;
    previewRemaining -= ciRunAmount;
    const triggerScriptRunAmount = card.triggerTargetAutomation?.script
      ? Math.min(
          triggeredAutomationAmount(run, installedScriptPower) * card.triggerTargetAutomation.times,
          previewRemaining,
        )
      : 0;
    previewRemaining -= triggerScriptRunAmount;
    let afterInstallWorkAmount = 0;
    const afterInstallLabels = (card.triggerAutomationAfterInstall ?? []).map((meter) => {
      if (meter === "guard") {
        return automationPacketLabel(
          "Run",
          triggeredAutomationAmount(run, installedGuardPower),
          run,
        );
      }
      const amount = Math.min(
        triggeredAutomationAmount(run, installedScriptPower),
        previewRemaining,
      );
      previewRemaining -= amount;
      afterInstallWorkAmount += amount;
      return amount > 0 ? automationPacketLabel("Run", amount, run) : undefined;
    });
    return {
      ...tacticBase,
      kind: "tactic",
      taskId: task.taskId,
      targetDiscipline: requirement.discipline,
      previewWorkAmount: ciRunAmount + triggerScriptRunAmount + afterInstallWorkAmount,
      stun: false,
      label: [
        card.automation?.kind === "install" && card.automation.power > 0
          ? `Script +${card.automation.power}`
          : undefined,
        card.automation?.kind === "install" && card.automation.blockPower
          ? `Guard +${card.automation.blockPower}`
          : undefined,
        ciRunAmount > 0 ? automationPacketLabel("CI", ciRunAmount, run) : undefined,
        card.doubleTargetAutomationMeters ? "Script + Guard ×2" : undefined,
        card.triggerTargetAutomation ? `Trigger ${card.triggerTargetAutomation.times}×` : undefined,
        ...afterInstallLabels,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (card.stunIntent) {
    if (target.kind !== undefined && target.kind !== "task") {
      return { legal: false, reason: "Choose a Task." };
    }
    const task = cycle.tasks.find((candidate) => candidate.taskId === target.taskId);
    const intent = task ? getTargetableIntent(run, cycle, task) : undefined;
    if (!task || task.status === "shipped" || !intent) {
      return { legal: false, reason: "Choose a Task with an End Day effect." };
    }
    if (task.stunned) return { legal: false, reason: "This Task is already Cancelled Today." };
    if (card.stunIntent.excludedKinds?.includes(intent.kind)) {
      return { legal: false, reason: `${card.name} cannot cancel ${intent.kind}.` };
    }
    return {
      ...tacticBase,
      kind: "tactic",
      taskId: task.taskId,
      stun: true,
      label: `Cancel · Block ${tacticBlock}`,
    };
  }

  if (card.kind === "tactic" && !card.stun) {
    if (target.kind !== "squad") {
      return { legal: false, reason: "Aim this at the squad." };
    }
    if (card.generateLastWorkCopy && !cycle.lastWorkCard) {
      return { legal: false, reason: "Play a Work card first." };
    }
    if (card.generateLastNonGeneratedCopy && !cycle.lastNonGeneratedCard) {
      return { legal: false, reason: "Play a non-Generated card first." };
    }
    if (card.amountPerGeneratedCardPlayed && cycle.generatedCardsPlayedThisDay === 0) {
      return { legal: false, reason: "Play a Generated card first." };
    }
    if (
      card.focusPerGeneratedCardsPlayed &&
      cycle.generatedCardsPlayedThisDay < card.focusPerGeneratedCardsPlayed
    ) {
      return {
        legal: false,
        reason: `Play ${card.focusPerGeneratedCardsPlayed} Generated cards first.`,
      };
    }
    if (card.generatedCardsPerChain && generatedCards.length === 0) {
      return { legal: false, reason: "Build more Chain first." };
    }
    if ((card.doubleChain || card.blockPerChain) && cycle.chain.count === 0) {
      return { legal: false, reason: "Build Chain first." };
    }
    if (card.returnDrawnToTop) {
      const availableAfterDraw =
        cycle.hand.length -
        1 +
        Math.min(card.cardsDrawn ?? 0, cycle.drawPile.length + cycle.discardPile.length);
      if (availableAfterDraw < card.returnDrawnToTop) {
        return { legal: false, reason: "Not enough cards to reorder." };
      }
    }
    if (card.exhaustAllTechDebtCards && exhaustedCardInstanceIds.length === 0) {
      return { legal: false, reason: "No Tech Debt cards to exhaust." };
    }
    if (card.verifiedWorkPerOpenTask) {
      const verifiedWorkHits = cycle.tasks.flatMap((task) => {
        if (task.status === "shipped") return [];
        const targetRequirement = task.requirements
          .map((requirement, index) => ({
            requirement,
            index,
            remaining: remainingWork(requirement),
          }))
          .filter(({ remaining }) => remaining > 0)
          .sort((left, right) => left.remaining - right.remaining || left.index - right.index)[0];
        return targetRequirement
          ? [
              {
                taskId: task.taskId,
                discipline: targetRequirement.requirement.discipline,
                amount: Math.min(card.verifiedWorkPerOpenTask!, targetRequirement.remaining),
              },
            ]
          : [];
      });
      if (verifiedWorkHits.length === 0) {
        return { legal: false, reason: "No open Tasks need Work." };
      }
      const completions = verifiedWorkHits.filter((hit) => {
        const requirement = cycle.tasks
          .find((task) => task.taskId === hit.taskId)
          ?.requirements.find((candidate) => candidate.discipline === hit.discipline);
        return requirement && requirementCompletedByVerifiedWork(requirement, hit.amount);
      }).length;
      const passiveDraws = run.squad.includes("irene") ? completions : 0;
      return {
        ...tacticBase,
        kind: "tactic",
        stun: false,
        verifiedWorkHits,
        cardsDrawn: tacticBase.cardsDrawn + passiveDraws,
        triggeredPassiveIds: passiveDraws > 0 ? ["irene"] : tacticBase.triggeredPassiveIds,
        label: `All Hands · ${verifiedWorkHits.length} Work packets`,
      };
    }
    if (card.triggerEveryAutomation) {
      const verifiedWorkHits = cycle.tasks.flatMap((task) =>
        task.status === "shipped"
          ? []
          : task.requirements.flatMap((requirement) => {
              const amount = Math.min(
                triggeredAutomationAmount(run, requirement.scriptPower),
                remainingWork(requirement),
              );
              return amount > 0
                ? [{ taskId: task.taskId, discipline: requirement.discipline, amount }]
                : [];
            }),
      );
      const guardBlock = triggeredAutomationAmount(run, cycle.guardPower);
      if (verifiedWorkHits.length === 0 && guardBlock === 0) {
        return { legal: false, reason: "Install a Script or Guard first." };
      }
      const completions = verifiedWorkHits.filter((hit) => {
        const requirement = cycle.tasks
          .find((task) => task.taskId === hit.taskId)
          ?.requirements.find((candidate) => candidate.discipline === hit.discipline);
        return requirement && requirementCompletedByVerifiedWork(requirement, hit.amount);
      }).length;
      const passiveDraws = run.squad.includes("irene") ? completions : 0;
      return {
        ...tacticBase,
        kind: "tactic",
        stun: false,
        verifiedWorkHits,
        blockGained: tacticBase.blockGained + guardBlock,
        cardsDrawn: tacticBase.cardsDrawn + passiveDraws,
        triggeredPassiveIds: passiveDraws > 0 ? ["irene"] : tacticBase.triggeredPassiveIds,
        label: [
          verifiedWorkHits.length > 0 ? `Run ${verifiedWorkHits.length} Scripts` : undefined,
          guardBlock > 0 ? `Block ${guardBlock}` : undefined,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    if (card.completeRequirementsAtMost) {
      const verifiedWorkHits = cycle.tasks.flatMap((task) =>
        task.status === "shipped"
          ? []
          : task.requirements.flatMap((requirement) => {
              const remaining = remainingWork(requirement);
              return remaining > 0 && remaining <= card.completeRequirementsAtMost!
                ? [
                    {
                      taskId: task.taskId,
                      discipline: requirement.discipline,
                      amount: remaining,
                    },
                  ]
                : [];
            }),
      );
      if (verifiedWorkHits.length === 0) {
        return { legal: false, reason: "No requirements have 3 or less Work remaining." };
      }
      const passiveCardsDrawn = run.squad.includes("irene") ? verifiedWorkHits.length : 0;
      return {
        ...tacticBase,
        kind: "tactic",
        stun: false,
        verifiedWorkHits,
        cardsDrawn: tacticBase.cardsDrawn + passiveCardsDrawn,
        triggeredPassiveIds: passiveCardsDrawn > 0 ? ["irene"] : [],
        label: [
          `Complete ${verifiedWorkHits.length} ${verifiedWorkHits.length === 1 ? "requirement" : "requirements"}`,
          passiveCardsDrawn ? `Draw ${passiveCardsDrawn}` : undefined,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    const label = [
      card.fullStackAdded ? `Full Stack +${card.fullStackAdded}` : undefined,
      generatedCards.length ? `Generate ${generatedCards.length}` : undefined,
      tacticBlock ? `Block ${tacticBlock}` : undefined,
      card.focusGained ? `Focus +${card.focusGained}` : undefined,
      card.cardsDrawn ? `Draw ${card.cardsDrawn}` : undefined,
      card.nextDayCardsDrawn ? `Next Day · Draw +${card.nextDayCardsDrawn}` : undefined,
      card.queuedDistractions ? `Next Day · ${card.queuedDistractions} Distractions` : undefined,
      card.techDebtAdded ? `Debt +${card.techDebtAdded}` : undefined,
      card.amountPerGeneratedCardPlayed
        ? `Any ${cycle.generatedCardsPlayedThisDay * card.amountPerGeneratedCardPlayed}`
        : undefined,
      card.focusPerGeneratedCardsPlayed
        ? `Focus +${Math.floor(cycle.generatedCardsPlayedThisDay / card.focusPerGeneratedCardsPlayed)}`
        : undefined,
      card.doubleChain ? `Chain ×2` : undefined,
      card.cycleWorkBonus
        ? `${card.cycleWorkBonus.tag === "ai-assisted" ? "AI Assisted" : card.cycleWorkBonus.tag} Work +${card.cycleWorkBonus.amount}`
        : undefined,
      card.dayReviewStunFocusBonus
        ? `Review Cancel · Focus +${card.dayReviewStunFocusBonus}`
        : undefined,
      card.discardedHandTags
        ? `Discard ${tacticBase.discardedCardInstanceIds.length} ${card.discardedHandTags.map((tag) => (tag === "ai-assisted" ? "AI Assisted" : tag)).join("/")}`
        : undefined,
      card.dayWorkBonus ? `Eligible Work +${card.dayWorkBonus.amount} this Day` : undefined,
      card.frontendWorkToEveryTask
        ? `Frontend +${card.frontendWorkToEveryTask} · Every Task`
        : undefined,
      card.scriptPowerOnEveryIncompleteFrontend
        ? `Script +${card.scriptPowerOnEveryIncompleteFrontend} · Every Frontend${card.triggerInstalledScripts ? " · Trigger" : ""}`
        : undefined,
      card.blockPerFinishingTouchesReview
        ? `Finishing Touches · Block ${card.blockPerFinishingTouchesReview}:1`
        : undefined,
      card.copyNextCardEffect ? "Next card ×2" : undefined,
      card.blockWorkPowerThisDay
        ? `Block gained later · Work ${card.blockWorkPowerThisDay}`
        : undefined,
      card.exhaustAllTechDebtCards
        ? `Exhaust ${exhaustedCardInstanceIds.length} Debt · Focus +${exhaustedCardInstanceIds.length}`
        : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      ...tacticBase,
      kind: "tactic",
      stun: false,
      label: label || card.name,
    };
  }

  let triggeredPassiveIds: DeveloperId[] = [...tacticBase.triggeredPassiveIds];

  if (card.kind === "review") {
    const reviewTargetId =
      target.kind === undefined || target.kind === "task" ? target.taskId : undefined;
    if (card.reviewEveryTask ? target.kind !== "squad" : !reviewTargetId) {
      return {
        legal: false,
        reason: card.reviewEveryTask ? "Aim this at the squad." : "Choose a Task.",
      };
    }
    const targetTasks = card.reviewEveryTask
      ? cycle.tasks.filter((task) => task.status !== "shipped" && taskUnverifiedWork(task) > 0)
      : cycle.tasks.filter(
          (task) =>
            task.taskId === reviewTargetId &&
            task.status !== "shipped" &&
            taskUnverifiedWork(task) > 0,
        );
    if (targetTasks.length === 0) {
      return {
        legal: false,
        reason: card.reviewEveryTask
          ? "No Tasks have Unverified Work."
          : "This Task has no Unverified Work.",
      };
    }

    const scriptPower = card.scriptPowerPerIncompleteRequirement ?? 0;
    const reviews = targetTasks.map((task) => {
      const amount = Math.min(
        taskUnverifiedWork(task),
        card.reviewAllUnverified ? taskUnverifiedWork(task) : card.amount + generatedOutputBonus,
      );
      const reviewedTask = verifyTask(task, amount);
      return {
        taskId: task.taskId,
        amount,
        stun:
          run.squad.includes("odin") &&
          !task.stunned &&
          taskUnverifiedWork(reviewedTask) === 0 &&
          Boolean(getTargetableIntent(run, cycle, task)),
        scriptInstallations: reviewedTask.requirements
          .filter((requirement) => scriptPower > 0 && remainingWork(requirement) > 0)
          .map((requirement) => ({
            discipline: requirement.discipline,
            powerAdded: scriptPower,
            runAmount: run.tools.includes("ci-runner")
              ? Math.min(triggeredAutomationAmount(run, scriptPower), remainingWork(requirement))
              : 0,
          })),
      };
    });
    const reviewStuns = reviews.filter((review) => review.stun).length;
    if (reviewStuns > 0) {
      triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "odin");
    }
    const passiveCardsDrawn = run.squad.includes("irene")
      ? reviews.reduce((total, review) => {
          const reviewedTask = verifyTask(
            targetTasks.find((task) => task.taskId === review.taskId) ?? targetTasks[0],
            review.amount,
          );
          return (
            total +
            review.scriptInstallations.filter((installation) => {
              const requirement = reviewedTask.requirements.find(
                (candidate) => candidate.discipline === installation.discipline,
              );
              return (
                requirement &&
                requirementCompletedByVerifiedWork(requirement, installation.runAmount)
              );
            }).length
          );
        }, 0)
      : 0;
    if (passiveCardsDrawn > 0) {
      triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "irene");
    }
    const amount = reviews.reduce((total, review) => total + review.amount, 0);
    const blockGained = cardBlockWithTools(
      run,
      (card.block ?? 0) + (run.tools.includes("test-suite") ? amount : 0),
    );
    const cardsDrawn =
      (card.cardsDrawn ?? 0) +
      passiveCardsDrawn +
      reviewStuns * (card.cardsDrawnPerReviewStun ?? 0) +
      reviews.filter((review) => {
        const source = targetTasks.find((task) => task.taskId === review.taskId);
        return source ? taskUnverifiedWork(verifyTask(source, review.amount)) === 0 : false;
      }).length *
        (card.cardsDrawnIfTaskFullyVerified ?? 0);
    const focusGained =
      (card.focusGained ?? 0) +
      reviewStuns * cycle.reviewStunFocusBonus +
      reviews.filter((review) => {
        const source = targetTasks.find((task) => task.taskId === review.taskId);
        return source ? taskUnverifiedWork(verifyTask(source, review.amount)) === 0 : false;
      }).length *
        (card.focusIfTaskFullyVerified ?? 0);
    const scriptInstallations = reviews.flatMap((review) => review.scriptInstallations);
    return {
      ...tacticBase,
      kind: "review",
      taskId: card.reviewEveryTask ? undefined : reviews[0]?.taskId,
      amount,
      blockGained,
      cardsDrawn,
      focusGained,
      stun: reviewStuns > 0,
      reviews,
      triggeredPassiveIds,
      label: [
        card.reviewEveryTask
          ? `${card.reviewAllUnverified ? "Verify all" : `Verify ${card.amount}`} · ${reviews.length} ${reviews.length === 1 ? "Task" : "Tasks"}`
          : `Verify ${amount}`,
        scriptInstallations.length > 0
          ? `Script +${scriptPower} · ${scriptInstallations.length} ${scriptInstallations.length === 1 ? "bar" : "bars"}`
          : undefined,
        scriptInstallations.reduce((total, installation) => total + installation.runAmount, 0) > 0
          ? `Run +${scriptInstallations.reduce((total, installation) => total + installation.runAmount, 0)}`
          : undefined,
        reviewStuns > 0 ? (card.reviewEveryTask ? `Cancel ${reviewStuns}` : "Cancel") : undefined,
        blockGained ? `Block ${blockGained}` : undefined,
        focusGained ? `Focus +${focusGained}` : undefined,
        cardsDrawn ? `Draw ${cardsDrawn}` : undefined,
        card.frontendSpreadIfTaskClean
          ? `Clean · spread Frontend ${card.frontendSpreadIfTaskClean}`
          : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (
    target.kind === "squad" ||
    target.kind === "discipline" ||
    target.kind === "hand-card" ||
    target.kind === "exhaust-card"
  ) {
    return { legal: false, reason: "Choose a Task." };
  }

  const task = cycle.tasks.find((candidate) => candidate.taskId === target.taskId);
  if (!task) return { legal: false, reason: "Choose a Task." };
  if (task.status === "shipped") {
    return { legal: false, reason: "This Task has already shipped." };
  }

  if (card.kind === "tactic") {
    if (card.stun && task.stunned) {
      return { legal: false, reason: "This Task is already Cancelled Today." };
    }
    if (card.stun && !getTargetableIntent(run, cycle, task)) {
      return { legal: false, reason: "This Task has no End Day effect to cancel." };
    }
    return {
      ...tacticBase,
      kind: "tactic",
      taskId: task.taskId,
      stun: card.stun ?? false,
      triggeredPassiveIds,
      label: [card.stun ? "Cancel" : undefined, card.block ? `Block ${card.block}` : undefined]
        .filter(Boolean)
        .join(" · "),
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
  if (card.maxTargetRemaining && remainingWork(requirement) > card.maxTargetRemaining) {
    return {
      legal: false,
      reason: `Choose a requirement with ${card.maxTargetRemaining} or less Work remaining.`,
    };
  }

  if (card.automation?.kind === "trigger" && requirement.scriptPower === 0) {
    return { legal: false, reason: "Install a Script here first." };
  }

  const pitchedIn = card.discipline !== "flexible" && card.discipline !== target.discipline;
  const pairedPitchIn = pitchedIn && run.tools.includes("pairing-session");
  const workKind: WorkKind = pairedPitchIn
    ? "verified"
    : pitchedIn
      ? "unverified"
      : (card.workKind ?? "verified");
  const countsAsWorkPlay =
    (card.amount > 0 ||
      Boolean(card.amountPerGeneratedCardPlayed) ||
      Boolean(card.workPerRetainedCard)) &&
    card.automation?.kind !== "trigger";
  let amount =
    card.automation?.kind === "trigger"
      ? triggeredAutomationAmount(run, requirement.scriptPower)
      : pitchedIn
        ? 1
        : card.amount;

  amount += (card.workPerTechDebt ?? 0) * run.techDebt;

  if (card.workPerOtherIncompleteFrontendTask) {
    amount +=
      card.workPerOtherIncompleteFrontendTask *
      cycle.tasks.filter(
        (candidate) =>
          candidate.taskId !== task.taskId &&
          candidate.status === "open" &&
          candidate.requirements.some(
            (candidateRequirement) =>
              candidateRequirement.discipline === "frontend" &&
              remainingWork(candidateRequirement) > 0,
          ),
      ).length;
  }

  if (countsAsWorkPlay) {
    amount += generatedOutputBonus;
    if (card.discipline === "flexible" && run.tools.includes("t-shaped-team")) {
      amount += 1;
    }
    amount += (card.amountPerGeneratedCardPlayed ?? 0) * cycle.generatedCardsPlayedThisDay;
    amount +=
      (card.workPerRetainedCard ?? 0) *
      cycle.hand.filter((candidate) => candidate.retained || getCardForInstance(candidate).retain)
        .length;
    if (run.squad.includes("levi")) {
      amount += momentumBeforePlay;
      triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "levi");
    }
  }

  const aiAssisted = card.tags.includes("ai-assisted");
  if (countsAsWorkPlay) {
    const prototypeBonus = cycle.prototypePower;
    const fullStackBonus =
      cycle.lastWorkDiscipline && cycle.lastWorkDiscipline !== target.discipline
        ? cycle.fullStackPower
        : 0;
    const cycleTagBonus = card.tags.reduce(
      (total, tag) => total + (cycle.cardTagWorkBonuses[tag] ?? 0),
      0,
    );
    const dayWorkBonus = cycle.dayWorkBonuses.reduce(
      (total, bonus) =>
        bonus.excludedTags.some((tag) => card.tags.includes(tag)) ? total : total + bonus.amount,
      0,
    );
    const stunnedTaskBonus = task.stunned ? (card.bonusWorkIfTaskStunned ?? 0) : 0;
    amount += prototypeBonus + fullStackBonus + cycleTagBonus + dayWorkBonus + stunnedTaskBonus;
    if (aiAssisted && run.tools.includes("enterprise-ai-licence")) {
      amount += 2;
    }
  }

  const workRemaining = remainingWork(requirement);
  const attemptedAmount = amount;
  amount = Math.min(attemptedAmount, workRemaining);
  const madiScript = aiAssisted && run.squad.includes("madi") ? 1 : 0;
  if (madiScript) {
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "madi");
  }
  const scriptPowerAdded =
    (card.automation?.kind === "install" ? card.automation.power : 0) + madiScript;
  const guardPowerAdded =
    card.automation?.kind === "install" ? (card.automation.blockPower ?? 0) : 0;
  const remainingAfterWork = Math.max(0, remainingWork(requirement) - amount);
  const scriptInstallRunAmount =
    scriptPowerAdded > 0 && run.tools.includes("ci-runner")
      ? Math.min(triggeredAutomationAmount(run, scriptPowerAdded), remainingAfterWork)
      : 0;
  const remainingAfterInstallRun = Math.max(0, remainingAfterWork - scriptInstallRunAmount);
  const scriptTriggerRunAmount = card.triggerTargetScriptAfterWork
    ? Math.min(
        triggeredAutomationAmount(run, requirement.scriptPower + scriptPowerAdded),
        remainingAfterInstallRun,
      )
    : 0;
  const scriptRunAmount = scriptInstallRunAmount + scriptTriggerRunAmount;
  const blockGained = tacticBase.blockGained;
  const verifiedCompletion = requirementCompletedByVerifiedWork(
    requirement,
    (workKind === "verified" ? amount : 0) + scriptRunAmount,
    workKind === "unverified" ? amount : 0,
  );
  const verifiedWorkHits: { taskId: string; discipline: Discipline; amount: number }[] = [];
  if (verifiedCompletion && card.spilloverVerifiedOnCompletion) {
    const spillTarget = task.requirements
      .map((candidate, index) => ({
        candidate,
        index,
        remaining:
          candidate.discipline === requirement.discipline
            ? Math.max(0, remainingWork(candidate) - amount - scriptRunAmount)
            : remainingWork(candidate),
      }))
      .filter(
        ({ candidate, remaining }) =>
          candidate.discipline !== requirement.discipline && remaining > 0,
      )
      .sort((left, right) => left.remaining - right.remaining || left.index - right.index)[0];
    if (spillTarget) {
      verifiedWorkHits.push({
        taskId: task.taskId,
        discipline: spillTarget.candidate.discipline,
        amount: Math.min(card.spilloverVerifiedOnCompletion, spillTarget.remaining),
      });
    }
  }
  const spilloverCompletions = verifiedWorkHits.filter((hit) => {
    const spillRequirement = task.requirements.find(
      (candidate) => candidate.discipline === hit.discipline,
    );
    return spillRequirement && requirementCompletedByVerifiedWork(spillRequirement, hit.amount);
  }).length;
  const passiveCardsDrawn =
    run.squad.includes("irene") && (verifiedCompletion || spilloverCompletions > 0)
      ? Number(verifiedCompletion) + spilloverCompletions
      : 0;
  if (passiveCardsDrawn) {
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "irene");
  }
  const cardsDrawn = passiveCardsDrawn + tacticBase.cardsDrawn;
  const completionCardsDrawn = verifiedCompletion ? (card.cardsDrawnOnRequirementComplete ?? 0) : 0;
  const focusGained =
    (card.focusGained ?? 0) + (verifiedCompletion ? (card.focusOnRequirementComplete ?? 0) : 0);
  const techDebtAdded =
    (aiAssisted && run.tools.includes("enterprise-ai-licence") ? 1 : 0) + (card.techDebtAdded ?? 0);
  const pitchLabel = pairedPitchIn
    ? `Pairing · ${amount} Verified`
    : `Pitch In · ${amount} Unverified`;
  const label =
    card.automation?.kind === "trigger"
      ? `Run Script · +${amount} Verified`
      : card.automation?.kind === "install"
        ? [
            amount > 0
              ? pitchedIn
                ? pitchLabel
                : `+${amount} ${workKind === "verified" ? "Verified" : "Unverified"}`
              : undefined,
            scriptPowerAdded > 0 ? `Script +${scriptPowerAdded}` : undefined,
            scriptInstallRunAmount > 0
              ? automationPacketLabel("CI", scriptInstallRunAmount, run)
              : undefined,
            scriptTriggerRunAmount > 0
              ? automationPacketLabel("Run", scriptTriggerRunAmount, run)
              : undefined,
            verifiedWorkHits[0]
              ? `${disciplineLabel(verifiedWorkHits[0].discipline)} spill +${verifiedWorkHits[0].amount}`
              : undefined,
            guardPowerAdded > 0 ? `Guard +${guardPowerAdded}` : undefined,
            blockGained > 0 ? `Block ${blockGained}` : undefined,
            techDebtAdded > 0 ? `Debt +${techDebtAdded}` : undefined,
            cardsDrawn + completionCardsDrawn > 0
              ? `Draw ${cardsDrawn + completionCardsDrawn}`
              : undefined,
            focusGained > 0 ? `Focus +${focusGained}` : undefined,
            card.frontendSpreadToOtherTasks
              ? `Spread Frontend ${card.frontendSpreadToOtherTasks}`
              : undefined,
            card.extraSharedComponentsOnCompletion
              ? `Complete · echo +${card.extraSharedComponentsOnCompletion}`
              : undefined,
            card.finishingTouchesEveryTask && Math.max(0, attemptedAmount - amount) > 0
              ? `Overflow ${Math.max(0, attemptedAmount - amount)} · Review every Task`
              : undefined,
          ]
            .filter(Boolean)
            .join(" · ")
        : [
            pitchedIn ? pitchLabel : `${disciplineLabel(target.discipline)} +${amount} ${workKind}`,
            blockGained > 0 ? `Block ${blockGained}` : undefined,
            techDebtAdded > 0 ? `Debt +${techDebtAdded}` : undefined,
            scriptPowerAdded > 0 ? `Script +${scriptPowerAdded}` : undefined,
            scriptInstallRunAmount > 0
              ? automationPacketLabel("CI", scriptInstallRunAmount, run)
              : undefined,
            scriptTriggerRunAmount > 0
              ? automationPacketLabel("Run", scriptTriggerRunAmount, run)
              : undefined,
            verifiedWorkHits[0]
              ? `${disciplineLabel(verifiedWorkHits[0].discipline)} spill +${verifiedWorkHits[0].amount}`
              : undefined,
            cardsDrawn + completionCardsDrawn > 0
              ? `Draw ${cardsDrawn + completionCardsDrawn}`
              : undefined,
            focusGained > 0 ? `Focus +${focusGained}` : undefined,
            card.frontendSpreadToOtherTasks
              ? `Spread Frontend ${card.frontendSpreadToOtherTasks}`
              : undefined,
            card.extraSharedComponentsOnCompletion
              ? `Complete · echo +${card.extraSharedComponentsOnCompletion}`
              : undefined,
            card.finishingTouchesEveryTask && Math.max(0, attemptedAmount - amount) > 0
              ? `Overflow ${Math.max(0, attemptedAmount - amount)} · Review every Task`
              : undefined,
          ]
            .filter(Boolean)
            .join(" · ");

  return {
    ...tacticBase,
    kind: "work",
    taskId: task.taskId,
    discipline: target.discipline,
    amount,
    workKind,
    scriptPowerAdded,
    guardPowerAdded,
    scriptInstallRunAmount,
    scriptTriggerRunAmount,
    scriptRunAmount,
    techDebtAdded,
    cardsDrawn: cardsDrawn + completionCardsDrawn,
    focusGained,
    verifiedWorkHits,
    pitchedIn,
    countsAsWorkPlay,
    attemptedAmount,
    overflow: Math.max(0, attemptedAmount - amount),
    requirementCompleted: verifiedCompletion,
    triggeredPassiveIds,
    label,
  };
}

function repeatResolvedCardEffect(
  resolution: Exclude<CardResolution, { legal: false }>,
  repeats: number,
): Exclude<CardResolution, { legal: false }> {
  if (repeats <= 1) return resolution;
  const repeatedGeneratedCards = Array.from(
    { length: repeats },
    () => resolution.generatedCards,
  ).flat();
  const repeatedBase = {
    blockGained: resolution.blockGained * repeats,
    techDebtAdded: resolution.techDebtAdded * repeats,
    cardsDrawn: resolution.cardsDrawn * repeats,
    nextDayCardsDrawn: resolution.nextDayCardsDrawn * repeats,
    focusGained: resolution.focusGained * repeats,
    generatedCards: repeatedGeneratedCards,
    verifiedWorkHits: resolution.verifiedWorkHits.map((hit) => ({
      ...hit,
      amount: hit.amount * repeats,
    })),
    returnDrawnToTop: resolution.returnDrawnToTop * repeats,
    queuedDistractions: resolution.queuedDistractions * repeats,
    cycleWorkBonus: resolution.cycleWorkBonus
      ? { ...resolution.cycleWorkBonus, amount: resolution.cycleWorkBonus.amount * repeats }
      : undefined,
    dayWorkBonus: resolution.dayWorkBonus
      ? { ...resolution.dayWorkBonus, amount: resolution.dayWorkBonus.amount * repeats }
      : undefined,
    dayReviewStunFocusAdded: resolution.dayReviewStunFocusAdded * repeats,
    fullStackAdded: resolution.fullStackAdded * repeats,
    polishBudgetAdded: resolution.polishBudgetAdded * repeats,
    label: `Copy/Paste ×${repeats} · ${resolution.label}`,
  };

  if (resolution.kind === "work") {
    return {
      ...resolution,
      ...repeatedBase,
      amount: resolution.amount * repeats,
      attemptedAmount: resolution.attemptedAmount * repeats,
      overflow: resolution.overflow * repeats,
      scriptPowerAdded: resolution.scriptPowerAdded * repeats,
      guardPowerAdded: resolution.guardPowerAdded * repeats,
      scriptInstallRunAmount: resolution.scriptInstallRunAmount * repeats,
      scriptTriggerRunAmount: resolution.scriptTriggerRunAmount * repeats,
      scriptRunAmount: resolution.scriptRunAmount * repeats,
    };
  }
  if (resolution.kind === "review") {
    return {
      ...resolution,
      ...repeatedBase,
      amount: resolution.amount * repeats,
      reviews: resolution.reviews.map((review) => ({
        ...review,
        amount: review.amount * repeats,
        scriptInstallations: review.scriptInstallations.map((installation) => ({
          ...installation,
          powerAdded: installation.powerAdded * repeats,
          runAmount: installation.runAmount * repeats,
        })),
      })),
    };
  }
  return { ...resolution, ...repeatedBase };
}

export function resolveCardTarget(
  run: RunState,
  instance: CardInstance,
  target: CardTarget,
): CardResolution {
  const resolution = resolveCardTargetOnce(run, instance, target);
  const cycle = run.cycle;
  const card = getCardForInstance(instance);
  if (!resolution.legal || !cycle || card.copyNextCardEffect) return resolution;
  return repeatResolvedCardEffect(resolution, 1 + (cycle.copiedCardEffectCount ?? 0));
}

export function applyCardResolutionToTask(
  task: TaskState,
  resolution: Exclude<CardResolution, { legal: false }>,
): TaskState {
  if (resolution.kind === "review") {
    const review = resolution.reviews.find((candidate) => candidate.taskId === task.taskId);
    if (!review) return task;
    const reviewedTask = verifyTask(task, review.amount);
    return applyVerifiedWorkHits(
      refreshTaskStatus({
        ...reviewedTask,
        stunned: review.stun || reviewedTask.stunned,
        requirements: reviewedTask.requirements.map((requirement) => {
          const installation = review.scriptInstallations.find(
            (candidate) => candidate.discipline === requirement.discipline,
          );
          return installation
            ? {
                ...requirement,
                verified: requirement.verified + installation.runAmount,
                scriptPower: requirement.scriptPower + installation.powerAdded,
              }
            : requirement;
        }),
      }),
      resolution.verifiedWorkHits,
    );
  }

  if (resolution.kind === "tactic") {
    return applyVerifiedWorkHits(
      { ...task, stunned: resolution.stun || task.stunned },
      resolution.verifiedWorkHits,
    );
  }

  return applyVerifiedWorkHits(
    refreshTaskStatus({
      ...task,
      requirements: task.requirements.map((requirement) =>
        requirement.discipline !== resolution.discipline
          ? requirement
          : (() => {
              const directAmount = Math.min(resolution.amount, remainingWork(requirement));
              const scriptAmount = Math.min(
                resolution.scriptRunAmount,
                Math.max(0, remainingWork(requirement) - directAmount),
              );
              return {
                ...requirement,
                verified:
                  requirement.verified +
                  (resolution.workKind === "verified" ? directAmount : 0) +
                  scriptAmount,
                unverified:
                  requirement.unverified +
                  (resolution.workKind === "unverified" ? directAmount : 0),
                scriptPower: requirement.scriptPower + resolution.scriptPowerAdded,
              };
            })(),
      ),
    }),
    resolution.verifiedWorkHits,
  );
}

export interface RosterBoardEffects {
  tasks: readonly TaskState[];
  cardsDrawn: number;
  blockGained: number;
  guardPower: number;
  focusGained: number;
  triggeredPassiveIds: readonly DeveloperId[];
  labels: readonly string[];
}

interface FrontendPacket {
  taskId: string;
  amount: number;
  source: "spread" | "shared-components" | "script";
}

function reviewOverflowOnTask(
  task: TaskState,
  amount: number,
): { task: TaskState; reviewed: number; cleaned: boolean } {
  const before = taskUnverifiedWork(task);
  let remaining = Math.max(0, amount);
  const requirements = disciplineOrder
    .map((discipline) => task.requirements.find((item) => item.discipline === discipline))
    .filter((requirement): requirement is RequirementState => Boolean(requirement))
    .map((requirement) => {
      const reviewed = Math.min(requirement.unverified, remaining);
      remaining -= reviewed;
      return {
        ...requirement,
        verified: requirement.verified + reviewed,
        unverified: requirement.unverified - reviewed,
      };
    });
  const reviewed =
    before - requirements.reduce((sum, requirement) => sum + requirement.unverified, 0);
  return {
    task: { ...task, requirements },
    reviewed,
    cleaned: before > 0 && reviewed === before,
  };
}

/**
 * Resolve distributed roster effects after the played card's ordinary packet.
 * The queue is intentionally FIFO and board ordered so Seb cascades, Matt
 * overflow Review, and their cross-character combo stay deterministic.
 */
export function applyRosterBoardEffects(
  run: RunState,
  instance: CardInstance,
  resolution: Exclude<CardResolution, { legal: false }>,
  baseTasks: readonly TaskState[],
): RosterBoardEffects {
  const card = getCardForInstance(instance);
  let tasks = baseTasks.map((task) => ({
    ...task,
    requirements: task.requirements.map((requirement) => ({ ...requirement })),
  }));
  const triggeredPassiveIds: DeveloperId[] = [];
  const labels: string[] = [];
  let cardsDrawn = 0;
  let blockGained = 0;
  let guardPower = run.cycle?.guardPower ?? 0;
  const guardPowerBefore = guardPower;
  let focusGained = 0;
  let automationWorkGained = 0;
  const queue: FrontendPacket[] = [];

  const markPassive = (id: DeveloperId) => {
    if (!triggeredPassiveIds.includes(id)) triggeredPassiveIds.push(id);
  };

  const applyMattReview = (sourceTaskId: string, overflow: number, everyTask = false) => {
    if (!run.squad.includes("matt") || overflow <= 0) return;
    const targetIds = everyTask
      ? tasks.filter((task) => task.status !== "shipped").map((task) => task.taskId)
      : [sourceTaskId];
    let totalReviewed = 0;
    let cleaned = 0;
    for (const taskId of targetIds) {
      const taskIndex = tasks.findIndex((task) => task.taskId === taskId);
      const task = tasks[taskIndex];
      if (!task || task.status === "shipped") continue;
      const review = reviewOverflowOnTask(task, overflow);
      if (
        review.reviewed > 0 &&
        review.cleaned &&
        run.squad.includes("odin") &&
        !review.task.stunned
      ) {
        const scheduled = getTargetableIntent(run, run.cycle!, review.task);
        if (scheduled) {
          review.task = { ...review.task, stunned: true };
          markPassive("odin");
        }
      }
      tasks = tasks.map((candidate, index) => (index === taskIndex ? review.task : candidate));
      totalReviewed += review.reviewed;
      cleaned += Number(review.cleaned);
    }
    if (totalReviewed > 0) {
      markPassive("matt");
      blockGained += totalReviewed * run.cycle!.polishBudgetPower;
      if (run.tools.includes("test-suite")) blockGained += totalReviewed;
      labels.push(`Finishing Touches · Review ${totalReviewed}`);
    }
    if (everyTask) cardsDrawn += cleaned * (card.cardsDrawnPerTaskCleaned ?? 0);
  };

  const automationAmount = (power: number) =>
    power * (run.tools.includes("cron-upgrade") ? 2 : 1) +
    (power > 0 && run.tools.includes("platypus") ? 1 : 0);
  const triggerAutomationWork = (taskId: string, discipline: Discipline, attempted: number) => {
    const taskIndex = tasks.findIndex((task) => task.taskId === taskId);
    const task = tasks[taskIndex];
    if (!task || task.status === "shipped" || attempted <= 0) return;
    const requirementIndex = task.requirements.findIndex(
      (requirement) => requirement.discipline === discipline,
    );
    const requirement = task.requirements[requirementIndex];
    if (!requirement) return;
    const remaining = remainingWork(requirement);
    const applied = Math.min(attempted, remaining);
    automationWorkGained += applied;
    const completed = remaining > 0 && applied === remaining;
    const updated = refreshTaskStatus({
      ...task,
      requirements: task.requirements.map((candidate, index) =>
        index === requirementIndex
          ? { ...candidate, verified: candidate.verified + applied }
          : candidate,
      ),
    });
    tasks = tasks.map((candidate, index) => (index === taskIndex ? updated : candidate));
    applyMattReview(taskId, Math.max(0, attempted - applied));
    if (completed && run.squad.includes("irene")) {
      cardsDrawn += 1;
      markPassive("irene");
    }
    if (completed && discipline === "frontend" && run.squad.includes("seb")) {
      markPassive("seb");
      for (const candidate of tasks) {
        if (candidate.taskId !== taskId) {
          queue.push({ taskId: candidate.taskId, amount: 1, source: "shared-components" });
        }
      }
    }
  };

  const targetTaskId = resolution.taskId;
  const targetDiscipline =
    resolution.kind === "tactic"
      ? resolution.targetDiscipline
      : resolution.kind === "work"
        ? resolution.discipline
        : undefined;

  if (card.automation?.kind === "install") {
    guardPower += card.automation.blockPower ?? 0;
  }
  if (card.doubleTargetAutomationMeters) {
    guardPower *= 2;
  }

  if (targetTaskId && targetDiscipline) {
    const taskIndex = tasks.findIndex((task) => task.taskId === targetTaskId);
    const task = tasks[taskIndex];
    const requirementIndex = task?.requirements.findIndex(
      (requirement) => requirement.discipline === targetDiscipline,
    );
    const requirement =
      task && requirementIndex !== undefined && requirementIndex >= 0
        ? task.requirements[requirementIndex]
        : undefined;
    if (task && requirement && requirementIndex !== undefined) {
      let scriptPower = requirement.scriptPower;
      if (resolution.kind === "tactic" && card.automation?.kind === "install") {
        scriptPower += card.automation.power;
      }
      if (card.doubleTargetAutomationMeters) {
        scriptPower *= 2;
      }
      if (scriptPower !== requirement.scriptPower) {
        tasks = tasks.map((candidate, index) =>
          index === taskIndex
            ? {
                ...candidate,
                requirements: candidate.requirements.map((item, index) =>
                  index === requirementIndex ? { ...item, scriptPower } : item,
                ),
              }
            : candidate,
        );
      }
      if (
        resolution.kind === "tactic" &&
        card.automation?.kind === "install" &&
        card.automation.power > 0 &&
        run.tools.includes("ci-runner")
      ) {
        triggerAutomationWork(
          targetTaskId,
          targetDiscipline,
          automationAmount(card.automation.power),
        );
      }
      const trigger = card.triggerTargetAutomation;
      for (let iteration = 0; iteration < (trigger?.times ?? 0); iteration += 1) {
        if (trigger?.script)
          triggerAutomationWork(targetTaskId, targetDiscipline, automationAmount(scriptPower));
      }
      for (const meter of card.triggerAutomationAfterInstall ?? []) {
        if (meter === "script") {
          triggerAutomationWork(targetTaskId, targetDiscipline, automationAmount(scriptPower));
        }
      }
    }
  }

  if (card.triggerTargetAutomation?.guard) {
    blockGained += automationAmount(guardPower) * Math.max(0, card.triggerTargetAutomation.times);
  }
  if (card.triggerAutomationAfterInstall?.includes("guard")) {
    blockGained += automationAmount(guardPower);
  }

  if (card.triggerAllTaskGuardsAfterWork && resolution.taskId) {
    blockGained += automationAmount(guardPower);
  }

  if (card.scriptPowerPerIncompleteRequirement && card.id === "golden-path") {
    for (const task of tasks) {
      if (task.status === "shipped") continue;
      for (const requirement of task.requirements) {
        if (remainingWork(requirement) <= 0) continue;
        tasks = tasks.map((candidate) =>
          candidate.taskId === task.taskId
            ? {
                ...candidate,
                requirements: candidate.requirements.map((item) =>
                  item.discipline === requirement.discipline
                    ? {
                        ...item,
                        scriptPower: item.scriptPower + card.scriptPowerPerIncompleteRequirement!,
                      }
                    : item,
                ),
              }
            : candidate,
        );
        if (run.tools.includes("ci-runner")) {
          triggerAutomationWork(
            task.taskId,
            requirement.discipline,
            automationAmount(card.scriptPowerPerIncompleteRequirement),
          );
        }
      }
    }
  }

  if (run.squad.includes("steph")) {
    for (const task of tasks) {
      const before = run.cycle?.tasks.find((candidate) => candidate.taskId === task.taskId);
      for (const requirement of task.requirements) {
        const previous = before?.requirements.find(
          (candidate) => candidate.discipline === requirement.discipline,
        );
        if (!previous) continue;
        focusGained += Number(requirement.scriptPower > previous.scriptPower);
      }
    }
    focusGained += Number(guardPower > guardPowerBefore);
    if (focusGained > 0) markPassive("steph");
  }

  if (automationWorkGained > 0) labels.push(`Automation · Work ${automationWorkGained}`);
  if (blockGained > 0 && (card.triggerTargetAutomation || card.triggerAutomationAfterInstall)) {
    labels.push(`Automation · Block ${blockGained}`);
  }
  if (focusGained > 0) labels.push(`Paved Road · Focus +${focusGained}`);

  if (resolution.kind === "work" && resolution.workKind === "verified") {
    applyMattReview(
      resolution.taskId,
      resolution.overflow,
      Boolean(card.finishingTouchesEveryTask),
    );
    if (
      run.squad.includes("seb") &&
      resolution.discipline === "frontend" &&
      resolution.requirementCompleted
    ) {
      markPassive("seb");
      const triggers = 1 + (card.extraSharedComponentsOnCompletion ?? 0);
      for (let trigger = 0; trigger < triggers; trigger += 1) {
        for (const task of tasks) {
          if (task.taskId !== resolution.taskId) {
            queue.push({ taskId: task.taskId, amount: 1, source: "shared-components" });
          }
        }
      }
    }
  }

  for (const hit of resolution.verifiedWorkHits) {
    const beforeTask = run.cycle?.tasks.find((task) => task.taskId === hit.taskId);
    const beforeRequirement = beforeTask?.requirements.find(
      (requirement) => requirement.discipline === hit.discipline,
    );
    if (!beforeRequirement) continue;
    const beforeRemaining = remainingWork(beforeRequirement);
    const attempted =
      card.spilloverVerifiedOnCompletion && resolution.kind === "work"
        ? card.spilloverVerifiedOnCompletion
        : hit.amount;
    applyMattReview(hit.taskId, Math.max(0, attempted - hit.amount));
    if (
      run.squad.includes("seb") &&
      hit.discipline === "frontend" &&
      beforeRemaining > 0 &&
      hit.amount >= beforeRemaining
    ) {
      markPassive("seb");
      for (const task of tasks) {
        if (task.taskId !== hit.taskId) {
          queue.push({ taskId: task.taskId, amount: 1, source: "shared-components" });
        }
      }
    }
  }

  const sourceTaskId = resolution.taskId;
  if (card.frontendSpreadToOtherTasks && sourceTaskId) {
    for (const task of tasks) {
      if (task.taskId !== sourceTaskId) {
        queue.push({
          taskId: task.taskId,
          amount: card.frontendSpreadToOtherTasks,
          source: "spread",
        });
      }
    }
  }
  if (card.frontendWorkToEveryTask) {
    for (const task of tasks) {
      queue.push({ taskId: task.taskId, amount: card.frontendWorkToEveryTask, source: "spread" });
    }
  }
  if (card.frontendSpreadIfTaskClean && sourceTaskId) {
    const source = tasks.find((task) => task.taskId === sourceTaskId);
    if (source && taskUnverifiedWork(source) === 0) {
      for (const task of tasks) {
        if (task.taskId !== sourceTaskId) {
          queue.push({
            taskId: task.taskId,
            amount: card.frontendSpreadIfTaskClean,
            source: "spread",
          });
        }
      }
    }
  }

  if (card.scriptPowerOnEveryIncompleteFrontend) {
    for (const task of tasks) {
      if (task.status === "shipped") continue;
      const requirement = task.requirements.find(
        (candidate) => candidate.discipline === "frontend" && remainingWork(candidate) > 0,
      );
      if (!requirement) continue;
      const power = requirement.scriptPower + card.scriptPowerOnEveryIncompleteFrontend;
      tasks = tasks.map((candidate) =>
        candidate.taskId === task.taskId
          ? {
              ...candidate,
              requirements: candidate.requirements.map((item) =>
                item === requirement ? { ...item, scriptPower: power } : item,
              ),
            }
          : candidate,
      );
      if (card.triggerInstalledScripts) {
        const multiplier = run.tools.includes("cron-upgrade") ? 2 : 1;
        const bonus = run.tools.includes("platypus") ? 1 : 0;
        queue.push({ taskId: task.taskId, amount: power * multiplier + bonus, source: "script" });
      }
    }
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const packet = queue[cursor];
    if (!packet) continue;
    const taskIndex = tasks.findIndex((task) => task.taskId === packet.taskId);
    const task = tasks[taskIndex];
    if (!task || task.status === "shipped") continue;
    const target = task.requirements
      .map((requirement, index) => ({ requirement, index, remaining: remainingWork(requirement) }))
      .filter(
        ({ requirement, remaining }) => requirement.discipline === "frontend" && remaining > 0,
      )
      .sort((left, right) => left.remaining - right.remaining || left.index - right.index)[0];
    if (!target) continue;
    const applied = Math.min(packet.amount, target.remaining);
    const completed = applied === target.remaining;
    const updated = refreshTaskStatus({
      ...task,
      requirements: task.requirements.map((requirement, index) =>
        index === target.index
          ? { ...requirement, verified: requirement.verified + applied }
          : requirement,
      ),
    });
    tasks = tasks.map((candidate, index) => (index === taskIndex ? updated : candidate));
    applyMattReview(task.taskId, Math.max(0, packet.amount - applied));
    if (completed && run.squad.includes("seb")) {
      markPassive("seb");
      for (const candidate of tasks) {
        if (candidate.taskId !== task.taskId) {
          queue.push({
            taskId: candidate.taskId,
            amount: 1,
            source: "shared-components",
          });
        }
      }
    }
  }

  const appliedPackets = queue.length;
  if (appliedPackets > 0) labels.push(`Frontend spread · ${appliedPackets} packets`);
  return {
    tasks,
    cardsDrawn,
    blockGained,
    guardPower,
    focusGained,
    triggeredPassiveIds,
    labels,
  };
}

function applyVerifiedWorkHits(
  task: TaskState,
  hits: readonly { taskId: string; discipline: Discipline; amount: number }[],
): TaskState {
  const taskHits = hits.filter((hit) => hit.taskId === task.taskId);
  if (taskHits.length === 0) return task;
  return refreshTaskStatus({
    ...task,
    requirements: task.requirements.map((requirement) => {
      const amount = taskHits
        .filter((hit) => hit.discipline === requirement.discipline)
        .reduce((total, hit) => total + hit.amount, 0);
      return amount > 0
        ? {
            ...requirement,
            verified: requirement.verified + Math.min(amount, remainingWork(requirement)),
          }
        : requirement;
    }),
  });
}

function verifyTask(task: TaskState, amount: number): TaskState {
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

  return refreshTaskStatus({ ...task, requirements });
}

export function createCycleReport(
  cycle: CycleState,
  outcome: CycleReport["outcome"],
  moraleDelta: number,
  creditsGained: number,
  techDebtAdded: number,
  toolReward = false,
  scheduleBonusCredits = 0,
): CycleReport {
  const definition = getEncounterCycleDefinition(cycle);
  return {
    nodeId: cycle.nodeId,
    cycleName: definition.name,
    outcome,
    day: cycle.day,
    tasks: cycle.tasks.map((task) => {
      const taskDefinition = definition.tasks.find((candidate) => candidate.id === task.taskId);
      return {
        taskId: task.taskId,
        name: task.name ?? taskDefinition?.name ?? task.taskId,
        completed: task.status === "shipped",
        cleared:
          toolReward &&
          (task.role ?? taskDefinition?.role) === "complication" &&
          task.status !== "shipped",
        verifiedWork: task.requirements.reduce((sum, requirement) => sum + requirement.verified, 0),
        unverifiedWork: taskUnverifiedWork(task),
      };
    }),
    shippedProgress: totalWork(cycle),
    unverifiedProgress: totalUnverifiedWork(cycle),
    defects: cycle.defects,
    moraleDelta,
    creditsGained,
    daysAhead: outcome === "shipped" ? Math.max(0, definition.maxDays - cycle.day) : 0,
    scheduleBonusCredits,
    techDebtAdded,
    toolReward,
    resolvedIntents: cycle.resolvedIntents,
    cardsPlayed: cycle.cardsPlayedThisCycle,
    generatedCardsPlayed: cycle.generatedCardsPlayedThisCycle,
    cardsExhausted: cycle.cardsExhaustedThisCycle,
    peakChain: cycle.peakChain,
  };
}
