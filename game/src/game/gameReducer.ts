import {
  formatIntent,
  getCycle,
  getDeveloper,
  isMapNodeAvailable,
  mapNodes,
  starterBasicCardIds,
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
} from "../domain/models";
import {
  createCycleReport,
  getCurrentIntent,
  isCycleReady,
  isTaskReady,
  resolveCardTarget,
  shippingPreview,
  verifyTask,
} from "./rules";
import type { CardTarget } from "./rules";

type Screen =
  | { name: "title" }
  | { name: "squad" }
  | { name: "map" }
  | { name: "cycle"; nodeId: string; cycleId: string }
  | { name: "report"; report: CycleReport }
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
  | { type: "START_RUN" }
  | { type: "TOGGLE_DEVELOPER"; developerId: DeveloperId }
  | { type: "CONFIRM_SQUAD" }
  | { type: "VISIT_NODE"; nodeId: string }
  | {
      type: "PLAY_CARD";
      instanceId: string;
      target: CardTarget;
    }
  | { type: "END_DAY" }
  | { type: "SHIP_CYCLE" }
  | { type: "CONTINUE_REPORT" }
  | { type: "CHOOSE_EVENT"; choice: "push-back" | "sure-easy" }
  | { type: "LEAVE_NODE" }
  | { type: "RETURN_TITLE" };

export const initialGameState: GameState = {
  screen: { name: "title" },
  run: null,
};

function createRun(): RunState {
  return {
    squad: [],
    deck: [],
    tools: [],
    morale: 10,
    credits: 40,
    completedNodeIds: [],
    cycle: null,
  };
}

function createCardInstances(cardIds: readonly string[]): CardInstance[] {
  return cardIds.map((cardId, index) => ({
    instanceId: `${cardId}-${index + 1}`,
    cardId,
  }));
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
    if (next) drawn.push(next);
  }

  return { drawPile, discardPile, drawn };
}

function createCycleState(run: RunState, nodeId: string, cycleId: string): CycleState {
  const definition = getCycle(cycleId);
  const firstDraw = drawCards(run.deck, [], 5);
  return {
    nodeId,
    cycleId,
    startingMorale: run.morale,
    day: 1,
    focus: 3,
    tasks: definition.tasks.map((task) => ({
      taskId: task.id,
      requirements: task.requirements.map((requirement) => ({
        ...requirement,
        verified: 0,
        unverified: 0,
      })),
    })),
    drawPile: firstDraw.drawPile,
    hand: firstDraw.drawn,
    discardPile: firstDraw.discardPile,
    blockedDisciplines: [],
    triggeredPassiveIds: [],
    resolvedIntents: [],
    temporaryCardCounter: 0,
  };
}

function addTechDebt(run: RunState): RunState {
  return {
    ...run,
    deck: [
      ...run.deck,
      {
        cardId: "tech-debt",
        instanceId: `tech-debt-${run.deck.length + 1}`,
      },
    ],
  };
}

function finishCycle(
  run: RunState,
  cycle: CycleState,
  report: CycleReport,
  finalMorale: number,
  creditsGained: number,
  techDebtAdded: boolean,
): GameState {
  let nextRun: RunState = {
    ...completeNode(run, cycle.nodeId),
    morale: finalMorale,
    credits: run.credits + creditsGained,
    cycle: null,
  };
  if (techDebtAdded) nextRun = addTechDebt(nextRun);

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

  return { screen: { name: "report", report }, run: nextRun };
}

function shipCycle(run: RunState, cycle: CycleState): GameState {
  const definition = getCycle(cycle.cycleId);
  const preview = shippingPreview(cycle);
  const creditsGained = 20 + (definition.maxDays - cycle.day) * 5;
  const finalMorale = run.morale - preview.moraleLoss;
  const moraleDelta = finalMorale - cycle.startingMorale;
  const report = createCycleReport(cycle, "shipped", moraleDelta, creditsGained, preview.techDebt);

  return finishCycle(run, cycle, report, finalMorale, creditsGained, preview.techDebt);
}

function missCycle(run: RunState, cycle: CycleState): GameState {
  const finalMorale = run.morale - 3;
  const report = createCycleReport(cycle, "missed", finalMorale - cycle.startingMorale, 0, true);
  return finishCycle(run, cycle, report, finalMorale, 0, true);
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
  const blockedDisciplines: Discipline[] = [];
  const resolvedIntents: string[] = [];
  let interruptions = 0;

  for (const taskAtStart of cycle.tasks) {
    const currentTask = tasks.find((task) => task.taskId === taskAtStart.taskId);
    if (!currentTask || isTaskReady(currentTask)) continue;
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
        morale -= intent.moraleLoss;
        break;
    }

    if (morale <= 0) break;
  }

  const resolvedCycle: CycleState = {
    ...cycle,
    tasks,
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
    return isCycleReady(resolvedCycle)
      ? shipCycle(nextRun, resolvedCycle)
      : missCycle(nextRun, resolvedCycle);
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
  );
  const nextCycle: CycleState = {
    ...resolvedCycle,
    day: cycle.day + 1,
    focus: 3,
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
      return { screen: { name: "squad" }, run: createRun() };

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
      return {
        screen: { name: "map" },
        run: { ...state.run, deck: createCardInstances(cardIds) },
      };
    }

    case "VISIT_NODE": {
      if (state.screen.name !== "map" || !state.run) return state;
      const node = mapNodes.find((candidate) => candidate.id === action.nodeId);
      if (
        !node ||
        state.run.completedNodeIds.includes(node.id) ||
        !isMapNodeAvailable(node, state.run.completedNodeIds)
      ) {
        return state;
      }

      if (node.kind === "cycle" && node.cycleId) {
        const cycle = createCycleState(state.run, node.id, node.cycleId);
        return {
          screen: { name: "cycle", nodeId: node.id, cycleId: node.cycleId },
          run: { ...state.run, cycle },
        };
      }

      if (node.kind === "retro") {
        return {
          screen: { name: "retro", outcome: "victory" },
          run: completeNode(state.run, node.id),
        };
      }

      return {
        screen: { name: node.kind, nodeId: node.id } as Extract<
          Screen,
          { name: Exclude<MapNodeKind, "cycle" | "retro"> }
        >,
        run: state.run,
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
          return verifyTask(task, resolution.amount);
        }
        return {
          ...task,
          requirements: task.requirements.map((requirement) =>
            requirement.discipline !== resolution.discipline
              ? requirement
              : {
                  ...requirement,
                  [resolution.workKind]: requirement[resolution.workKind] + resolution.amount,
                },
          ),
        };
      });
      const triggeredPassiveIds = [
        ...cycle.triggeredPassiveIds,
        ...resolution.triggeredPassiveIds.filter((id) => !cycle.triggeredPassiveIds.includes(id)),
      ];
      const nextCycle: CycleState = {
        ...cycle,
        focus: cycle.focus - resolution.cost,
        tasks,
        hand: cycle.hand.filter((candidate) => candidate.instanceId !== instance.instanceId),
        discardPile: [...cycle.discardPile, instance],
        triggeredPassiveIds,
      };
      return { ...state, run: { ...state.run, cycle: nextCycle } };
    }

    case "END_DAY":
      if (state.screen.name !== "cycle" || !state.run?.cycle) return state;
      return endDay(state.run, state.run.cycle);

    case "SHIP_CYCLE":
      if (state.screen.name !== "cycle" || !state.run?.cycle || !isCycleReady(state.run.cycle)) {
        return state;
      }
      return shipCycle(state.run, state.run.cycle);

    case "CONTINUE_REPORT":
      return state.screen.name === "report" ? { ...state, screen: { name: "map" } } : state;

    case "CHOOSE_EVENT": {
      if (state.screen.name !== "event" || !state.run) return state;
      const completedRun = completeNode(state.run, state.screen.nodeId);
      const run =
        action.choice === "push-back"
          ? { ...completedRun, morale: Math.min(10, completedRun.morale + 2) }
          : addTechDebt({ ...completedRun, credits: completedRun.credits + 35 });
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
