import { describe, expect, it } from "vitest";
import type { DeveloperId } from "../domain/models";
import { gameReducer, initialGameState } from "./gameReducer";
import type { GameState } from "./gameReducer";
import { getCardPresentation } from "./presentation";

function startCycle(squad: readonly DeveloperId[]): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN" });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  return gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
}

describe("getCardPresentation", () => {
  it("promotes a signature card plus its passive to a hero reaction", () => {
    const state = startCycle(["paul", "irene", "madi"]);
    const run = state.run;
    const instance = run?.cycle?.hand.find((card) => card.cardId === "agent-swarm");
    if (!run || !instance) throw new Error("Expected Agent Swarm in hand");

    const presentation = getCardPresentation(run, instance, {
      taskId: "status-composer",
      discipline: "backend",
    });

    expect(presentation).toMatchObject({
      cue: {
        developerId: "madi",
        level: "hero",
        title: "Agent Swarm",
      },
      triggeredPassiveIds: ["madi"],
    });
  });

  it("keeps an ordinary passive contribution compact", () => {
    const state = startCycle(["paul", "odin", "irene"]);
    const baseRun = state.run;
    if (!baseRun?.cycle) throw new Error("Expected an active Cycle");
    const run = {
      ...baseRun,
      cycle: {
        ...baseRun.cycle,
        tasks: baseRun.cycle.tasks.map((task) => ({
          ...task,
          requirements: task.requirements.map((requirement) => ({
            ...requirement,
            verified: requirement.discipline === "frontend" ? requirement.target - 3 : 0,
          })),
        })),
        hand: [...baseRun.cycle.hand, { cardId: "frontend-3", instanceId: "test-frontend-3" }],
      },
    };
    const instance = run?.cycle?.hand.find((card) => card.cardId === "frontend-3");
    if (!run || !instance) throw new Error("Expected Frontend in hand");

    const presentation = getCardPresentation(run, instance, {
      taskId: "status-composer",
      discipline: "frontend",
    });

    expect(presentation?.cue).toMatchObject({
      developerId: "irene",
      level: "micro",
      title: "Quietly Done",
    });
  });
});
