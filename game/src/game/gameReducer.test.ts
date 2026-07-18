import { describe, expect, it } from "vitest";
import type { DeveloperId, Discipline } from "../domain/models";
import { gameReducer, initialGameState } from "./gameReducer";
import type { GameState } from "./gameReducer";

function startCycle(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["paul", "irene", "madi"],
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN" });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  return gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
}

function playCard(
  state: GameState,
  cardId: string,
  taskId: string,
  discipline?: Discipline,
): GameState {
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`${cardId} is not in hand`);
  return gameReducer(state, {
    type: "PLAY_CARD",
    instanceId: instance.instanceId,
    target: { taskId, discipline },
  });
}

describe("gameReducer", () => {
  it("builds a 12-card deck from three character cards and nine Basics", () => {
    const state = startCycle();
    expect(state.run?.deck).toHaveLength(12);
    expect(state.run?.deck.map((card) => card.cardId)).toEqual([
      "vibe-code",
      "already-fixed",
      "agent-swarm",
      "frontend-3",
      "frontend-3",
      "backend-3",
      "backend-3",
      "infra-3",
      "infra-3",
      "flexible-2",
      "flexible-2",
      "review-3",
    ]);
    expect(state.run?.cycle?.hand).toHaveLength(5);
  });

  it("uses Pitch In for one Unverified Work on a mismatched requirement", () => {
    let state = startCycle();
    state = playCard(state, "frontend-3", "status-composer", "backend");

    const backend = state.run?.cycle?.tasks[0]?.requirements.find(
      (requirement) => requirement.discipline === "backend",
    );
    expect(backend).toMatchObject({ verified: 0, unverified: 1 });
    expect(state.run?.cycle?.focus).toBe(3);
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("paul");
    expect(state.run?.cycle?.triggeredPassiveIds).not.toContain("madi");
  });

  it("cancels a Ready Task intent and adds a temporary Distraction", () => {
    let state = startCycle();
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");
    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.morale).toBe(10);
    expect(state.run?.cycle?.day).toBe(2);
    expect(state.run?.cycle?.resolvedIntents).toEqual(["Interruption · +1 Distraction"]);
    expect(state.run?.cycle?.hand[0]?.cardId).toBe("distraction");
  });

  it("takes telegraphed Morale damage from an Open Task at End Day", () => {
    const state = gameReducer(startCycle(), { type: "END_DAY" });
    expect(state.run?.morale).toBe(9);
    expect(state.run?.cycle?.resolvedIntents).toContain("Crunch · −1 Morale");
  });

  it("applies Review and Odin's first Review bonus deterministically", () => {
    let state = startCycle(["paul", "odin", "madi"]);
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    state = playCard(state, "design-review", "status-composer");

    const frontend = state.run?.cycle?.tasks[0]?.requirements[0];
    expect(frontend).toMatchObject({ verified: 5, unverified: 0 });
    expect(state.run?.cycle?.triggeredPassiveIds).toEqual(["paul", "madi", "odin"]);
  });

  it("ships every Ready Task with exact Defect, Morale, and credit consequences", () => {
    let state = startCycle();
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");
    state = gameReducer(state, { type: "END_DAY" });
    state = playCard(state, "backend-3", "reconnect-logic", "backend");
    state = playCard(state, "infra-3", "reconnect-logic", "infra");
    state = playCard(state, "infra-3", "reconnect-logic", "infra");
    state = gameReducer(state, { type: "SHIP_CYCLE" });

    expect(state.screen.name).toBe("report");
    if (state.screen.name !== "report") throw new Error("Expected report");
    expect(state.screen.report).toMatchObject({
      outcome: "shipped",
      defects: 1,
      moraleDelta: -1,
      creditsGained: 25,
      techDebtAdded: false,
    });
    expect(state.run?.morale).toBe(9);
    expect(state.run?.credits).toBe(65);
    expect(state.run?.completedNodeIds).toContain("cycle-1");
  });

  it("misses at the final deadline, loses Morale, and adds Tech Debt", () => {
    let state = startCycle();
    state = gameReducer(state, { type: "END_DAY" });
    state = gameReducer(state, { type: "END_DAY" });
    state = gameReducer(state, { type: "END_DAY" });

    expect(state.screen.name).toBe("report");
    if (state.screen.name !== "report") throw new Error("Expected report");
    expect(state.screen.report).toMatchObject({
      outcome: "missed",
      moraleDelta: -5,
      creditsGained: 0,
      techDebtAdded: true,
    });
    expect(state.run?.morale).toBe(5);
    expect(state.run?.deck.at(-1)?.cardId).toBe("tech-debt");
  });

  it("does not allow more than three developers", () => {
    let state = gameReducer(initialGameState, { type: "START_RUN" });
    for (const developerId of ["paul", "odin", "irene", "madi"] as const) {
      state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
    }
    expect(state.run?.squad).toEqual(["paul", "odin", "irene"]);
  });

  it.each([
    ["event-1", "event"],
    ["shop-1", "shop"],
    ["retro-1", "retro"],
  ] as const)("routes %s to the %s placeholder", (nodeId, screenName) => {
    let state = gameReducer(initialGameState, { type: "START_RUN" });
    state = { ...state, screen: { name: "map" } };
    state = gameReducer(state, { type: "VISIT_NODE", nodeId });
    expect(state.screen.name).toBe(screenName);
  });
});
