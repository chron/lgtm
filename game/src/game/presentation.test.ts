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
      triggeredPassiveIds: ["paul", "madi"],
    });
  });

  it("keeps an ordinary passive contribution compact", () => {
    const state = startCycle(["paul", "odin", "irene"]);
    const run = state.run;
    const instance = run?.cycle?.hand.find((card) => card.cardId === "frontend-3");
    if (!run || !instance) throw new Error("Expected Frontend in hand");

    const presentation = getCardPresentation(run, instance, {
      taskId: "status-composer",
      discipline: "frontend",
    });

    expect(presentation?.cue).toMatchObject({
      developerId: "irene",
      level: "micro",
      title: "Heads Down",
    });
  });
});
