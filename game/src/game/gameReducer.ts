import {
  eligibleRewardCardIds,
  formatIntent,
  getCard,
  getCardForInstance,
  getCycle,
  getDeveloper,
  getMapNodeCycleId,
  isMapNodeAvailable,
  mapNodes,
  squadRewardCardIds,
  standardToolIds,
  starterBasicCardIds,
  teamRewardCardIds,
} from "../domain/content";
import { getEvent } from "../domain/events";
import {
  canDuplicateCard,
  canRefactorCard,
  createShopInventory,
  shopRefreshPrice,
  shopServicePrices,
  type ShopInventoryState,
  type ShopServiceId,
} from "../domain/shop";
import {
  getWeekendChoiceState,
  weekendRestAmount,
  weekendSideGigCredits,
  weekendSideGigMoraleCost,
  type WeekendChoiceId,
} from "../domain/weekend";
import {
  getBossDefinition,
  getEncounterCycleDefinition,
  selectBossDefinition,
} from "../domain/bosses";
import type {
  CardInstance,
  CycleReport,
  CycleState,
  CycleDefinition,
  DeveloperId,
  Discipline,
  RunState,
  TaskDefinition,
  TaskState,
  ToolId,
} from "../domain/models";
import {
  acknowledgeBossTransition,
  createBossEncounter,
  getBossLaunchPreview,
  reconcileBossEncounter,
  resolveOpeningBossEffects,
} from "./bossEngine";
import {
  applyCardResolutionToTask,
  absorbMoraleDamage,
  createCycleReport,
  getCurrentIntent,
  getScheduledIntent,
  isCycleShipped,
  isGeneratedCardInstance,
  requirementCompletedByVerifiedWork,
  refreshTaskStatus,
  resolveCardTarget,
  taskShippingPreview,
  taskShippingRewards,
} from "./rules";
import type { CardTarget } from "./rules";
import { selectEventDefinition } from "./eventSelection";
import {
  advanceEventResolution,
  continueEventResolution,
  effectiveMapEdges,
  reconcileTechDebt,
  resolveEventChoice,
  type EventPendingSelection,
} from "./eventResolution";
import { normalizeSeed, sampleOne } from "./random";

type Screen =
  | { name: "title" }
  | { name: "squad" }
  | { name: "map" }
  | { name: "cycle"; nodeId: string; cycleId: string }
  | { name: "report"; report: CycleReport }
  | { name: "reward" }
  | { name: "tool-reward" }
  | {
      name: "event";
      nodeId: string;
      eventId: string;
      resolution?: {
        choiceId: string;
        effectIndex: number;
        outcome: readonly string[];
        pending: EventPendingSelection;
      };
    }
  | { name: "shop"; nodeId: string; inventory: ShopInventoryState }
  | { name: "weekend"; nodeId: string }
  | {
      name: "retro";
      outcome: "victory" | "defeat";
      cause?: "morale" | "final-release" | "technically-shipped";
    };

export interface GameState {
  screen: Screen;
  run: RunState | null;
}

export type GameAction =
  | { type: "START_RUN"; seed?: number }
  | { type: "TOGGLE_DEVELOPER"; developerId: DeveloperId }
  | { type: "CONFIRM_SQUAD" }
  | { type: "VISIT_NODE"; nodeId: string }
  | {
      type: "PLAY_CARD";
      instanceId: string;
      target: CardTarget;
    }
  | { type: "CHOOSE_CYCLE_CARD"; instanceId: string }
  | { type: "END_DAY" }
  | { type: "ACKNOWLEDGE_BOSS_TRANSITION" }
  | { type: "LAUNCH_FINAL_RELEASE" }
  | { type: "SHIP_TASK"; taskId: string }
  | { type: "CONTINUE_REPORT" }
  | { type: "CHOOSE_CARD_REWARD"; cardId: string }
  | { type: "SKIP_CARD_REWARD" }
  | { type: "OFFER_TOOL_REWARD"; sourceNodeId: string }
  | { type: "CHOOSE_TOOL_REWARD"; toolId: ToolId }
  | { type: "CHOOSE_EVENT"; choiceId: string }
  | { type: "CHOOSE_EVENT_OPTION"; optionId: string }
  | { type: "BUY_SHOP_CARD"; offerId: string }
  | { type: "BUY_SHOP_TOOL"; offerId: string }
  | {
      type: "BUY_SHOP_SERVICE";
      serviceId: ShopServiceId;
      instanceId?: string;
    }
  | { type: "REFRESH_SHOP" }
  | { type: "CHOOSE_WEEKEND"; choiceId: WeekendChoiceId; instanceId?: string }
  | { type: "LEAVE_NODE" }
  | { type: "RETURN_TITLE" };

export const initialGameState: GameState = {
  screen: { name: "title" },
  run: null,
};

function createRun(seed = 0x5eed1234): RunState {
  const normalizedSeed = normalizeSeed(seed);
  const boss = selectBossDefinition(normalizedSeed);
  return {
    seed: normalizedSeed,
    rngState: normalizedSeed,
    squad: [],
    deck: [],
    nextCardInstanceId: 1,
    tools: [],
    morale: 10,
    maxMorale: 10,
    techDebt: 0,
    credits: 40,
    currentNodeId: null,
    completedNodeIds: [],
    cycle: null,
    pendingCardReward: null,
    pendingToolReward: null,
    nextCycleModifiers: [],
    pendingBounties: [],
    nextRewardModifiers: [],
    mapModifiers: [],
    queuedBountyToolOffers: 0,
    history: [{ kind: "boss-selected", bossId: boss.id }],
    selectedBossId: boss.id,
  };
}

function createCardInstances(cardIds: readonly string[], startAt: number): CardInstance[] {
  return cardIds.map((cardId, index) => ({
    instanceId: `card-${startAt + index}`,
    cardId,
  }));
}

function createCardReward(run: RunState, sourceNodeId: string): RunState {
  let rngState = run.rngState;
  const squadPool = squadRewardCardIds.filter((cardId) => {
    const ownerId = getCard(cardId).ownerId;
    return ownerId ? run.squad.includes(ownerId) : false;
  });
  const squadPick = sampleOne(squadPool, rngState);
  rngState = squadPick.rngState;

  const teamPool = teamRewardCardIds.filter((cardId) => cardId !== squadPick.item);
  const teamPick = sampleOne(teamPool, rngState);
  rngState = teamPick.rngState;

  const wildcardPool = eligibleRewardCardIds(run.squad).filter(
    (cardId) => cardId !== squadPick.item && cardId !== teamPick.item,
  );
  const wildcardPick = sampleOne(wildcardPool, rngState);

  rngState = wildcardPick.rngState;
  const choiceCount = Math.max(
    3,
    ...run.nextRewardModifiers.map((modifier) => modifier.choiceCount ?? 3),
  );
  const tagsAny = run.nextRewardModifiers.flatMap((modifier) => modifier.tagsAny ?? []);
  const disciplines = run.nextRewardModifiers.flatMap((modifier) => modifier.disciplines ?? []);
  const hasThemeFilter = tagsAny.length > 0 || disciplines.length > 0;
  const cardIds = hasThemeFilter ? [] : [squadPick.item, teamPick.item, wildcardPick.item];
  const eligiblePool = eligibleRewardCardIds(run.squad).filter((cardId) => {
    const card = getCard(cardId);
    return (
      (!hasThemeFilter ||
        tagsAny.some((tag) => card.tags.includes(tag)) ||
        (card.discipline ? disciplines.includes(card.discipline) : false)) &&
      !cardIds.includes(cardId)
    );
  });
  while (cardIds.length < choiceCount && eligiblePool.some((cardId) => !cardIds.includes(cardId))) {
    const pick = sampleOne(
      eligiblePool.filter((cardId) => !cardIds.includes(cardId)),
      rngState,
    );
    cardIds.push(pick.item);
    rngState = pick.rngState;
  }

  if (
    run.nextRewardModifiers.some((modifier) => modifier.guaranteedRarity === "rare") &&
    !cardIds.some((cardId) => getCard(cardId).rarity === "rare")
  ) {
    const rarePool = eligibleRewardCardIds(run.squad).filter(
      (cardId) => getCard(cardId).rarity === "rare" && !cardIds.includes(cardId),
    );
    if (rarePool.length > 0) {
      const pick = sampleOne(rarePool, rngState);
      cardIds[cardIds.length - 1] = pick.item;
      rngState = pick.rngState;
    }
  }

  return {
    ...run,
    rngState,
    nextRewardModifiers: [],
    pendingCardReward: {
      sourceNodeId,
      cardIds,
    },
  };
}

function createToolReward(run: RunState, sourceNodeId: string): RunState {
  const remaining = standardToolIds.filter((toolId) => !run.tools.includes(toolId));
  if (remaining.length === 0) return run;

  let rngState = run.rngState;
  const picks: ToolId[] = [];
  for (let index = 0; index < Math.min(3, remaining.length); index += 1) {
    const pick = sampleOne(
      remaining.filter((toolId) => !picks.includes(toolId)),
      rngState,
    );
    picks.push(pick.item);
    rngState = pick.rngState;
  }

  return {
    ...run,
    rngState,
    pendingToolReward: {
      sourceNodeId,
      toolIds: picks,
    },
  };
}

function completeNode(run: RunState, nodeId: string): RunState {
  return {
    ...run,
    completedNodeIds: run.completedNodeIds.includes(nodeId)
      ? run.completedNodeIds
      : [...run.completedNodeIds, nodeId],
  };
}

function finishEventResolution(
  run: RunState,
  screen: Extract<Screen, { name: "event" }>,
  choiceId: string,
  outcome: readonly string[],
): GameState {
  const completedRun = completeNode(run, screen.nodeId);
  return {
    screen: { name: "map" },
    run: {
      ...completedRun,
      history: [
        ...completedRun.history,
        {
          kind: "event-resolved",
          nodeId: screen.nodeId,
          eventId: screen.eventId,
          choiceId,
          outcome,
        },
      ],
    },
  };
}

function drawCards(
  originalDrawPile: readonly CardInstance[],
  originalDiscardPile: readonly CardInstance[],
  count: number,
  replaceDistractions = false,
  statusDrawsExtra = false,
): {
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  drawn: CardInstance[];
} {
  let drawPile = [...originalDrawPile];
  let discardPile = [...originalDiscardPile];
  const drawn: CardInstance[] = [];
  let targetCount = count;

  while (drawn.length < targetCount) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile = [...discardPile];
      discardPile = [];
    }

    const next = drawPile.shift();
    if (!next) continue;
    if (replaceDistractions && next.cardId === "distraction") continue;
    drawn.push(next);
    if (statusDrawsExtra && getCardForInstance(next).kind === "status") targetCount += 1;
  }

  return { drawPile, discardPile, drawn };
}

function createTaskState(task: TaskDefinition, spawnedDay: number): TaskState {
  return {
    taskId: task.id,
    name: task.name,
    role: task.role,
    status: "open",
    stunned: false,
    spawnedDay,
    requirements: task.requirements.map((requirement) => ({
      ...requirement,
      verified: 0,
      unverified: 0,
      scriptPower: 0,
      scriptBlock: 0,
    })),
  };
}

const sideQuestNames = [
  "Dark Mode for Sharkimedes",
  "Emoji Picker",
  "Confetti Mode",
  "Slack Bot Upgrade",
  "Tiny Internal Tool",
] as const;

function createSideQuestState(cycle: CycleState, discipline: Discipline): TaskState {
  const index = cycle.sideQuestCounter;
  return {
    taskId: `side-quest-${index + 1}`,
    name: sideQuestNames[index % sideQuestNames.length],
    role: "side-quest",
    status: "open",
    stunned: false,
    spawnedDay: cycle.day,
    prototypeReward: 1,
    requirements: [
      {
        discipline,
        target: 3,
        verified: 0,
        unverified: 0,
        scriptPower: 0,
        scriptBlock: 0,
      },
    ],
  };
}

function createCycleState(
  run: RunState,
  nodeId: string,
  cycleId: string,
  definition: CycleDefinition = getCycle(cycleId),
): CycleState {
  const openingFocus = run.nextCycleModifiers
    .filter((modifier) => modifier.kind === "opening-focus")
    .reduce((total, modifier) => total + modifier.amount, 0);
  const openingDraw = run.nextCycleModifiers
    .filter((modifier) => modifier.kind === "opening-draw")
    .reduce((total, modifier) => total + modifier.amount, 0);
  const queuedStatuses = run.nextCycleModifiers.flatMap((modifier, modifierIndex) =>
    modifier.kind === "queued-status"
      ? Array.from({ length: modifier.count }, (_, index) => ({
          cardId: modifier.cardId,
          instanceId: `event-status-${modifierIndex + 1}-${index + 1}`,
          temporary: true,
        }))
      : [],
  );
  const guestCards = run.nextCycleModifiers.flatMap((modifier, index) =>
    modifier.kind === "temporary-guest"
      ? [{ cardId: modifier.cardId, instanceId: `event-guest-${index + 1}` }]
      : [],
  );
  const firstDraw = drawCards(
    [...queuedStatuses, ...guestCards, ...run.deck],
    [],
    5 + openingDraw,
    run.tools.includes("noise-cancelling-headphones"),
    run.tools.includes("cat-tax"),
  );
  const bountyTasks: TaskState[] = run.pendingBounties.map((bounty) => ({
    taskId: bounty.id,
    name: bounty.name,
    role: "bounty",
    status: "open",
    stunned: false,
    spawnedDay: 1,
    bountyReward: bounty.reward,
    requirements: bounty.requirements.map((requirement) => ({
      ...requirement,
      verified: 0,
      unverified: 0,
      scriptPower: 0,
      scriptBlock: 0,
    })),
  }));
  const intentProtections = run.nextCycleModifiers.reduce<CycleState["intentProtections"]>(
    (protections, modifier) =>
      modifier.kind === "intent-protection"
        ? {
            ...protections,
            [modifier.intentKind]: (protections[modifier.intentKind] ?? 0) + modifier.count,
          }
        : protections,
    {},
  );
  const cycle: CycleState = {
    nodeId,
    cycleId,
    startingMorale: run.morale,
    day: 1,
    focus: 3 + openingFocus,
    block: 0,
    tasks: [
      ...definition.tasks
        .filter((task) => task.role !== "complication")
        .map((task) => createTaskState(task, 1)),
      ...bountyTasks,
    ],
    drawPile: firstDraw.drawPile,
    hand: firstDraw.drawn,
    discardPile: firstDraw.discardPile,
    exhaustPile: [],
    blockedDisciplines: [],
    triggeredPassiveIds: [],
    resolvedIntents: [],
    temporaryCardCounter: 0,
    sideQuestCounter: 0,
    cardsPlayedThisDay: 0,
    cardsPlayedThisCycle: 0,
    generatedCardsPlayedThisDay: 0,
    generatedCardsPlayedThisCycle: 0,
    cardsExhaustedThisDay: 0,
    cardsExhaustedThisCycle: 0,
    chain: { count: 0, transfersBetweenTasks: false },
    peakChain: 0,
    prototypePower: 0,
    fullStackPower: 0,
    cardTagWorkBonuses: {},
    dayWorkBonuses: [],
    reviewStunFocusBonus: 0,
    queuedDistractions: 0,
    queuedCardsDrawn: 0,
    intentProtections,
    defects: 0,
    techDebtAdded: 0,
  };
  return cycle;
}

function addTechDebt(run: RunState, amount: number): RunState {
  return reconcileTechDebt(run, amount);
}

function finishCycle(
  run: RunState,
  cycle: CycleState,
  report: CycleReport,
  finalMorale: number,
  creditsGained: number,
): GameState {
  let nextRun: RunState = {
    ...completeNode(run, cycle.nodeId),
    morale: finalMorale,
    credits: run.credits + creditsGained,
    cycle: null,
    history: [
      ...run.history,
      {
        kind: "cycle-finished",
        nodeId: cycle.nodeId,
        outcome: report.outcome,
        day: report.day,
      },
    ],
  };

  if (finalMorale <= 0) {
    return {
      screen: {
        name: "retro",
        outcome: "defeat",
        cause: report.outcome === "shipped" ? "technically-shipped" : "morale",
      },
      run: nextRun,
    };
  }

  if (report.outcome === "shipped") {
    nextRun = createCardReward(nextRun, cycle.nodeId);
  }
  if (report.toolReward || nextRun.queuedBountyToolOffers > 0) {
    nextRun = createToolReward(
      { ...nextRun, queuedBountyToolOffers: Math.max(0, nextRun.queuedBountyToolOffers - 1) },
      cycle.nodeId,
    );
  }
  return { screen: { name: "report", report }, run: nextRun };
}

function completeShippedCycle(run: RunState, cycle: CycleState): GameState {
  const definition = getEncounterCycleDefinition(cycle);
  const creditsGained = 20 + (definition.maxDays - cycle.day) * 5;
  const moraleDelta = run.morale - cycle.startingMorale;
  const report = createCycleReport(
    cycle,
    "shipped",
    moraleDelta,
    creditsGained,
    cycle.techDebtAdded,
    definition.kind === "incident",
  );

  return finishCycle(run, cycle, report, run.morale, creditsGained);
}

function missCycle(run: RunState, cycle: CycleState): GameState {
  const incident = getEncounterCycleDefinition(cycle).kind === "incident";
  const finalMorale = run.morale - (incident ? 5 : 3);
  const missedDebt = incident ? 4 : 3;
  const missedCycle = { ...cycle, techDebtAdded: cycle.techDebtAdded + missedDebt };
  const penalizedRun = addTechDebt({ ...run, morale: finalMorale, cycle: missedCycle }, missedDebt);
  const report = createCycleReport(
    missedCycle,
    "missed",
    finalMorale - cycle.startingMorale,
    0,
    missedCycle.techDebtAdded,
  );
  return finishCycle(penalizedRun, missedCycle, report, finalMorale, 0);
}

function applyTaskShipping(
  run: RunState,
  cycle: CycleState,
  taskId: string,
): { run: RunState; cycle: CycleState } | undefined {
  const task = cycle.tasks.find((candidate) => candidate.taskId === taskId);
  if (!task || task.status !== "ready") return undefined;

  const preview = taskShippingPreview(task);
  const rewards = taskShippingRewards(run, taskId);
  const paulTriggers = rewards.paulTriggers;
  const nextDraw = drawCards(
    cycle.drawPile,
    cycle.discardPile,
    rewards.cardsDrawn,
    run.tools.includes("noise-cancelling-headphones"),
    run.tools.includes("cat-tax"),
  );
  const damage = absorbMoraleDamage(cycle.block, preview.moraleLoss);
  const nextCycle: CycleState = {
    ...cycle,
    tasks: cycle.tasks.map((candidate) =>
      candidate.taskId === taskId ? { ...candidate, status: "shipped" } : candidate,
    ),
    defects: cycle.defects + preview.defects,
    techDebtAdded: cycle.techDebtAdded + preview.techDebt,
    focus: cycle.focus + rewards.focusGained,
    prototypePower: cycle.prototypePower + (task.prototypeReward ?? 0),
    drawPile: nextDraw.drawPile,
    hand: [...cycle.hand, ...nextDraw.drawn],
    discardPile: nextDraw.discardPile,
    block: damage.block,
    triggeredPassiveIds:
      paulTriggers && !cycle.triggeredPassiveIds.includes("paul")
        ? [...cycle.triggeredPassiveIds, "paul"]
        : cycle.triggeredPassiveIds,
  };
  let nextRun: RunState = {
    ...run,
    morale: run.morale - damage.moraleLoss,
    cycle: nextCycle,
    history: [
      ...run.history,
      {
        kind: "task-shipped",
        nodeId: cycle.nodeId,
        taskId,
        unverifiedWork: preview.unverified,
        defects: preview.defects,
        moraleLoss: damage.moraleLoss,
        techDebtAdded: preview.techDebt,
        focusGained: rewards.focusGained,
      },
    ],
  };
  nextRun = addTechDebt(nextRun, preview.techDebt);
  if (task.bountyReward?.kind === "credits") {
    nextRun = { ...nextRun, credits: nextRun.credits + task.bountyReward.amount };
  } else if (task.bountyReward?.kind === "tool-offer") {
    nextRun = { ...nextRun, queuedBountyToolOffers: nextRun.queuedBountyToolOffers + 1 };
  } else if (task.bountyReward?.kind === "rare-card-offer") {
    nextRun = {
      ...nextRun,
      nextRewardModifiers: [...nextRun.nextRewardModifiers, { guaranteedRarity: "rare" }],
    };
  } else if (task.bountyReward?.kind === "credits-and-rare-card-offer") {
    nextRun = {
      ...nextRun,
      credits: nextRun.credits + task.bountyReward.amount,
      nextRewardModifiers: [...nextRun.nextRewardModifiers, { guaranteedRarity: "rare" }],
    };
  }
  return { run: nextRun, cycle: nextCycle };
}

function launchFinalRelease(run: RunState, cycle: CycleState): GameState | undefined {
  if (!cycle.boss) return undefined;
  const boss = getBossDefinition(cycle.boss.bossId);
  const preview = getBossLaunchPreview(run, cycle, boss);
  if (!preview.ready) return undefined;

  let launchedRun = run;
  let launchedCycle = cycle;
  for (const taskId of preview.taskIds) {
    const shipped = applyTaskShipping(launchedRun, launchedCycle, taskId);
    if (!shipped) return undefined;
    launchedRun = shipped.run;
    launchedCycle = shipped.cycle;
  }

  const completedRun = completeNode(launchedRun, cycle.nodeId);
  const finalRun: RunState = {
    ...completedRun,
    cycle: null,
    pendingCardReward: null,
    pendingToolReward: null,
    history: [
      ...completedRun.history,
      {
        kind: "final-release-launched",
        bossId: boss.id,
        day: cycle.day,
        unverifiedWork: preview.unverifiedWork,
        defects: preview.defects,
        moraleLoss: preview.moraleLoss,
        outcome: preview.outcome,
      },
      {
        kind: "cycle-finished",
        nodeId: cycle.nodeId,
        outcome: "shipped",
        day: cycle.day,
      },
    ],
  };

  return {
    screen:
      preview.outcome === "clean" || preview.outcome === "known-issues"
        ? { name: "retro", outcome: "victory" }
        : {
            name: "retro",
            outcome: "defeat",
            cause: preview.outcome === "technically-shipped" ? "technically-shipped" : "morale",
          },
    run: finalRun,
  };
}

function runScripts(
  tasks: readonly TaskState[],
  multiplier: number,
  triggerBonus: number,
): { tasks: TaskState[]; block: number; verifiedCompletions: number } {
  let block = 0;
  let verifiedCompletions = 0;
  const nextTasks = tasks.map((task) => {
    if (task.status === "shipped") return task;
    block += task.requirements.reduce(
      (sum, requirement) =>
        sum +
        requirement.scriptBlock * multiplier +
        (requirement.scriptBlock > 0 ? triggerBonus : 0),
      0,
    );
    return refreshTaskStatus({
      ...task,
      requirements: task.requirements.map((requirement) => {
        const remaining = Math.max(
          0,
          requirement.target - requirement.verified - requirement.unverified,
        );
        const verifiedAdded = Math.min(
          requirement.scriptPower * multiplier + (requirement.scriptPower > 0 ? triggerBonus : 0),
          remaining,
        );
        if (requirementCompletedByVerifiedWork(requirement, verifiedAdded)) {
          verifiedCompletions += 1;
        }
        return {
          ...requirement,
          verified: requirement.verified + verifiedAdded,
        };
      }),
    });
  });
  return { tasks: nextTasks, block, verifiedCompletions };
}

function taskShippingDefeat(run: RunState): GameState {
  return {
    screen: { name: "retro", outcome: "defeat", cause: "technically-shipped" },
    run: { ...run, cycle: null },
  };
}

function removeRegressionWork(task: TaskState, discipline: Discipline, amount: number): TaskState {
  return {
    ...task,
    requirements: task.requirements.map((requirement) => {
      if (requirement.discipline !== discipline) return requirement;
      const unverifiedLoss = Math.min(requirement.unverified, amount);
      const verifiedLoss = Math.min(requirement.verified, amount - unverifiedLoss);
      return {
        ...requirement,
        unverified: requirement.unverified - unverifiedLoss,
        verified: requirement.verified - verifiedLoss,
      };
    }),
  };
}

function endDay(run: RunState, cycle: CycleState): GameState {
  const definition = getEncounterCycleDefinition(cycle);
  const retainedHand = cycle.hand.filter(
    (card) => !card.temporary && (card.retained || getCardForInstance(card).retain),
  );
  const permanentHand = cycle.hand.filter(
    (card) => !card.temporary && !card.retained && !getCardForInstance(card).retain,
  );
  let tasks = cycle.tasks.map((task) => ({
    ...task,
    requirements: task.requirements.map((requirement) => ({ ...requirement })),
  }));
  let morale = run.morale;
  let block = cycle.block;
  const blockedDisciplines: Discipline[] = [];
  const resolvedIntents: string[] = [];
  let interruptions = 0;
  const intentProtections = { ...cycle.intentProtections };

  for (const taskAtStart of cycle.tasks) {
    const currentTask = tasks.find((task) => task.taskId === taskAtStart.taskId);
    if (!currentTask || currentTask.status === "shipped") continue;
    const scheduledIntent = getScheduledIntent({ ...cycle, tasks }, currentTask);
    if (currentTask.stunned && scheduledIntent) {
      resolvedIntents.push(`Stunned · ${formatIntent(scheduledIntent)}`);
      continue;
    }
    const intent = getCurrentIntent({ ...cycle, tasks }, currentTask);
    if (!intent) continue;

    if ((intentProtections[intent.kind] ?? 0) > 0) {
      intentProtections[intent.kind] = (intentProtections[intent.kind] ?? 0) - 1;
      resolvedIntents.push(`Protected · ${formatIntent(intent)}`);
      continue;
    }

    resolvedIntents.push(formatIntent(intent));
    switch (intent.kind) {
      case "ai-assist":
        tasks = tasks.map((task) =>
          task.taskId !== currentTask.taskId
            ? task
            : {
                ...task,
                requirements: task.requirements.map((requirement) => {
                  if (requirement.discipline !== intent.discipline) return requirement;
                  const remaining = Math.max(
                    0,
                    requirement.target - requirement.verified - requirement.unverified,
                  );
                  return {
                    ...requirement,
                    unverified: requirement.unverified + Math.min(intent.amount, remaining),
                  };
                }),
              },
        );
        break;
      case "scope":
        tasks = tasks.map((task) =>
          task.taskId !== currentTask.taskId
            ? task
            : {
                ...task,
                requirements: task.requirements.map((requirement) =>
                  requirement.discipline === intent.discipline
                    ? { ...requirement, target: requirement.target + intent.amount }
                    : requirement,
                ),
              },
        );
        break;
      case "regression":
        tasks = tasks.map((task) =>
          task.taskId === currentTask.taskId
            ? removeRegressionWork(task, intent.discipline, intent.amount)
            : task,
        );
        break;
      case "blocked":
        if (!blockedDisciplines.includes(intent.discipline)) {
          blockedDisciplines.push(intent.discipline);
        }
        break;
      case "interruption":
        interruptions += 1;
        break;
      case "crunch":
        {
          const damage = absorbMoraleDamage(block, intent.moraleLoss);
          block = damage.block;
          morale -= damage.moraleLoss;
        }
        break;
      case "spawn": {
        const complication = definition.tasks.find(
          (task) => task.id === intent.taskId && task.role === "complication",
        );
        const activeComplications = tasks.filter((task) => {
          const taskDefinition = definition.tasks.find((candidate) => candidate.id === task.taskId);
          return task.status !== "shipped" && taskDefinition?.role === "complication";
        }).length;
        if (
          complication &&
          activeComplications < 3 &&
          !tasks.some((task) => task.taskId === complication.id)
        ) {
          tasks = [...tasks, createTaskState(complication, cycle.day + 1)];
        }
        break;
      }
    }

    if (morale <= 0) break;
  }

  const resolvedCycle: CycleState = {
    ...cycle,
    block,
    tasks: tasks.map(refreshTaskStatus),
    hand: retainedHand,
    discardPile: [...cycle.discardPile, ...permanentHand],
    resolvedIntents: [...cycle.resolvedIntents, ...resolvedIntents],
    intentProtections,
  };
  const nextRun = { ...run, morale, cycle: resolvedCycle };

  if (morale <= 0) {
    return {
      screen: { name: "retro", outcome: "defeat", cause: "morale" },
      run: { ...nextRun, cycle: null },
    };
  }

  if (cycle.day >= definition.maxDays) {
    if (cycle.boss) {
      return {
        screen: { name: "retro", outcome: "defeat", cause: "final-release" },
        run: {
          ...nextRun,
          cycle: null,
          history: [
            ...nextRun.history,
            {
              kind: "cycle-finished",
              nodeId: cycle.nodeId,
              outcome: "missed",
              day: cycle.day,
            },
          ],
        },
      };
    }
    let deadlineRun: RunState = nextRun;
    let deadlineCycle = resolvedCycle;
    for (const task of resolvedCycle.tasks) {
      if (task.status !== "ready") continue;
      const shipped = applyTaskShipping(deadlineRun, deadlineCycle, task.taskId);
      if (!shipped) continue;
      deadlineRun = shipped.run;
      deadlineCycle = shipped.cycle;
      if (deadlineRun.morale <= 0) return taskShippingDefeat(deadlineRun);
      if (isCycleShipped(deadlineCycle)) {
        return completeShippedCycle(deadlineRun, deadlineCycle);
      }
    }

    return missCycle(deadlineRun, deadlineCycle);
  }

  const totalDistractions = interruptions + cycle.queuedDistractions;
  const distractions: CardInstance[] = Array.from({ length: totalDistractions }, (_, index) => ({
    cardId: "distraction",
    instanceId: `distraction-${cycle.temporaryCardCounter + index + 1}`,
    temporary: true,
  }));
  const scriptMultiplier = run.tools.includes("cron-upgrade") ? 2 : 1;
  const scripts = runScripts(
    resolvedCycle.tasks,
    scriptMultiplier,
    run.tools.includes("platypus") ? 1 : 0,
  );
  const ireneDraws = run.squad.includes("irene") ? scripts.verifiedCompletions : 0;
  const nextDraw = drawCards(
    [...distractions, ...resolvedCycle.drawPile],
    resolvedCycle.discardPile,
    5 + cycle.queuedCardsDrawn + ireneDraws,
    run.tools.includes("noise-cancelling-headphones"),
    run.tools.includes("cat-tax"),
  );
  const nextCycle: CycleState = {
    ...resolvedCycle,
    day: cycle.day + 1,
    focus: 3 + (run.tools.includes("timezone-wrangler") ? cycle.focus : 0),
    block: scripts.block + (run.tools.includes("error-budget") ? resolvedCycle.block : 0),
    tasks: scripts.tasks.map((task) => ({ ...task, stunned: false })),
    drawPile: nextDraw.drawPile,
    hand: [...retainedHand, ...nextDraw.drawn],
    discardPile: nextDraw.discardPile,
    blockedDisciplines,
    triggeredPassiveIds: ireneDraws > 0 ? ["irene"] : [],
    temporaryCardCounter: cycle.temporaryCardCounter + totalDistractions,
    cardsPlayedThisDay: 0,
    generatedCardsPlayedThisDay: 0,
    cardsExhaustedThisDay: 0,
    lastPlayedCard: undefined,
    lastNonGeneratedCard: undefined,
    lastTargetedTaskId: undefined,
    chain: { count: 0, transfersBetweenTasks: false },
    lastWorkDiscipline: undefined,
    lastWorkCard: undefined,
    dayWorkBonuses: [],
    reviewStunFocusBonus: 0,
    queuedDistractions: 0,
    queuedCardsDrawn: 0,
  };

  return {
    screen: {
      name: "cycle",
      nodeId: nextCycle.nodeId,
      cycleId: nextCycle.cycleId,
    },
    run: { ...nextRun, cycle: nextCycle },
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_RUN":
      return { screen: { name: "squad" }, run: createRun(action.seed) };

    case "TOGGLE_DEVELOPER": {
      if (state.screen.name !== "squad" || !state.run) return state;
      const alreadySelected = state.run.squad.includes(action.developerId);
      const squad = alreadySelected
        ? state.run.squad.filter((id) => id !== action.developerId)
        : state.run.squad.length < 3
          ? [...state.run.squad, action.developerId]
          : state.run.squad;
      return { ...state, run: { ...state.run, squad } };
    }

    case "CONFIRM_SQUAD": {
      if (state.screen.name !== "squad" || state.run?.squad.length !== 3) {
        return state;
      }
      const cardIds = [
        ...state.run.squad.map((id) => getDeveloper(id).startingCardId),
        ...starterBasicCardIds,
      ];
      const deck = createCardInstances(cardIds, state.run.nextCardInstanceId);
      return {
        screen: { name: "map" },
        run: {
          ...state.run,
          deck,
          nextCardInstanceId: state.run.nextCardInstanceId + deck.length,
        },
      };
    }

    case "VISIT_NODE": {
      if (state.screen.name !== "map" || !state.run) return state;
      const node = mapNodes.find((candidate) => candidate.id === action.nodeId);
      if (
        !node ||
        state.run.completedNodeIds.includes(node.id) ||
        !isMapNodeAvailable(
          node,
          state.run.currentNodeId,
          state.run.completedNodeIds,
          effectiveMapEdges(state.run),
        )
      ) {
        return state;
      }

      const runAtNode = { ...state.run, currentNodeId: node.id };
      const cycleId = getMapNodeCycleId(node, runAtNode.seed);

      if ((node.kind === "cycle" || node.kind === "incident" || node.kind === "boss") && cycleId) {
        if (node.kind === "boss") {
          const boss = getBossDefinition(runAtNode.selectedBossId);
          const baseCycle = createCycleState(runAtNode, node.id, cycleId, boss.project);
          const bossCycle: CycleState = { ...baseCycle, boss: createBossEncounter(boss) };
          const opened = resolveOpeningBossEffects({ ...runAtNode, cycle: bossCycle }, bossCycle);
          return {
            screen: { name: "cycle", nodeId: node.id, cycleId },
            run: {
              ...opened.run,
              cycle: opened.cycle,
              nextCycleModifiers: [],
              pendingBounties: [],
            },
          };
        }
        const cycle = createCycleState(runAtNode, node.id, cycleId);
        return {
          screen: { name: "cycle", nodeId: node.id, cycleId },
          run: { ...runAtNode, cycle, nextCycleModifiers: [], pendingBounties: [] },
        };
      }

      if (node.kind === "retro") {
        return {
          screen: { name: "retro", outcome: "victory" },
          run: completeNode(runAtNode, node.id),
        };
      }

      if (node.kind === "event") {
        const selection = selectEventDefinition(runAtNode);
        return {
          screen: { name: "event", nodeId: node.id, eventId: selection.event.id },
          run: { ...runAtNode, rngState: selection.rngState },
        };
      }

      if (node.kind === "shop") {
        return {
          screen: {
            name: "shop",
            nodeId: node.id,
            inventory: createShopInventory(runAtNode, node.id),
          },
          run: runAtNode,
        };
      }

      if (node.kind === "weekend") {
        return {
          screen: { name: "weekend", nodeId: node.id },
          run: runAtNode,
        };
      }

      return state;
    }

    case "PLAY_CARD": {
      if (state.screen.name !== "cycle" || !state.run?.cycle) return state;
      const cycle = state.run.cycle;
      if (cycle.pendingCardChoice) return state;
      const instance = cycle.hand.find((candidate) => candidate.instanceId === action.instanceId);
      if (!instance) return state;

      const resolution = resolveCardTarget(state.run, instance, action.target);
      if (!resolution.legal) return state;

      let tasks = cycle.tasks.map((task) =>
        resolution.kind === "review" ||
        resolution.verifiedWorkHits.some((hit) => hit.taskId === task.taskId)
          ? applyCardResolutionToTask(task, resolution)
          : task.taskId === resolution.taskId
            ? applyCardResolutionToTask(task, resolution)
            : task,
      );
      if (resolution.kind === "tactic" && resolution.sideQuestDiscipline) {
        tasks = [...tasks, createSideQuestState(cycle, resolution.sideQuestDiscipline)];
      }
      const triggeredPassiveIds = [
        ...cycle.triggeredPassiveIds,
        ...resolution.triggeredPassiveIds.filter((id) => !cycle.triggeredPassiveIds.includes(id)),
      ];
      const cardDraw = resolution.drawEntireDrawPile
        ? {
            drawPile: [] as CardInstance[],
            discardPile: cycle.discardPile,
            drawn: [...cycle.drawPile],
          }
        : resolution.cardsDrawn > 0
          ? drawCards(
              cycle.drawPile,
              cycle.discardPile,
              resolution.cardsDrawn,
              state.run.tools.includes("noise-cancelling-headphones"),
              state.run.tools.includes("cat-tax"),
            )
          : undefined;
      const generatedCards: CardInstance[] = resolution.generatedCards.map((generated, index) => ({
        cardId: generated.cardId,
        dynamicDefinition: generated.dynamicDefinition,
        instanceId: `generated-${cycle.temporaryCardCounter + index + 1}`,
        generated: true,
        generatedBy: {
          sourceCardId: getCardForInstance(instance).id,
          sourceInstanceId: instance.instanceId,
          day: cycle.day,
        },
      }));
      const definition = getCardForInstance(instance);
      const generatedPlay = isGeneratedCardInstance(instance);
      const exhausts = definition.exhaust === true;
      const exhaustedInstance: CardInstance = exhausts
        ? { ...instance, exhausted: { day: cycle.day, cause: "played" } }
        : instance;
      const chain = resolution.chainAfterPlay;
      const discardedCards = cycle.hand.filter((candidate) =>
        resolution.discardedCardInstanceIds.includes(candidate.instanceId),
      );
      const effectExhaustedCards = cycle.hand
        .filter((candidate) => resolution.exhaustedCardInstanceIds.includes(candidate.instanceId))
        .map((candidate) => ({
          ...candidate,
          exhausted: {
            day: cycle.day,
            cause: "effect" as const,
            sourceCardId: definition.id,
          },
        }));
      const retrievedExhaustCard = resolution.retrievedExhaustCardInstanceId
        ? cycle.exhaustPile.find(
            (candidate) => candidate.instanceId === resolution.retrievedExhaustCardInstanceId,
          )
        : undefined;
      const exhaustedCount = effectExhaustedCards.length + (exhausts ? 1 : 0);
      const nickFocus = state.run.squad.includes("nick") ? exhaustedCount : 0;
      if (nickFocus > 0 && !triggeredPassiveIds.includes("nick")) {
        triggeredPassiveIds.push("nick");
      }
      const cardTagWorkBonuses = { ...cycle.cardTagWorkBonuses };
      if (resolution.cycleWorkBonus) {
        cardTagWorkBonuses[resolution.cycleWorkBonus.tag] =
          (cardTagWorkBonuses[resolution.cycleWorkBonus.tag] ?? 0) +
          resolution.cycleWorkBonus.amount;
      }
      const nextCycle: CycleState = {
        ...cycle,
        focus: cycle.focus - resolution.cost + resolution.focusGained + nickFocus,
        block: cycle.block + resolution.blockGained,
        techDebtAdded: cycle.techDebtAdded + resolution.techDebtAdded,
        tasks,
        drawPile: cardDraw?.drawPile ?? cycle.drawPile,
        hand: [
          ...cycle.hand.filter(
            (candidate) =>
              candidate.instanceId !== instance.instanceId &&
              !resolution.discardedCardInstanceIds.includes(candidate.instanceId) &&
              !resolution.exhaustedCardInstanceIds.includes(candidate.instanceId),
          ),
          ...(cardDraw?.drawn ?? []),
          ...generatedCards,
          ...(retrievedExhaustCard ? [{ ...retrievedExhaustCard, exhausted: undefined }] : []),
        ].map((candidate) =>
          resolution.retainedCard?.instanceId === candidate.instanceId
            ? {
                ...candidate,
                retained: true,
                costReduction:
                  (candidate.costReduction ?? 0) + resolution.retainedCard.costReduction,
              }
            : candidate,
        ),
        discardPile: exhausts
          ? [...(cardDraw?.discardPile ?? cycle.discardPile), ...discardedCards]
          : [...(cardDraw?.discardPile ?? cycle.discardPile), ...discardedCards, instance],
        exhaustPile: [
          ...cycle.exhaustPile.filter(
            (candidate) => candidate.instanceId !== resolution.retrievedExhaustCardInstanceId,
          ),
          ...effectExhaustedCards,
          ...(exhausts ? [exhaustedInstance] : []),
        ],
        triggeredPassiveIds,
        temporaryCardCounter: cycle.temporaryCardCounter + generatedCards.length,
        sideQuestCounter:
          resolution.kind === "tactic" && resolution.sideQuestDiscipline
            ? cycle.sideQuestCounter + 1
            : cycle.sideQuestCounter,
        cardsPlayedThisDay: cycle.cardsPlayedThisDay + 1,
        cardsPlayedThisCycle: cycle.cardsPlayedThisCycle + 1,
        generatedCardsPlayedThisDay: cycle.generatedCardsPlayedThisDay + (generatedPlay ? 1 : 0),
        generatedCardsPlayedThisCycle:
          cycle.generatedCardsPlayedThisCycle + (generatedPlay ? 1 : 0),
        cardsExhaustedThisDay: cycle.cardsExhaustedThisDay + exhaustedCount,
        cardsExhaustedThisCycle: cycle.cardsExhaustedThisCycle + exhaustedCount,
        lastPlayedCard: {
          cardId: definition.id,
          instanceId: instance.instanceId,
          generated: generatedPlay,
        },
        lastNonGeneratedCard: generatedPlay
          ? cycle.lastNonGeneratedCard
          : { definition, sourceInstanceId: instance.instanceId },
        lastTargetedTaskId: resolution.taskId ?? cycle.lastTargetedTaskId,
        chain,
        peakChain: Math.max(cycle.peakChain, chain.count),
        prototypePower: cycle.prototypePower,
        fullStackPower: cycle.fullStackPower + resolution.fullStackAdded,
        cardTagWorkBonuses,
        dayWorkBonuses: resolution.dayWorkBonus
          ? [...cycle.dayWorkBonuses, resolution.dayWorkBonus]
          : cycle.dayWorkBonuses,
        reviewStunFocusBonus: cycle.reviewStunFocusBonus + resolution.dayReviewStunFocusAdded,
        lastWorkCard:
          resolution.kind === "work" && resolution.countsAsWorkPlay && definition.discipline
            ? {
                cardId: definition.id,
                discipline: definition.discipline,
                amount: definition.amount,
              }
            : cycle.lastWorkCard,
        lastWorkDiscipline:
          resolution.kind === "work" && resolution.countsAsWorkPlay
            ? resolution.discipline
            : cycle.lastWorkDiscipline,
        queuedDistractions: cycle.queuedDistractions + resolution.queuedDistractions,
        queuedCardsDrawn: cycle.queuedCardsDrawn + resolution.nextDayCardsDrawn,
        pendingCardChoice:
          resolution.returnDrawnToTop > 0
            ? {
                kind: "return-to-draw",
                remaining: resolution.returnDrawnToTop,
                selected: [],
              }
            : cycle.pendingCardChoice,
      };
      let nextRun: RunState = {
        ...state.run,
        cycle: nextCycle,
        history: [
          ...state.run.history,
          {
            kind: "card-played",
            nodeId: cycle.nodeId,
            day: cycle.day,
            cardId: definition.id,
            taskId: resolution.taskId,
            discipline: resolution.kind === "work" ? resolution.discipline : undefined,
            label: resolution.label,
            generated: generatedPlay,
            generatedByCardId: instance.generatedBy?.sourceCardId,
            exhausted: exhausts,
            cardsPlayedThisDay: cycle.cardsPlayedThisDay + 1,
            chain: resolution.taskId
              ? { taskId: resolution.taskId, count: chain.count }
              : undefined,
          },
        ],
      };
      nextRun = addTechDebt(nextRun, resolution.techDebtAdded);
      if (nextRun.cycle?.boss) {
        const reconciled = reconcileBossEncounter(nextRun, nextRun.cycle);
        nextRun = reconciled.run;
      }
      return { ...state, run: nextRun };
    }

    case "CHOOSE_CYCLE_CARD": {
      if (state.screen.name !== "cycle" || !state.run?.cycle) return state;
      const cycle = state.run.cycle;
      const pending = cycle.pendingCardChoice;
      if (!pending) return state;
      const chosen = cycle.hand.find((card) => card.instanceId === action.instanceId);
      if (!chosen) return state;
      const selected = [...pending.selected, chosen];
      const remaining = pending.remaining - 1;
      return {
        ...state,
        run: {
          ...state.run,
          cycle: {
            ...cycle,
            hand: cycle.hand.filter((card) => card.instanceId !== chosen.instanceId),
            drawPile: remaining === 0 ? [...selected, ...cycle.drawPile] : cycle.drawPile,
            pendingCardChoice: remaining === 0 ? undefined : { ...pending, remaining, selected },
          },
        },
      };
    }

    case "END_DAY":
      if (state.screen.name !== "cycle" || !state.run?.cycle) return state;
      if (state.run.cycle.pendingCardChoice) return state;
      {
        const ended = endDay(state.run, state.run.cycle);
        if (ended.screen.name !== "cycle" || !ended.run?.cycle?.boss) return ended;
        const reconciled = reconcileBossEncounter(ended.run, ended.run.cycle);
        return { ...ended, run: reconciled.run };
      }

    case "ACKNOWLEDGE_BOSS_TRANSITION": {
      if (state.screen.name !== "cycle" || !state.run?.cycle?.boss) return state;
      const acknowledged = acknowledgeBossTransition(state.run, state.run.cycle);
      return { ...state, run: acknowledged.run };
    }

    case "LAUNCH_FINAL_RELEASE": {
      if (state.screen.name !== "cycle" || !state.run?.cycle?.boss) return state;
      return launchFinalRelease(state.run, state.run.cycle) ?? state;
    }

    case "SHIP_TASK": {
      if (state.screen.name !== "cycle" || !state.run?.cycle) return state;
      if (state.run.cycle.pendingCardChoice) return state;
      if (state.run.cycle.boss?.phase === "launch-window") {
        const boss = getBossDefinition(state.run.cycle.boss.bossId);
        const projectTaskIds = new Set(
          boss.project.tasks.filter((task) => task.role !== "complication").map((task) => task.id),
        );
        if (projectTaskIds.has(action.taskId)) return state;
      }
      const shipped = applyTaskShipping(state.run, state.run.cycle, action.taskId);
      if (!shipped) return state;
      if (shipped.run.morale <= 0) return taskShippingDefeat(shipped.run);
      if (shipped.cycle.boss) {
        const reconciled = reconcileBossEncounter(shipped.run, shipped.cycle);
        return { ...state, run: reconciled.run };
      }
      return isCycleShipped(shipped.cycle)
        ? completeShippedCycle(shipped.run, shipped.cycle)
        : { ...state, run: shipped.run };
    }

    case "CONTINUE_REPORT":
      if (state.screen.name !== "report" || !state.run) return state;
      return {
        ...state,
        screen: state.run.pendingToolReward
          ? { name: "tool-reward" }
          : state.run.pendingCardReward
            ? { name: "reward" }
            : { name: "map" },
      };

    case "CHOOSE_CARD_REWARD": {
      if (state.screen.name !== "reward" || !state.run?.pendingCardReward) return state;
      const reward = state.run.pendingCardReward;
      if (!reward.cardIds.includes(action.cardId)) return state;
      const card: CardInstance = {
        cardId: action.cardId,
        instanceId: `card-${state.run.nextCardInstanceId}`,
      };
      return {
        screen: { name: "map" },
        run: {
          ...state.run,
          deck: [...state.run.deck, card],
          nextCardInstanceId: state.run.nextCardInstanceId + 1,
          pendingCardReward: null,
          history: [
            ...state.run.history,
            { kind: "card-added", cardId: action.cardId, sourceNodeId: reward.sourceNodeId },
          ],
        },
      };
    }

    case "SKIP_CARD_REWARD": {
      if (state.screen.name !== "reward" || !state.run?.pendingCardReward) return state;
      const reward = state.run.pendingCardReward;
      return {
        screen: { name: "map" },
        run: {
          ...state.run,
          pendingCardReward: null,
          history: [
            ...state.run.history,
            { kind: "card-skipped", sourceNodeId: reward.sourceNodeId },
          ],
        },
      };
    }

    case "OFFER_TOOL_REWARD": {
      if (
        !state.run ||
        state.run.cycle ||
        state.run.pendingCardReward ||
        state.run.pendingToolReward
      ) {
        return state;
      }
      const run = createToolReward(state.run, action.sourceNodeId);
      if (!run.pendingToolReward) return state;
      return { screen: { name: "tool-reward" }, run };
    }

    case "CHOOSE_TOOL_REWARD": {
      if (state.screen.name !== "tool-reward" || !state.run?.pendingToolReward) return state;
      const reward = state.run.pendingToolReward;
      if (!reward.toolIds.includes(action.toolId) || state.run.tools.includes(action.toolId)) {
        return state;
      }
      return {
        screen: state.run.pendingCardReward ? { name: "reward" } : { name: "map" },
        run: {
          ...state.run,
          tools: [...state.run.tools, action.toolId],
          pendingToolReward: null,
          history: [
            ...state.run.history,
            { kind: "tool-added", toolId: action.toolId, sourceNodeId: reward.sourceNodeId },
          ],
        },
      };
    }

    case "CHOOSE_EVENT": {
      if (state.screen.name !== "event" || !state.run) return state;
      if (state.screen.resolution) return state;
      const event = getEvent(state.screen.eventId);
      const choice = event.choices.find((candidate) => candidate.id === action.choiceId);
      if (!choice) return state;
      const resolved = resolveEventChoice(choice, state.run);
      if (resolved.disabledReason) return state;
      const progress = advanceEventResolution(state.run, choice.effects);
      if (!progress.pending) {
        return finishEventResolution(progress.run, state.screen, choice.id, progress.outcome);
      }
      return {
        screen: {
          ...state.screen,
          resolution: {
            choiceId: choice.id,
            effectIndex: progress.effectIndex,
            outcome: progress.outcome,
            pending: progress.pending,
          },
        },
        run: progress.run,
      };
    }

    case "CHOOSE_EVENT_OPTION": {
      if (state.screen.name !== "event" || !state.screen.resolution || !state.run) return state;
      const eventScreen = state.screen;
      const resolution = state.screen.resolution;
      const event = getEvent(state.screen.eventId);
      const choice = event.choices.find((candidate) => candidate.id === resolution.choiceId);
      if (!choice) return state;
      const progress = continueEventResolution(
        state.run,
        choice.effects,
        { ...resolution, run: state.run },
        action.optionId,
      );
      if (!progress) return state;
      if (!progress.pending) {
        return finishEventResolution(progress.run, eventScreen, choice.id, progress.outcome);
      }
      return {
        screen: {
          ...state.screen,
          resolution: {
            choiceId: choice.id,
            effectIndex: progress.effectIndex,
            outcome: progress.outcome,
            pending: progress.pending,
          },
        },
        run: progress.run,
      };
    }

    case "BUY_SHOP_CARD": {
      if (state.screen.name !== "shop" || !state.run) return state;
      const offer = state.screen.inventory.cardOffers.find(
        (candidate) => candidate.id === action.offerId,
      );
      if (
        !offer ||
        state.screen.inventory.purchasedOfferIds.includes(offer.id) ||
        state.run.credits < offer.price
      ) {
        return state;
      }
      const card: CardInstance = {
        cardId: offer.cardId,
        instanceId: `card-${state.run.nextCardInstanceId}`,
      };
      return {
        screen: {
          ...state.screen,
          inventory: {
            ...state.screen.inventory,
            purchasedOfferIds: [...state.screen.inventory.purchasedOfferIds, offer.id],
          },
        },
        run: {
          ...state.run,
          credits: state.run.credits - offer.price,
          deck: [...state.run.deck, card],
          nextCardInstanceId: state.run.nextCardInstanceId + 1,
          history: [
            ...state.run.history,
            { kind: "card-added", cardId: offer.cardId, sourceNodeId: state.screen.nodeId },
          ],
        },
      };
    }

    case "BUY_SHOP_TOOL": {
      if (state.screen.name !== "shop" || !state.run) return state;
      const offer = state.screen.inventory.toolOffers.find(
        (candidate) => candidate.id === action.offerId,
      );
      if (
        !offer ||
        state.screen.inventory.purchasedOfferIds.includes(offer.id) ||
        state.run.tools.includes(offer.toolId) ||
        state.run.credits < offer.price
      ) {
        return state;
      }
      return {
        screen: {
          ...state.screen,
          inventory: {
            ...state.screen.inventory,
            purchasedOfferIds: [...state.screen.inventory.purchasedOfferIds, offer.id],
          },
        },
        run: {
          ...state.run,
          credits: state.run.credits - offer.price,
          tools: [...state.run.tools, offer.toolId],
          history: [
            ...state.run.history,
            { kind: "tool-added", toolId: offer.toolId, sourceNodeId: state.screen.nodeId },
          ],
        },
      };
    }

    case "BUY_SHOP_SERVICE": {
      if (state.screen.name !== "shop" || !state.run) return state;
      const price = shopServicePrices[action.serviceId];
      if (state.run.credits < price) return state;
      if (
        action.serviceId !== "debt-cleanup" &&
        state.screen.inventory.usedServiceIds.includes(action.serviceId)
      ) {
        return state;
      }

      if (action.serviceId === "debt-cleanup") {
        if (state.run.techDebt <= 0) return state;
        return {
          ...state,
          run: reconcileTechDebt({ ...state.run, credits: state.run.credits - price }, -1),
        };
      }

      const instance = state.run.deck.find(
        (candidate) => candidate.instanceId === action.instanceId,
      );
      if (!instance) return state;
      const eligible =
        action.serviceId === "refactor"
          ? canRefactorCard(state.run, instance)
          : canDuplicateCard(instance);
      if (!eligible) return state;

      const nextDeck =
        action.serviceId === "refactor"
          ? state.run.deck.filter((card) => card.instanceId !== instance.instanceId)
          : [
              ...state.run.deck,
              {
                cardId: instance.cardId,
                dynamicDefinition: instance.dynamicDefinition,
                instanceId: `card-${state.run.nextCardInstanceId}`,
              },
            ];
      return {
        screen: {
          ...state.screen,
          inventory: {
            ...state.screen.inventory,
            usedServiceIds: [...state.screen.inventory.usedServiceIds, action.serviceId],
          },
        },
        run: {
          ...state.run,
          credits: state.run.credits - price,
          deck: nextDeck,
          nextCardInstanceId:
            state.run.nextCardInstanceId + (action.serviceId === "duplicate" ? 1 : 0),
        },
      };
    }

    case "REFRESH_SHOP": {
      if (state.screen.name !== "shop" || !state.run) return state;
      const price = shopRefreshPrice(state.screen.inventory.refreshCount);
      if (state.run.credits < price) return state;
      const refreshCount = state.screen.inventory.refreshCount + 1;
      return {
        screen: {
          ...state.screen,
          inventory: createShopInventory(
            state.run,
            state.screen.nodeId,
            refreshCount,
            state.screen.inventory.usedServiceIds,
          ),
        },
        run: { ...state.run, credits: state.run.credits - price },
      };
    }

    case "CHOOSE_WEEKEND": {
      if (state.screen.name !== "weekend" || !state.run) return state;
      const choice = getWeekendChoiceState(action.choiceId, state.run);
      if (choice.disabledReason) return state;

      let run = state.run;
      if (action.choiceId === "rest") {
        run = {
          ...run,
          morale: Math.min(run.maxMorale, run.morale + weekendRestAmount),
        };
      } else if (action.choiceId === "side-gig") {
        run = {
          ...run,
          credits: run.credits + weekendSideGigCredits,
          morale: run.morale - weekendSideGigMoraleCost,
        };
      } else {
        const instance = run.deck.find((card) => card.instanceId === action.instanceId);
        if (!instance || !canRefactorCard(run, instance)) return state;
        run = {
          ...run,
          deck: run.deck.filter((card) => card.instanceId !== instance.instanceId),
        };
      }

      const completedRun = completeNode(run, state.screen.nodeId);
      return {
        screen: { name: "map" },
        run: {
          ...completedRun,
          history: [
            ...completedRun.history,
            {
              kind: "weekend-resolved",
              nodeId: state.screen.nodeId,
              choiceId: action.choiceId,
              outcome: choice.outcomes,
            },
          ],
        },
      };
    }

    case "LEAVE_NODE": {
      if (state.screen.name !== "shop" || !state.run) {
        return state;
      }
      return {
        screen: { name: "map" },
        run: completeNode(state.run, state.screen.nodeId),
      };
    }

    case "RETURN_TITLE":
      return initialGameState;
  }
}
