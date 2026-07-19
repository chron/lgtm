import { disciplineLabel, getCard, getCycle } from "../domain/content";
import type {
  CardDefinition,
  CardInstance,
  CardTag,
  CycleReport,
  CycleState,
  DeveloperId,
  Discipline,
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

export type CardTarget = TaskCardTarget | SquadCardTarget | DisciplineCardTarget;

interface ResolvedCardBase {
  legal: true;
  cost: number;
  blockGained: number;
  techDebtAdded: number;
  cardsDrawn: number;
  nextDayCardsDrawn: number;
  focusGained: number;
  generatedCardIds: string[];
  discardedCardInstanceIds: string[];
  queuedDistractions: number;
  cycleWorkBonus?: { tag: CardTag; amount: number };
  dayWorkBonus?: { amount: number; excludedTags: readonly CardTag[] };
  dayReviewStunFocusAdded: number;
  fullStackAdded: number;
  triggeredPassiveIds: DeveloperId[];
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
      scriptBlockAdded: number;
      scriptInstallRunAmount: number;
      scriptTriggerRunAmount: number;
      scriptRunAmount: number;
      pitchedIn: boolean;
      countsAsWorkPlay: boolean;
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
      stun: boolean;
      sideQuestDiscipline?: Discipline;
    })
  | { legal: false; reason: string };

const disciplineOrder: readonly Discipline[] = ["frontend", "backend", "infra"];

export function requirementProgress(requirement: RequirementState): number {
  return requirement.verified + requirement.unverified;
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
  const primaryTaskId = getCycle(cycle.cycleId).primaryTaskId;
  if (primaryTaskId) {
    const primaryShipped = cycle.tasks.some(
      (task) => task.taskId === primaryTaskId && task.status === "shipped",
    );
    const sideQuestsShipped = cycle.tasks
      .filter((task) => task.role === "side-quest")
      .every((task) => task.status === "shipped");
    return primaryShipped && sideQuestsShipped;
  }
  return cycle.tasks.every((task) => task.status === "shipped");
}

export function refreshTaskStatus(task: TaskState): TaskState {
  if (task.status === "shipped") return task;
  const ready = task.requirements.every((requirement) => remainingWork(requirement) === 0);
  return { ...task, status: ready ? "ready" : "open" };
}

function taskUnverifiedWork(task: TaskState): number {
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
  const definition = getCycle(cycle.cycleId).tasks.find(
    (candidate) => candidate.id === task.taskId,
  );
  return definition?.intents[cycle.day - task.spawnedDay];
}

export function getCurrentIntent(cycle: CycleState, task: TaskState) {
  return task.stunned ? undefined : getScheduledIntent(cycle, task);
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

export function incomingMorale(cycle: CycleState): number {
  return cycle.tasks.reduce((total, task) => {
    const intent = getCurrentIntent(cycle, task);
    return total + (intent?.kind === "crunch" ? intent.moraleLoss : 0);
  }, 0);
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
    moraleLoss: defects,
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
  const mergeQueue = run.tools.includes("merge-queue");
  return {
    cardsDrawn: mergeQueue ? 2 : 0,
    focusGained: (paulTriggers ? 1 : 0) + (mergeQueue ? 1 : 0),
    paulTriggers,
  };
}

export function effectiveCardCost(
  card: CardDefinition,
  cycle: CycleState,
  _squad: readonly DeveloperId[],
): number {
  const blockedCost =
    card.discipline &&
    card.discipline !== "flexible" &&
    cycle.blockedDisciplines.includes(card.discipline)
      ? 1
      : 0;

  return card.cost + blockedCost;
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

  const cost = effectiveCardCost(card, cycle, run.squad);
  if (cost > cycle.focus) return { legal: false, reason: "Not enough Focus." };

  const generatedCardIds = card.generatedCards
    ? Array.from({ length: card.generatedCards.count }, () => card.generatedCards?.cardId ?? "")
    : [];
  const tacticBlock = (card.block ?? 0) + (card.blockPerCardPlayed ?? 0) * cycle.cardsPlayedThisDay;
  const tacticBase: Omit<ResolvedCardBase, "label"> = {
    legal: true,
    cost,
    blockGained: tacticBlock,
    techDebtAdded: card.techDebtAdded ?? 0,
    cardsDrawn: card.cardsDrawn ?? 0,
    nextDayCardsDrawn: card.nextDayCardsDrawn ?? 0,
    focusGained: card.focusGained ?? 0,
    generatedCardIds,
    discardedCardInstanceIds: card.discardedHandTags
      ? cycle.hand
          .filter(
            (candidate) =>
              candidate.instanceId !== instance.instanceId &&
              card.discardedHandTags?.some((tag) => getCard(candidate.cardId).tags.includes(tag)),
          )
          .map((candidate) => candidate.instanceId)
      : [],
    queuedDistractions: card.queuedDistractions ?? 0,
    cycleWorkBonus: card.cycleWorkBonus,
    dayWorkBonus: card.dayWorkBonus
      ? { amount: card.dayWorkBonus.amount, excludedTags: card.dayWorkBonus.excludedTags ?? [] }
      : undefined,
    dayReviewStunFocusAdded: card.dayReviewStunFocusBonus ?? 0,
    fullStackAdded: card.fullStackAdded ?? 0,
    triggeredPassiveIds: [],
  };

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

  if (card.kind === "tactic" && !card.stun) {
    if (target.kind !== "squad") {
      return { legal: false, reason: "Aim this at the squad." };
    }
    const label = [
      card.fullStackAdded ? `Full Stack +${card.fullStackAdded}` : undefined,
      generatedCardIds.length ? `Generate ${generatedCardIds.length}` : undefined,
      tacticBlock ? `Block ${tacticBlock}` : undefined,
      card.focusGained ? `Focus +${card.focusGained}` : undefined,
      card.cardsDrawn ? `Draw ${card.cardsDrawn}` : undefined,
      card.nextDayCardsDrawn ? `Next Day · Draw +${card.nextDayCardsDrawn}` : undefined,
      card.queuedDistractions ? `Next Day · ${card.queuedDistractions} Distractions` : undefined,
      card.techDebtAdded ? `Debt +${card.techDebtAdded}` : undefined,
      card.cycleWorkBonus
        ? `${card.cycleWorkBonus.tag === "ai-assisted" ? "AI Assisted" : card.cycleWorkBonus.tag} Work +${card.cycleWorkBonus.amount}`
        : undefined,
      card.dayReviewStunFocusBonus
        ? `Review Stun · Focus +${card.dayReviewStunFocusBonus}`
        : undefined,
      card.discardedHandTags
        ? `Discard ${tacticBase.discardedCardInstanceIds.length} ${card.discardedHandTags.map((tag) => (tag === "ai-assisted" ? "AI Assisted" : tag)).join("/")}`
        : undefined,
      card.dayWorkBonus ? `Eligible Work +${card.dayWorkBonus.amount} this Day` : undefined,
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

  let triggeredPassiveIds: DeveloperId[] = [];

  if (card.kind === "review") {
    if (
      card.reviewEveryTask
        ? target.kind !== "squad"
        : target.kind !== undefined && target.kind !== "task"
    ) {
      return {
        legal: false,
        reason: card.reviewEveryTask ? "Aim this at the squad." : "Choose a Task.",
      };
    }
    const targetTasks = card.reviewEveryTask
      ? cycle.tasks.filter((task) => task.status !== "shipped" && taskUnverifiedWork(task) > 0)
      : cycle.tasks.filter(
          (task) =>
            target.kind !== "squad" &&
            target.kind !== "discipline" &&
            task.taskId === target.taskId &&
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
    const scriptMultiplier = run.tools.includes("cron-upgrade") ? 2 : 1;
    const reviews = targetTasks.map((task) => {
      const amount = Math.min(taskUnverifiedWork(task), card.amount);
      const reviewedTask = verifyTask(task, amount);
      return {
        taskId: task.taskId,
        amount,
        stun:
          run.squad.includes("odin") && !task.stunned && Boolean(getScheduledIntent(cycle, task)),
        scriptInstallations: reviewedTask.requirements
          .filter((requirement) => scriptPower > 0 && remainingWork(requirement) > 0)
          .map((requirement) => ({
            discipline: requirement.discipline,
            powerAdded: scriptPower,
            runAmount: run.tools.includes("ci-runner")
              ? Math.min(scriptPower * scriptMultiplier, remainingWork(requirement))
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
    const blockGained = (card.block ?? 0) + (run.tools.includes("test-suite") ? amount : 0);
    const cardsDrawn =
      (card.cardsDrawn ?? 0) +
      passiveCardsDrawn +
      reviewStuns * (card.cardsDrawnPerReviewStun ?? 0);
    const focusGained = (card.focusGained ?? 0) + reviewStuns * cycle.reviewStunFocusBonus;
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
          ? `Verify ${card.amount} · ${reviews.length} ${reviews.length === 1 ? "Task" : "Tasks"}`
          : `Verify ${amount}`,
        scriptInstallations.length > 0
          ? `Script +${scriptPower} · ${scriptInstallations.length} ${scriptInstallations.length === 1 ? "bar" : "bars"}`
          : undefined,
        scriptInstallations.reduce((total, installation) => total + installation.runAmount, 0) > 0
          ? `Run +${scriptInstallations.reduce((total, installation) => total + installation.runAmount, 0)}`
          : undefined,
        reviewStuns > 0 ? (card.reviewEveryTask ? `Stun ${reviewStuns}` : "Stun") : undefined,
        blockGained ? `Block ${blockGained}` : undefined,
        focusGained ? `Focus +${focusGained}` : undefined,
        cardsDrawn ? `Draw ${cardsDrawn}` : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (target.kind === "squad" || target.kind === "discipline") {
    return { legal: false, reason: "Choose a Task." };
  }

  const task = cycle.tasks.find((candidate) => candidate.taskId === target.taskId);
  if (!task) return { legal: false, reason: "Choose a Task." };
  if (task.status === "shipped") {
    return { legal: false, reason: "This Task has already shipped." };
  }

  if (card.kind === "tactic") {
    if (card.stun && task.stunned) {
      return { legal: false, reason: "This intent is already Stunned." };
    }
    if (card.stun && !getScheduledIntent(cycle, task)) {
      return { legal: false, reason: "This Task has no intent to Stun." };
    }
    return {
      ...tacticBase,
      kind: "tactic",
      taskId: task.taskId,
      stun: card.stun ?? false,
      triggeredPassiveIds,
      label: [card.stun ? "Stun" : undefined, card.block ? `Block ${card.block}` : undefined]
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

  if (card.automation?.kind === "trigger" && requirement.scriptPower === 0) {
    return { legal: false, reason: "Install a Script here first." };
  }

  const pitchedIn = card.discipline !== "flexible" && card.discipline !== target.discipline;
  const pairedPitchIn = pitchedIn && run.tools.includes("pairing-session");
  const workKind: WorkKind =
    pitchedIn && !pairedPitchIn ? "unverified" : (card.workKind ?? "verified");
  const scriptMultiplier = run.tools.includes("cron-upgrade") ? 2 : 1;
  const countsAsWorkPlay = card.amount > 0 && card.automation?.kind !== "trigger";
  let amount =
    card.automation?.kind === "trigger"
      ? requirement.scriptPower * scriptMultiplier
      : pitchedIn
        ? 1
        : card.amount;

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
  amount = Math.min(amount, workRemaining);
  const madiScript = aiAssisted && run.squad.includes("madi") ? 1 : 0;
  if (madiScript) {
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "madi");
  }
  const scriptPowerAdded =
    (card.automation?.kind === "install" ? card.automation.power : 0) + madiScript;
  const scriptBlockAdded =
    card.automation?.kind === "install" ? (card.automation.blockPower ?? 0) : 0;
  const remainingAfterWork = Math.max(0, remainingWork(requirement) - amount);
  const scriptInstallRunAmount =
    scriptPowerAdded > 0 && run.tools.includes("ci-runner")
      ? Math.min(scriptPowerAdded * scriptMultiplier, remainingAfterWork)
      : 0;
  const remainingAfterInstallRun = Math.max(0, remainingAfterWork - scriptInstallRunAmount);
  const scriptTriggerRunAmount = card.triggerTargetScriptAfterWork
    ? Math.min(
        (requirement.scriptPower + scriptPowerAdded) * scriptMultiplier,
        remainingAfterInstallRun,
      )
    : 0;
  const scriptRunAmount = scriptInstallRunAmount + scriptTriggerRunAmount;
  const blockGained = card.block ?? 0;
  const verifiedCompletion = requirementCompletedByVerifiedWork(
    requirement,
    (workKind === "verified" ? amount : 0) + scriptRunAmount,
    workKind === "unverified" ? amount : 0,
  );
  const passiveCardsDrawn = verifiedCompletion && run.squad.includes("irene") ? 1 : 0;
  if (passiveCardsDrawn) {
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "irene");
  }
  const cardsDrawn = passiveCardsDrawn + (card.cardsDrawn ?? 0);
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
            scriptInstallRunAmount > 0 ? `Run +${scriptInstallRunAmount}` : undefined,
            scriptTriggerRunAmount > 0 ? `Trigger +${scriptTriggerRunAmount}` : undefined,
            scriptBlockAdded > 0 ? `Guard +${scriptBlockAdded}` : undefined,
            blockGained > 0 ? `Block ${blockGained}` : undefined,
            techDebtAdded > 0 ? `Debt +${techDebtAdded}` : undefined,
            cardsDrawn > 0 ? `Draw ${cardsDrawn}` : undefined,
          ]
            .filter(Boolean)
            .join(" · ")
        : [
            pitchedIn ? pitchLabel : `${disciplineLabel(target.discipline)} +${amount} ${workKind}`,
            blockGained > 0 ? `Block ${blockGained}` : undefined,
            techDebtAdded > 0 ? `Debt +${techDebtAdded}` : undefined,
            scriptPowerAdded > 0 ? `Script +${scriptPowerAdded}` : undefined,
            scriptInstallRunAmount > 0 ? `Run +${scriptInstallRunAmount}` : undefined,
            scriptTriggerRunAmount > 0 ? `Trigger +${scriptTriggerRunAmount}` : undefined,
            cardsDrawn > 0 ? `Draw ${cardsDrawn}` : undefined,
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
    scriptBlockAdded,
    scriptInstallRunAmount,
    scriptTriggerRunAmount,
    scriptRunAmount,
    techDebtAdded,
    cardsDrawn,
    pitchedIn,
    countsAsWorkPlay,
    triggeredPassiveIds,
    label,
  };
}

export function applyCardResolutionToTask(
  task: TaskState,
  resolution: Exclude<CardResolution, { legal: false }>,
): TaskState {
  if (resolution.kind === "review") {
    const review = resolution.reviews.find((candidate) => candidate.taskId === task.taskId);
    if (!review) return task;
    const reviewedTask = verifyTask(task, review.amount);
    return refreshTaskStatus({
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
    });
  }

  if (resolution.kind === "tactic") {
    return { ...task, stunned: resolution.stun || task.stunned };
  }

  return refreshTaskStatus({
    ...task,
    requirements: task.requirements.map((requirement) =>
      requirement.discipline !== resolution.discipline
        ? requirement
        : {
            ...requirement,
            verified:
              requirement.verified +
              (resolution.workKind === "verified" ? resolution.amount : 0) +
              resolution.scriptRunAmount,
            unverified:
              requirement.unverified +
              (resolution.workKind === "unverified" ? resolution.amount : 0),
            scriptPower: requirement.scriptPower + resolution.scriptPowerAdded,
            scriptBlock: requirement.scriptBlock + resolution.scriptBlockAdded,
          },
    ),
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
): CycleReport {
  const definition = getCycle(cycle.cycleId);
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
    techDebtAdded,
    toolReward,
    resolvedIntents: cycle.resolvedIntents,
  };
}
