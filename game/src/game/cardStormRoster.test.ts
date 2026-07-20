import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard } from "../domain/content";
import type { CardInstance, DeveloperId, Discipline } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { effectiveCardCost } from "./rules";
import { useTestCycle } from "./testSupport";

function startCycle(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId],
  cycleId = "presence-upgrade",
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0xca2d5702 });
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
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-2" });
  state = useTestCycle(state, cycleId);
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: { ...state.run, cycle: { ...state.run.cycle, focus: 30 } },
  };
}

function withHand(state: GameState, ...cardIds: string[]): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  const cards: CardInstance[] = cardIds.map((cardId, index) => ({
    cardId,
    instanceId: `storm-${cardId}-${index}-${state.run!.cycle!.cardsPlayedThisCycle}`,
  }));
  return {
    ...state,
    run: { ...state.run, cycle: { ...state.run.cycle, hand: cards } },
  };
}

function withDraw(state: GameState, ...cardIds: string[]): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        drawPile: cardIds.map((cardId, index) => ({
          cardId,
          instanceId: `storm-draw-${cardId}-${index}`,
        })),
        discardPile: [],
      },
    },
  };
}

function play(
  state: GameState,
  cardId: string,
  target:
    | { kind: "squad" }
    | { kind: "hand-card"; instanceId: string }
    | { kind: "exhaust-card"; instanceId: string }
    | { taskId: string; discipline?: Discipline },
): GameState {
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId} in hand`);
  return gameReducer(state, { type: "PLAY_CARD", instanceId: instance.instanceId, target });
}

describe("Kirsten's Generated learner", () => {
  it("authors the locked seven-card catalogue and reward ownership", () => {
    expect(getCard("give-it-a-go").ownerId).toBe("kirsten");
    expect(
      [
        "ask-a-good-question",
        "try-a-different-way",
        "second-attempt",
        "it-all-adds-up",
        "on-a-roll",
        "fast-learner",
      ].every((id) => eligibleRewardCardIds(["kirsten"]).includes(id)),
    ).toBe(true);
  });

  it("buffs every printed token output and scales the Card Storm payoffs", () => {
    let state = withHand(
      startCycle(["kirsten", "irene", "paul"]),
      "give-it-a-go",
      "it-all-adds-up",
      "on-a-roll",
    );
    state = play(state, "give-it-a-go", { kind: "squad" });
    expect(state.run?.cycle?.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["snippet", "checklist", "comment"]),
    );
    state = play(state, "snippet", { taskId: "status-composer", discipline: "frontend" });
    state = play(state, "checklist", { kind: "squad" });
    expect(state.run?.cycle).toMatchObject({
      block: 2,
      generatedCardsPlayedThisDay: 2,
    });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(2);

    const focusBefore = state.run?.cycle?.focus ?? 0;
    state = play(state, "on-a-roll", { kind: "squad" });
    expect(state.run?.cycle?.focus).toBe(focusBefore + 1);
    state = play(state, "it-all-adds-up", {
      taskId: "reconnect-logic",
      discipline: "backend",
    });
    expect(state.run?.cycle?.tasks[1]?.requirements[0]?.verified).toBe(3);
  });

  it("retrieves Generated cards and makes safe full-definition temporary copies", () => {
    let state = withHand(
      startCycle(["kirsten", "irene", "paul"]),
      "give-it-a-go",
      "second-attempt",
      "fast-learner",
      "backend-3",
    );
    state = play(state, "give-it-a-go", { kind: "squad" });
    state = play(state, "snippet", { taskId: "status-composer", discipline: "frontend" });
    const snippet = state.run?.cycle?.exhaustPile.find((card) => card.cardId === "snippet");
    if (!snippet) throw new Error("Expected an Exhausted Snippet");
    const handSizeBeforeRetrieval = state.run?.cycle?.hand.length ?? 0;
    state = play(state, "second-attempt", {
      kind: "exhaust-card",
      instanceId: snippet.instanceId,
    });
    expect(state.run?.cycle?.hand.some((card) => card.instanceId === snippet.instanceId)).toBe(
      true,
    );
    expect(state.run?.cycle?.hand).toHaveLength(handSizeBeforeRetrieval + 1);

    state = play(state, "backend-3", {
      taskId: "reconnect-logic",
      discipline: "backend",
    });
    state = play(state, "fast-learner", { kind: "squad" });
    const learned = state.run?.cycle?.hand.find((card) => card.cardId === "learned-backend-3");
    expect(learned).toMatchObject({ generated: true });
    expect(learned?.dynamicDefinition).toMatchObject({
      cost: 0,
      amount: 3,
      workKind: "unverified",
      exhaust: true,
    });
    state = gameReducer(state, {
      type: "PLAY_CARD",
      instanceId: learned!.instanceId,
      target: { taskId: "status-composer", discipline: "backend" },
    });
    expect(state.run?.cycle?.tasks[0]?.requirements[1]?.unverified).toBe(3);
  });
});

describe("Nick's Exhaust planner", () => {
  it("authors the locked seven-card catalogue and reward ownership", () => {
    expect(getCard("clear-the-calendar").ownerId).toBe("nick");
    expect(
      [
        "put-a-pin-in-it",
        "inbox-zero",
        "prioritise-ruthlessly",
        "timebox-it",
        "deep-work",
        "no-meetings",
      ].every((id) => eligibleRewardCardIds(["nick"]).includes(id)),
    ).toBe(true);
  });

  it("Exhausts chosen and Status cards for uncapped Focus and replacement draw", () => {
    let state = withDraw(
      withHand(
        startCycle(["nick", "irene", "paul"]),
        "clear-the-calendar",
        "frontend-3",
        "inbox-zero",
        "distraction",
        "tech-debt",
      ),
      "backend-3",
      "infra-3",
      "flexible-2",
      "review-3",
    );
    const frontend = state.run?.cycle?.hand.find((card) => card.cardId === "frontend-3")!;
    const focusBefore = state.run?.cycle?.focus ?? 0;
    state = play(state, "clear-the-calendar", {
      kind: "hand-card",
      instanceId: frontend.instanceId,
    });
    expect(state.run?.cycle).toMatchObject({ focus: focusBefore, cardsExhaustedThisDay: 1 });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("frontend-3");

    state = play(state, "inbox-zero", { kind: "squad" });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["distraction", "tech-debt", "inbox-zero"]),
    );
    expect(state.run?.cycle?.cardsExhaustedThisDay).toBe(4);
  });

  it("Retains discounted plans, reorders Draw, and cashes setup into Work and Block", () => {
    let state = withDraw(
      withHand(
        startCycle(["nick", "irene", "paul"]),
        "put-a-pin-in-it",
        "deep-work",
        "timebox-it",
        "prioritise-ruthlessly",
      ),
      "frontend-3",
      "backend-3",
      "infra-3",
    );
    const deepWork = state.run?.cycle?.hand.find((card) => card.cardId === "deep-work")!;
    state = play(state, "put-a-pin-in-it", {
      kind: "hand-card",
      instanceId: deepWork.instanceId,
    });
    const retained = state.run?.cycle?.hand.find((card) => card.cardId === "deep-work")!;
    expect(retained).toMatchObject({ retained: true, costReduction: 1 });
    expect(
      effectiveCardCost(getCard("deep-work"), state.run!.cycle!, state.run!.squad, retained),
    ).toBe(0);

    state = play(state, "timebox-it", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(3);
    state = play(state, "deep-work", {
      taskId: "reconnect-logic",
      discipline: "backend",
    });
    expect(state.run?.cycle?.tasks[1]?.requirements[0]?.verified).toBe(4);

    state = play(state, "prioritise-ruthlessly", { kind: "squad" });
    expect(state.run?.cycle?.pendingCardChoice).toMatchObject({ remaining: 2 });
    const choices = state.run?.cycle?.hand.slice(0, 2) ?? [];
    state = gameReducer(state, { type: "CHOOSE_CYCLE_CARD", instanceId: choices[0]!.instanceId });
    state = gameReducer(state, { type: "CHOOSE_CYCLE_CARD", instanceId: choices[1]!.instanceId });
    expect(state.run?.cycle?.pendingCardChoice).toBeUndefined();
    expect(state.run?.cycle?.drawPile.slice(0, 2).map((card) => card.instanceId)).toEqual(
      choices.map((card) => card.instanceId),
    );
  });

  it("turns the whole hand into Focus before No Meetings draws only the current pile", () => {
    let state = withDraw(
      withHand(
        startCycle(["nick", "irene", "paul"]),
        "no-meetings",
        "frontend-3",
        "backend-3",
        "distraction",
      ),
      "infra-3",
      "flexible-2",
    );
    const focusBefore = state.run?.cycle?.focus ?? 0;
    state = play(state, "no-meetings", { kind: "squad" });
    expect(state.run?.cycle?.focus).toBe(focusBefore - 1 + 4);
    expect(state.run?.cycle?.hand.map((card) => card.cardId)).toEqual(["infra-3", "flexible-2"]);
    expect(state.run?.cycle?.drawPile).toHaveLength(0);
  });
});

describe("Levi's Chain combo", () => {
  it("authors the locked seven-card catalogue and reward ownership", () => {
    expect(getCard("heads-down").ownerId).toBe("levi");
    expect(
      [
        "tiny-commit",
        "keep-the-thread",
        "stacked-prs",
        "do-not-disturb",
        "context-loaded",
        "flow-state",
      ].every((id) => eligibleRewardCardIds(["levi"]).includes(id)),
    ).toBe(true);
  });

  it("advances Chain before Momentum and converts the combo into draw, Block, and tokens", () => {
    let state = withDraw(
      withHand(
        startCycle(["levi", "irene", "paul"], "marketing-site-astro"),
        "heads-down",
        "tiny-commit",
        "keep-the-thread",
        "do-not-disturb",
        "context-loaded",
      ),
      "backend-3",
    );
    state = play(state, "heads-down", { taskId: "astro-migration", discipline: "frontend" });
    expect(state.run?.cycle).toMatchObject({
      chain: { taskId: "astro-migration", count: 2 },
    });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(5);

    state = play(state, "tiny-commit", { taskId: "astro-migration", discipline: "frontend" });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(9);
    state = play(state, "keep-the-thread", {
      taskId: "astro-migration",
      discipline: "frontend",
    });
    expect(state.run?.cycle?.chain.count).toBe(4);
    expect(state.run?.cycle?.hand.some((card) => card.cardId === "backend-3")).toBe(true);

    state = play(state, "do-not-disturb", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(8);
    state = play(state, "context-loaded", { kind: "squad" });
    expect(state.run?.cycle?.hand.filter((card) => card.cardId === "snippet")).toHaveLength(2);
  });

  it("stacks extra advances and lets Flow State carry Momentum across Tasks for one Day", () => {
    let state = withHand(
      startCycle(["levi", "irene", "paul"]),
      "stacked-prs",
      "flow-state",
      "frontend-3",
    );
    state = play(state, "stacked-prs", {
      taskId: "status-composer",
      discipline: "frontend",
    });
    expect(state.run?.cycle?.chain).toMatchObject({ taskId: "status-composer", count: 3 });
    state = play(state, "flow-state", { kind: "squad" });
    expect(state.run?.cycle?.chain).toMatchObject({ count: 6, transfersBetweenTasks: true });
    state = play(state, "frontend-3", {
      taskId: "reconnect-logic",
      discipline: "infra",
    });
    expect(state.run?.cycle?.chain).toMatchObject({ taskId: "reconnect-logic", count: 7 });

    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.chain).toEqual({ count: 0, transfersBetweenTasks: false });
  });
});
