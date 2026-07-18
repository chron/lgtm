import {
  eligibleRewardCardIds,
  formatIntent,
  getCard,
  getCycle,
  getDeveloper,
  isMapNodeAvailable,
  mapNodes,
  squadRewardCardIds,
  starterBasicCardIds,
  teamRewardCardIds,
  toolIds,
} from "../domain/content";
import type {
  CardInstance,
  CycleReport,
  CycleState,
  DeveloperId,
  Discipline,
  MapNodeKind,
  RunState,
  TaskState,
  ToolId,
} from "../domain/models";
import {
  absorbMoraleDamage,
  createCycleReport,
  getCurrentIntent,
  getScheduledIntent,
  isCycleShipped,
  refreshTaskStatus,
  resolveCardTarget,
  taskShippingPreview,
  taskShippingRewards,
  verifyTask,
} from "./rules";
import type { CardTarget } from "./rules";
import { normalizeSeed, sampleOne } from "./random";

type Screen =
  | { name: "title" }
  | { name: "squad" }
  | { name: "map" }
  | { name: "cycle"; nodeId: string; cycleId: string }
  | { name: "report"; report: CycleReport }
  | { name: "reward" }
  | { name: "tool-reward" }
  | { name: "event"; nodeId: string }
  | { name: "shop"; nodeId: string }
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
  | { type: "END_DAY" }
  | { type: "SHIP_TASK"; taskId: string }
  | { type: "CONTINUE_REPORT" }
  | { type: "CHOOSE_CARD_REWARD"; cardId: string }
  | { type: "SKIP_CARD_REWARD" }
  | { type: "OFFER_TOOL_REWARD"; sourceNodeId: string }
  | { type: "CHOOSE_TOOL_REWARD"; toolId: ToolId }
  | { type: "CHOOSE_EVENT"; choice: "push-back" | "sure-easy" }
  | { type: "LEAVE_NODE" }
  | { type: "RETURN_TITLE" };

export const initialGameState: GameState = {
  screen: { name: "title" },
  run: null,
};

function createRun(seed = 0x5eed1234): RunState {
  const normalizedSeed = normalizeSeed(seed);
  return {
    seed: normalizedSeed,
    rngState: normalizedSeed,
    squad: [],
    deck: [],
    nextCardInstanceId: 1,
    tools: [],
    morale: 10,
    techDebt: 0,
    credits: 40,
    currentNodeId: null,
    completedNodeIds: [],
    cycle: null,
    pendingCardReward: null,
    pendingToolReward: null,
    history: [],
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

  return {
    ...run,
    rngState: wildcardPick.rngState,
    pendingCardReward: {
      sourceNodeId,
      cardIds: [squadPick.item, teamPick.item, wildcardPick.item],
    },
  };
}

function createToolReward(run: RunState, sourceNodeId: string): RunState {
  const remaining = toolIds.filter((toolId) => !run.tools.includes(toolId));
  if (remaining.length < 3) return run;

  let rngState = run.rngState;
  const picks: ToolId[] = [];
  for (let index = 0; index < 3; index += 1) {
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
      toolIds: picks as [ToolId, ToolId, ToolId],
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

function drawCards(
  originalDrawPile: readonly CardInstance[],
  originalDiscardPile: readonly CardInstance[],
  count: number,
  replaceDistractions = false,
): {
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  drawn: CardInstance[];
} {
  let drawPile = [...originalDrawPile];
  let discardPile = [...originalDiscardPile];
  const drawn: CardInstance[] = [];

  while (drawn.length < count) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile = [...discardPile];
      discardPile = [];
    }

    const next = drawPile.shift();
    if (!next) continue;
    if (replaceDistractions && next.cardId === "distraction") continue;
    drawn.push(next);
  }

  return { drawPile, discardPile, drawn };
}

function createCycleState(run: RunState, nodeId: string, cycleId: string): CycleState {
  const definition = getCycle(cycleId);
  const firstDraw = drawCards(run.deck, [], 5, run.tools.includes("noise-cancelling-headphones"));
  return {
    nodeId,
    cycleId,
    startingMorale: run.morale,
    day: 1,
    focus: 3,
    block: 0,
    tasks: definition.tasks.map((task) => ({
      taskId: task.id,
      status: "open",
      stunned: false,
      requirements: task.requirements.map((requirement) => ({
        ...requirement,
        verified: 0,
        unverified: 0,
        scriptPower: 0,
        scriptBlock: 0,
      })),
    })),
    drawPile: firstDraw.drawPile,
    hand: firstDraw.drawn,
    discardPile: firstDraw.discardPile,
    blockedDisciplines: [],
    triggeredPassiveIds: [],
    resolvedIntents: [],
    temporaryCardCounter: 0,
    defects: 0,
    techDebtAdded: 0,
  };
}

function addTechDebtCard(run: RunState): RunState {
  return {
    ...run,
    deck: [
      ...run.deck,
      {
        cardId: "tech-debt",
        instanceId: `card-${run.nextCardInstanceId}`,
      },
    ],
    nextCardInstanceId: run.nextCardInstanceId + 1,
  };
}

const techDebtCardThreshold = 3;

function addTechDebt(run: RunState, amount: number): RunState {
  if (amount <= 0) return run;
  const techDebt = run.techDebt + amount;
  const cardsToAdd =
    Math.floor(techDebt / techDebtCardThreshold) - Math.floor(run.techDebt / techDebtCardThreshold);
  let nextRun = { ...run, techDebt };
  for (let index = 0; index < cardsToAdd; index += 1) {
    nextRun = addTechDebtCard(nextRun);
  }
  return nextRun;
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
  return { screen: { name: "report", report }, run: nextRun };
}

function completeShippedCycle(run: RunState, cycle: CycleState): GameState {
  const definition = getCycle(cycle.cycleId);
  const creditsGained = 20 + (definition.maxDays - cycle.day) * 5;
  const moraleDelta = run.morale - cycle.startingMorale;
  const report = createCycleReport(
    cycle,
    "shipped",
    moraleDelta,
    creditsGained,
    cycle.techDebtAdded,
  );

  return finishCycle(run, cycle, report, run.morale, creditsGained);
}

function missCycle(run: RunState, cycle: CycleState): GameState {
  const finalMorale = run.morale - 3;
  const missedDebt = 3;
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
        defects: preview.defects,
        moraleLoss: damage.moraleLoss,
        techDebtAdded: preview.techDebt,
        focusGained: rewards.focusGained,
      },
    ],
  };
  nextRun = addTechDebt(nextRun, preview.techDebt);
  return { run: nextRun, cycle: nextCycle };
}

function runScripts(
  tasks: readonly TaskState[],
  multiplier: number,
): { tasks: TaskState[]; block: number } {
  let block = 0;
  const nextTasks = tasks.map((task) => {
    if (task.status === "shipped") return task;
    block += task.requirements.reduce(
      (sum, requirement) => sum + requirement.scriptBlock * multiplier,
      0,
    );
    return refreshTaskStatus({
      ...task,
      requirements: task.requirements.map((requirement) => {
        const remaining = Math.max(
          0,
          requirement.target - requirement.verified - requirement.unverified,
        );
        return {
          ...requirement,
          verified:
            requirement.verified + Math.min(requirement.scriptPower * multiplier, remaining),
        };
      }),
    });
  });
  return { tasks: nextTasks, block };
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
  const definition = getCycle(cycle.cycleId);
  const permanentHand = cycle.hand.filter((card) => !card.temporary);
  let tasks = cycle.tasks.map((task) => ({
    ...task,
    requirements: task.requirements.map((requirement) => ({ ...requirement })),
  }));
  let morale = run.morale;
  let block = cycle.block;
  const blockedDisciplines: Discipline[] = [];
  const resolvedIntents: string[] = [];
  let interruptions = 0;

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

    resolvedIntents.push(formatIntent(intent));
    switch (intent.kind) {
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
    }

    if (morale <= 0) break;
  }

  const resolvedCycle: CycleState = {
    ...cycle,
    block,
    tasks: tasks.map(refreshTaskStatus),
    hand: [],
    discardPile: [...cycle.discardPile, ...permanentHand],
    resolvedIntents: [...cycle.resolvedIntents, ...resolvedIntents],
  };
  const nextRun = { ...run, morale, cycle: resolvedCycle };

  if (morale <= 0) {
    return {
      screen: { name: "retro", outcome: "defeat", cause: "morale" },
      run: { ...nextRun, cycle: null },
    };
  }

  if (cycle.day >= definition.maxDays) {
    let deadlineRun: RunState = nextRun;
    let deadlineCycle = resolvedCycle;
    for (const task of resolvedCycle.tasks) {
      if (task.status !== "ready") continue;
      const shipped = applyTaskShipping(deadlineRun, deadlineCycle, task.taskId);
      if (!shipped) continue;
      deadlineRun = shipped.run;
      deadlineCycle = shipped.cycle;
      if (deadlineRun.morale <= 0) return taskShippingDefeat(deadlineRun);
    }

    return isCycleShipped(deadlineCycle)
      ? completeShippedCycle(deadlineRun, deadlineCycle)
      : missCycle(deadlineRun, deadlineCycle);
  }

  const distractions: CardInstance[] = Array.from({ length: interruptions }, (_, index) => ({
    cardId: "distraction",
    instanceId: `distraction-${cycle.temporaryCardCounter + index + 1}`,
    temporary: true,
  }));
  const nextDraw = drawCards(
    [...distractions, ...resolvedCycle.drawPile],
    resolvedCycle.discardPile,
    5,
    run.tools.includes("noise-cancelling-headphones"),
  );
  const scriptMultiplier = run.tools.includes("cron-upgrade") ? 2 : 1;
  const scripts = runScripts(resolvedCycle.tasks, scriptMultiplier);
  const nextCycle: CycleState = {
    ...resolvedCycle,
    day: cycle.day + 1,
    focus: 3,
    block: scripts.block + (run.tools.includes("error-budget") ? resolvedCycle.block : 0),
    tasks: scripts.tasks.map((task) => ({ ...task, stunned: false })),
    drawPile: nextDraw.drawPile,
    hand: nextDraw.drawn,
    discardPile: nextDraw.discardPile,
    blockedDisciplines,
    triggeredPassiveIds: [],
    temporaryCardCounter: cycle.temporaryCardCounter + interruptions,
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
        !isMapNodeAvailable(node, state.run.currentNodeId, state.run.completedNodeIds)
      ) {
        return state;
      }

      const runAtNode = { ...state.run, currentNodeId: node.id };

      if ((node.kind === "cycle" || node.kind === "boss") && node.cycleId) {
        const cycle = createCycleState(runAtNode, node.id, node.cycleId);
        return {
          screen: { name: "cycle", nodeId: node.id, cycleId: node.cycleId },
          run: { ...runAtNode, cycle },
        };
      }

      if (node.kind === "retro") {
        return {
          screen: { name: "retro", outcome: "victory" },
          run: completeNode(runAtNode, node.id),
        };
      }

      return {
        screen: { name: node.kind, nodeId: node.id } as Extract<
          Screen,
          { name: Exclude<MapNodeKind, "cycle" | "boss" | "retro"> }
        >,
        run: runAtNode,
      };
    }

    case "PLAY_CARD": {
      if (state.screen.name !== "cycle" || !state.run?.cycle) return state;
      const cycle = state.run.cycle;
      const instance = cycle.hand.find((candidate) => candidate.instanceId === action.instanceId);
      if (!instance) return state;

      const resolution = resolveCardTarget(state.run, instance, action.target);
      if (!resolution.legal) return state;

      const tasks = cycle.tasks.map((task) => {
        if (task.taskId !== resolution.taskId) return task;
        if (resolution.kind === "review") {
          return {
            ...verifyTask(task, resolution.amount),
            stunned: resolution.stun || task.stunned,
          };
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
      });
      const triggeredPassiveIds = [
        ...cycle.triggeredPassiveIds,
        ...resolution.triggeredPassiveIds.filter((id) => !cycle.triggeredPassiveIds.includes(id)),
      ];
      const passiveDraw =
        resolution.kind === "work" && resolution.cardsDrawn > 0
          ? drawCards(
              cycle.drawPile,
              cycle.discardPile,
              resolution.cardsDrawn,
              state.run.tools.includes("noise-cancelling-headphones"),
            )
          : undefined;
      const nextCycle: CycleState = {
        ...cycle,
        focus: cycle.focus - resolution.cost,
        block: cycle.block + resolution.blockGained,
        techDebtAdded: cycle.techDebtAdded + resolution.techDebtAdded,
        tasks,
        drawPile: passiveDraw?.drawPile ?? cycle.drawPile,
        hand: [
          ...cycle.hand.filter((candidate) => candidate.instanceId !== instance.instanceId),
          ...(passiveDraw?.drawn ?? []),
        ],
        discardPile: [...(passiveDraw?.discardPile ?? cycle.discardPile), instance],
        triggeredPassiveIds,
      };
      let nextRun: RunState = { ...state.run, cycle: nextCycle };
      nextRun = addTechDebt(nextRun, resolution.techDebtAdded);
      return { ...state, run: nextRun };
    }

    case "END_DAY":
      if (state.screen.name !== "cycle" || !state.run?.cycle) return state;
      return endDay(state.run, state.run.cycle);

    case "SHIP_TASK": {
      if (state.screen.name !== "cycle" || !state.run?.cycle) return state;
      const shipped = applyTaskShipping(state.run, state.run.cycle, action.taskId);
      if (!shipped) return state;
      if (shipped.run.morale <= 0) return taskShippingDefeat(shipped.run);
      return isCycleShipped(shipped.cycle)
        ? completeShippedCycle(shipped.run, shipped.cycle)
        : { ...state, run: shipped.run };
    }

    case "CONTINUE_REPORT":
      if (state.screen.name !== "report" || !state.run) return state;
      return {
        ...state,
        screen: state.run.pendingCardReward ? { name: "reward" } : { name: "map" },
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
        screen: { name: "map" },
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
      const completedRun = completeNode(state.run, state.screen.nodeId);
      const run =
        action.choice === "push-back"
          ? { ...completedRun, morale: Math.min(10, completedRun.morale + 2) }
          : addTechDebt({ ...completedRun, credits: completedRun.credits + 35 }, 3);
      return { screen: { name: "map" }, run };
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
