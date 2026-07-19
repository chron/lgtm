import { describe, expect, it } from "vitest";
import { canRefactorCard } from "../domain/shop";
import {
  getWeekendChoiceState,
  weekendSideGigCredits,
  weekendSideGigMoraleCost,
} from "../domain/weekend";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";

function startWeekend(morale = 6): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
  for (const developerId of ["paul", "odin", "madi"] as const) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  state = {
    screen: { name: "map" },
    run: {
      ...state.run,
      morale,
      currentNodeId: "event-2",
      completedNodeIds: ["cycle-1", "event-1", "cycle-2", "incident-1", "event-2"],
    },
  };
  return gameReducer(state, { type: "VISIT_NODE", nodeId: "weekend-1" });
}

describe("Weekend stop", () => {
  it("rests for up to four Morale and completes the node", () => {
    let state = startWeekend(8);
    expect(state.screen).toEqual({ name: "weekend", nodeId: "weekend-1" });

    state = gameReducer(state, { type: "CHOOSE_WEEKEND", choiceId: "rest" });

    expect(state.screen).toEqual({ name: "map" });
    expect(state.run?.morale).toBe(10);
    expect(state.run?.completedNodeIds).toContain("weekend-1");
    expect(state.run?.history.at(-1)).toEqual({
      kind: "weekend-resolved",
      nodeId: "weekend-1",
      choiceId: "rest",
      outcome: ["+2 Morale"],
    });
  });

  it("makes a Side Gig lucrative but never lets it zero Morale", () => {
    let state = startWeekend(3);
    const startingCredits = state.run?.credits ?? 0;

    state = gameReducer(state, { type: "CHOOSE_WEEKEND", choiceId: "side-gig" });

    expect(state.run).toMatchObject({
      morale: 3 - weekendSideGigMoraleCost,
      credits: startingCredits + weekendSideGigCredits,
    });

    const unsafe = startWeekend(2);
    expect(getWeekendChoiceState("side-gig", unsafe.run!).disabledReason).toBe("Need 3 Morale");
    expect(gameReducer(unsafe, { type: "CHOOSE_WEEKEND", choiceId: "side-gig" })).toBe(unsafe);
  });

  it("Refactors one eligible card through an explicit instance choice", () => {
    let state = startWeekend();
    if (state.screen.name !== "weekend" || !state.run) throw new Error("Expected a Weekend");
    const removed = state.run.deck.find((card) => canRefactorCard(state.run!, card))!;

    state = gameReducer(state, {
      type: "CHOOSE_WEEKEND",
      choiceId: "refactor",
      instanceId: removed.instanceId,
    });

    expect(state.run?.deck).not.toContainEqual(removed);
    expect(state.run?.deck).toHaveLength(9);
    expect(state.run?.completedNodeIds).toContain("weekend-1");
  });

  it("keeps full-Morale Rest and minimum-deck Refactor visibly unavailable", () => {
    const full = startWeekend(10);
    expect(getWeekendChoiceState("rest", full.run!)).toEqual({
      disabledReason: "Morale full",
      outcomes: ["Morale full"],
    });

    const minimum = {
      ...full.run!,
      deck: full.run!.deck.slice(0, 5),
    };
    expect(getWeekendChoiceState("refactor", minimum).disabledReason).toBe("No removable cards");
  });
});
