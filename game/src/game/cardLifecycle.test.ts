import { describe, expect, it } from "vitest";
import type { CardInstance, DeveloperId } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { createCycleReport } from "./rules";
import { useTestCycle } from "./testSupport";

function startCycle(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["paul", "irene", "madi"],
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0xc0b0 });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  state = {
    screen: { name: "map" },
    run: {
      ...state.run,
      currentNodeId: "event-1",
      completedNodeIds: ["cycle-1", "event-1"],
    },
  };
  return useTestCycle(
    gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-2" }),
    "presence-upgrade",
  );
}

function withHand(state: GameState, ...cardIds: string[]): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  const cards: CardInstance[] = cardIds.map((cardId, index) => ({
    cardId,
    instanceId: `lifecycle-${cardId}-${index}`,
  }));
  return {
    ...state,
    run: {
      ...state.run,
      cycle: { ...state.run.cycle, focus: 20, hand: cards },
    },
  };
}

function play(
  state: GameState,
  cardId: string,
  target: { kind: "squad" } | { taskId: string; discipline?: "frontend" | "backend" | "infra" },
): GameState {
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId} in hand`);
  return gameReducer(state, { type: "PLAY_CARD", instanceId: instance.instanceId, target });
}

describe("shared card lifecycle", () => {
  it("records Generated provenance, Exhaust metadata, history, and Cycle-only persistence", () => {
    let state = withHand(startCycle(), "new-model-dropped");
    const persistentDeck = state.run?.deck;
    state = play(state, "new-model-dropped", { kind: "squad" });

    const generated = state.run?.cycle?.hand.find((card) => card.cardId === "quick-fix");
    expect(generated).toMatchObject({
      generated: true,
      generatedBy: {
        sourceCardId: "new-model-dropped",
        sourceInstanceId: "lifecycle-new-model-dropped-0",
        day: 1,
      },
    });
    expect(state.run?.deck).toEqual(persistentDeck);

    state = play(state, "quick-fix", {
      taskId: "status-composer",
      discipline: "frontend",
    });
    expect(state.run?.cycle?.exhaustPile.at(-1)).toMatchObject({
      cardId: "quick-fix",
      generated: true,
      exhausted: { day: 1, cause: "played" },
    });
    expect(state.run?.history.at(-1)).toMatchObject({
      kind: "card-played",
      cardId: "quick-fix",
      generated: true,
      generatedByCardId: "new-model-dropped",
      exhausted: true,
      cardsPlayedThisDay: 2,
    });
    expect(state.run?.cycle).toMatchObject({
      cardsPlayedThisDay: 2,
      cardsPlayedThisCycle: 2,
      generatedCardsPlayedThisDay: 1,
      generatedCardsPlayedThisCycle: 1,
      cardsExhaustedThisDay: 1,
      cardsExhaustedThisCycle: 1,
    });

    const roundTripped = JSON.parse(JSON.stringify(state)) as GameState;
    expect(roundTripped.run?.cycle?.exhaustPile.at(-1)).toEqual(
      state.run?.cycle?.exhaustPile.at(-1),
    );
    const report = createCycleReport(state.run!.cycle!, "missed", 0, 0, 0);
    expect(report).toMatchObject({
      cardsPlayed: 2,
      generatedCardsPlayed: 1,
      cardsExhausted: 1,
      peakChain: 1,
    });
  });

  it("moves Chain between Tasks, ignores squad plays, and resets its Day state", () => {
    let state = withHand(startCycle(), "frontend-3", "backend-3", "standup-cover", "infra-3");
    state = play(state, "frontend-3", {
      taskId: "status-composer",
      discipline: "frontend",
    });
    expect(state.run?.cycle).toMatchObject({
      lastTargetedTaskId: "status-composer",
      chain: { taskId: "status-composer", count: 1 },
      peakChain: 1,
    });

    state = play(state, "backend-3", {
      taskId: "status-composer",
      discipline: "backend",
    });
    expect(state.run?.cycle?.chain).toMatchObject({ taskId: "status-composer", count: 2 });
    state = play(state, "standup-cover", { kind: "squad" });
    expect(state.run?.cycle?.chain).toMatchObject({ taskId: "status-composer", count: 2 });

    state = play(state, "infra-3", {
      taskId: "reconnect-logic",
      discipline: "infra",
    });
    expect(state.run?.cycle).toMatchObject({
      lastTargetedTaskId: "reconnect-logic",
      chain: { taskId: "reconnect-logic", count: 1 },
      peakChain: 2,
    });

    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle).toMatchObject({
      cardsPlayedThisDay: 0,
      generatedCardsPlayedThisDay: 0,
      cardsExhaustedThisDay: 0,
      chain: { count: 0, transfersBetweenTasks: false },
    });
    expect(state.run?.cycle?.lastPlayedCard).toBeUndefined();
    expect(state.run?.cycle?.lastTargetedTaskId).toBeUndefined();
    expect(state.run?.cycle?.cardsPlayedThisCycle).toBe(4);
    expect(state.run?.cycle?.peakChain).toBe(2);
  });
});
