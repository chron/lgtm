import { describe, expect, it } from "vitest";
import type { CardInstance, DeveloperId, ToolId } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";

function startCycle(
  nodeId: "cycle-1" | "cycle-2" = "cycle-1",
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["odin", "irene", "madi"],
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0xc47a7 });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  if (nodeId === "cycle-2") {
    state = {
      screen: { name: "map" },
      run: {
        ...state.run,
        currentNodeId: "event-1",
        completedNodeIds: ["cycle-1", "event-1"],
      },
    };
  }
  return gameReducer(state, { type: "VISIT_NODE", nodeId });
}

function withTools(state: GameState, ...toolIds: ToolId[]): GameState {
  if (!state.run) throw new Error("Expected a run");
  return { ...state, run: { ...state.run, tools: toolIds } };
}

function card(cardId: string, index: number): CardInstance {
  return { cardId, instanceId: `event-tool-${cardId}-${index}` };
}

function addCardToHand(state: GameState, cardId: string): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        hand: [...state.run.cycle.hand, card(cardId, state.run.cycle.hand.length)],
      },
    },
  };
}

describe("event-exclusive Tools", () => {
  it("lets every drawn Status trigger Cat Tax without a cap", () => {
    let state = withTools(startCycle(), "cat-tax");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          block: 20,
          hand: [],
          discardPile: [],
          drawPile: [
            card("tech-debt", 1),
            card("distraction", 2),
            card("frontend-3", 3),
            card("backend-3", 4),
            card("infra-3", 5),
            card("flexible-2", 6),
            card("review-3", 7),
          ],
        },
      },
    };

    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.hand).toHaveLength(7);
    expect(
      state.run?.cycle?.hand.filter((instance) =>
        ["tech-debt", "distraction"].includes(instance.cardId),
      ),
    ).toHaveLength(2);
  });

  it("draws for every non-final Task shipped with Reef Shark", () => {
    let state = withTools(startCycle("cycle-2"), "reef-shark");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const task = state.run.cycle.tasks[0];
    if (!task) throw new Error("Expected a Task");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          hand: [],
          drawPile: [card("frontend-3", 1)],
          discardPile: [],
          tasks: state.run.cycle.tasks.map((candidate) =>
            candidate.taskId === task.taskId
              ? {
                  ...candidate,
                  status: "ready" as const,
                  requirements: candidate.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.target,
                  })),
                }
              : candidate,
          ),
        },
      },
    };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: task.taskId });
    expect(state.screen.name).toBe("cycle");
    expect(state.run?.cycle?.hand.map((instance) => instance.cardId)).toEqual(["frontend-3"]);
  });

  it("adds one to every Script and Guard trigger with Platypus", () => {
    let scriptState = withTools(startCycle(), "platypus");
    if (!scriptState.run?.cycle) throw new Error("Expected an active Cycle");
    const scriptTask = scriptState.run.cycle.tasks[0];
    if (!scriptTask) throw new Error("Expected a Task");
    scriptState = addCardToHand(scriptState, "run-it-now");
    if (!scriptState.run?.cycle) throw new Error("Expected an active Cycle");
    const scriptCard = scriptState.run.cycle.hand.find(
      (instance) => instance.cardId === "run-it-now",
    );
    if (!scriptCard) throw new Error("Expected Run It Now");
    scriptState = {
      ...scriptState,
      run: {
        ...scriptState.run,
        cycle: {
          ...scriptState.run.cycle,
          tasks: scriptState.run.cycle.tasks.map((task) => ({
            ...task,
            requirements: task.requirements.map((requirement, index) => ({
              ...requirement,
              scriptPower: index === 0 ? 1 : 0,
            })),
          })),
        },
      },
    };
    scriptState = gameReducer(scriptState, {
      type: "PLAY_CARD",
      instanceId: scriptCard.instanceId,
      target: {
        taskId: scriptTask.taskId,
        discipline: scriptTask.requirements[0]?.discipline,
      },
    });
    expect(scriptState.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(2);

    let guardState = withTools(startCycle(), "platypus");
    if (!guardState.run?.cycle) throw new Error("Expected an active Cycle");
    guardState = {
      ...guardState,
      run: {
        ...guardState.run,
        cycle: {
          ...guardState.run.cycle,
          block: 20,
          tasks: guardState.run.cycle.tasks.map((task) => ({
            ...task,
            requirements: task.requirements.map((requirement, index) => ({
              ...requirement,
              scriptBlock: index === 0 ? 1 : 0,
            })),
          })),
        },
      },
    };
    guardState = gameReducer(guardState, { type: "END_DAY" });
    expect(guardState.run?.cycle?.block).toBe(2);
  });

  it("adds Block to every Block-granting card with Pangolin", () => {
    let state = addCardToHand(withTools(startCycle(), "pangolin"), "standup-cover");
    const instance = state.run?.cycle?.hand.find(
      (candidate) => candidate.cardId === "standup-cover",
    );
    if (!instance) throw new Error("Expected Standup Cover");
    state = gameReducer(state, {
      type: "PLAY_CARD",
      instanceId: instance.instanceId,
      target: { kind: "squad" },
    });
    expect(state.run?.cycle?.block).toBe(6);
  });

  it("carries all unspent Focus into the next Day with Timezone Wrangler", () => {
    let state = withTools(startCycle(), "timezone-wrangler");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: { ...state.run.cycle, focus: 2, block: 20 },
      },
    };
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.focus).toBe(5);
  });
});
