import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard } from "../domain/content";
import type { CardInstance, DeveloperId, Discipline } from "../domain/models";
import { gameReducer, initialGameState } from "./gameReducer";
import type { GameState } from "./gameReducer";

function startCycle(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["odin", "madi", "irene"],
  nodeId: "cycle-1" | "cycle-2" = "cycle-1",
  seed = 0x0d1a,
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  state = {
    screen: { name: "map" },
    run: {
      ...state.run,
      currentNodeId: nodeId === "cycle-2" ? "event-1" : null,
      completedNodeIds: nodeId === "cycle-2" ? ["cycle-1", "event-1"] : [],
    },
  };
  return gameReducer(state, { type: "VISIT_NODE", nodeId });
}

function addCardsToHand(state: GameState, ...cardIds: string[]): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  const cards: CardInstance[] = cardIds.map((cardId, index) => ({
    cardId,
    instanceId: `odin-test-${cardId}-${state.run?.cycle?.temporaryCardCounter ?? 0}-${index}`,
  }));
  return {
    ...state,
    run: {
      ...state.run,
      cycle: { ...state.run.cycle, hand: [...state.run.cycle.hand, ...cards] },
    },
  };
}

function seedUnverified(state: GameState, amount: number): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        tasks: state.run.cycle.tasks.map((task) => ({
          ...task,
          requirements: task.requirements.map((requirement, index) => ({
            ...requirement,
            unverified: index === 0 ? Math.min(amount, requirement.target) : 0,
          })),
        })),
      },
    },
  };
}

function playOnSquad(state: GameState, cardId: string): GameState {
  if (!state.run?.cycle?.hand.some((card) => card.cardId === cardId)) {
    state = addCardsToHand(state, cardId);
  }
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId} in hand`);
  return gameReducer(state, {
    type: "PLAY_CARD",
    instanceId: instance.instanceId,
    target: { kind: "squad" },
  });
}

function playOnTask(state: GameState, cardId: string, taskId: string): GameState {
  if (!state.run?.cycle?.hand.some((card) => card.cardId === cardId)) {
    state = addCardsToHand(state, cardId);
  }
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId} in hand`);
  return gameReducer(state, {
    type: "PLAY_CARD",
    instanceId: instance.instanceId,
    target: { taskId },
  });
}

function playOnRequirement(
  state: GameState,
  cardId: string,
  taskId: string,
  discipline: Discipline,
): GameState {
  if (!state.run?.cycle?.hand.some((card) => card.cardId === cardId)) {
    state = addCardsToHand(state, cardId);
  }
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId} in hand`);
  return gameReducer(state, {
    type: "PLAY_CARD",
    instanceId: instance.instanceId,
    target: { taskId, discipline },
  });
}

describe("Odin's card catalogue", () => {
  it("authors one Starter, five normal rewards, one rare, and a shared Comment token", () => {
    const rewards = eligibleRewardCardIds(["odin"])
      .map(getCard)
      .filter((card) => card.ownerId === "odin");

    expect(getCard("design-review")).toMatchObject({ ownerId: "odin", amount: 5 });
    expect(rewards.map((card) => card.id)).toEqual([
      "one-more-diagram",
      "strong-opinions-loosely-held",
      "approved-with-comments",
      "boring-technology",
      "manual-mode",
      "architecture-review",
    ]);
    expect(rewards.filter((card) => card.rarity === "normal")).toHaveLength(5);
    expect(rewards.filter((card) => card.rarity === "rare")).toHaveLength(1);
    expect(eligibleRewardCardIds(["odin"])).not.toContain("comment");
    expect(getCard("comment")).toMatchObject({
      cost: 0,
      kind: "review",
      amount: 1,
      exhaust: true,
    });
    expect(getCard("comment").ownerId).toBeUndefined();
  });
});

describe("Odin's Review control engine", () => {
  it("cannot Review or Stun a Task with no Unverified Work", () => {
    let state = startCycle(["odin", "madi", "paul"]);
    const historyBefore = state.run?.history.length;

    state = playOnTask(state, "design-review", "status-composer");

    expect(state.run?.cycle?.tasks[0]?.stunned).toBe(false);
    expect(state.run?.history).toHaveLength(historyBefore ?? 0);
  });

  it("stacks Review-to-Stun Focus refunds without an artificial cap", () => {
    let state = seedUnverified(startCycle(["odin", "madi", "paul"]), 5);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: { ...state.run, cycle: { ...state.run.cycle, focus: 5 } },
    };

    state = playOnSquad(state, "strong-opinions-loosely-held");
    state = playOnSquad(state, "strong-opinions-loosely-held");
    state = playOnTask(state, "design-review", "status-composer");

    expect(state.run?.cycle).toMatchObject({ focus: 4, reviewStunFocusBonus: 2 });
    expect(state.run?.cycle?.tasks[0]).toMatchObject({ stunned: true });
    expect(state.run?.history.at(-1)).toMatchObject({
      cardId: "design-review",
      label: "Verify 5 · Stun · Focus +2",
    });

    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task) => ({
            ...task,
            requirements: task.requirements.map((requirement) =>
              requirement.discipline === "backend"
                ? { ...requirement, unverified: 1 }
                : requirement,
            ),
          })),
        },
      },
    };
    state = addCardsToHand(state, "comment");
    state = playOnTask(state, "comment", "status-composer");
    expect(state.run?.cycle?.focus).toBe(4);
  });

  it("generates two Comments that can distribute tiny Reviews and then Exhaust", () => {
    let state = seedUnverified(startCycle(["odin", "madi", "paul"], "cycle-2"), 3);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: { ...state.run, cycle: { ...state.run.cycle, focus: 5 } },
    };

    state = playOnTask(state, "approved-with-comments", "status-composer");
    expect(state.run?.cycle?.hand.filter((card) => card.cardId === "comment")).toHaveLength(2);
    state = playOnTask(state, "comment", "reconnect-logic");
    state = playOnTask(state, "comment", "reconnect-logic");

    expect(state.run?.cycle?.tasks.map((task) => task.stunned)).toEqual([true, true]);
    expect(state.run?.cycle?.tasks[1]?.requirements[0]).toMatchObject({
      verified: 2,
      unverified: 1,
    });
    expect(state.run?.cycle?.exhaustPile.filter((card) => card.cardId === "comment")).toHaveLength(
      2,
    );
  });

  it("turns a Stunned Task into Boring Technology's full Backend payoff", () => {
    let state = startCycle(["odin", "madi", "paul"], "cycle-2");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          focus: 4,
          tasks: state.run.cycle.tasks.map((task) =>
            task.taskId === "status-composer"
              ? {
                  ...task,
                  stunned: true,
                  requirements: task.requirements.map((requirement) =>
                    requirement.discipline === "backend"
                      ? { ...requirement, target: 10 }
                      : requirement,
                  ),
                }
              : task,
          ),
        },
      },
    };

    state = playOnRequirement(state, "boring-technology", "status-composer", "backend");

    expect(state.run?.cycle?.tasks[0]?.requirements[1]).toMatchObject({ verified: 7 });
    expect(state.run?.history.at(-1)).toMatchObject({
      label: "Backend +7 verified",
    });
  });

  it("discards only AI cards in hand and stacks a Day-long non-AI Work bonus", () => {
    let state = addCardsToHand(
      startCycle(["odin", "madi", "paul"], "cycle-2"),
      "manual-mode",
      "manual-mode",
      "agent-swarm",
      "quick-fix",
      "frontend-3",
    );
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: { ...state.run, cycle: { ...state.run.cycle, focus: 6 } },
    };

    state = playOnSquad(state, "manual-mode");
    expect(state.run?.cycle?.hand.map((card) => card.cardId)).not.toEqual(
      expect.arrayContaining(["agent-swarm", "quick-fix"]),
    );
    expect(state.run?.cycle?.discardPile.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["agent-swarm", "quick-fix"]),
    );
    state = playOnSquad(state, "manual-mode");
    state = playOnRequirement(state, "frontend-3", "status-composer", "frontend");

    expect(state.run?.cycle?.dayWorkBonuses).toHaveLength(2);
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ verified: 5 });
    expect(state.run?.history.at(-1)).toMatchObject({ label: "Frontend +5 verified" });
  });

  it("Retains One More Diagram while Day-only statuses reset", () => {
    let state = addCardsToHand(startCycle(["odin", "madi", "paul"]), "one-more-diagram");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const drawPile = Array.from({ length: 5 }, (_, index) => ({
      cardId: "frontend-3",
      instanceId: `odin-retain-draw-${index}`,
    }));
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          hand: state.run.cycle.hand.filter((card) => card.cardId === "one-more-diagram"),
          drawPile,
          discardPile: [],
          reviewStunFocusBonus: 3,
          dayWorkBonuses: [{ amount: 2, excludedTags: ["ai-assisted"] }],
        },
      },
    };

    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.cycle?.hand).toHaveLength(6);
    expect(state.run?.cycle?.hand[0]?.cardId).toBe("one-more-diagram");
    expect(state.run?.cycle).toMatchObject({
      day: 2,
      reviewStunFocusBonus: 0,
      dayWorkBonuses: [],
    });
  });

  it("Reviews every eligible Task and draws once per Intent newly Stunned", () => {
    let state = seedUnverified(startCycle(["odin", "madi", "paul"], "cycle-2", 0xa7c4), 5);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const drawPile = Array.from({ length: 4 }, (_, index) => ({
      cardId: "backend-3",
      instanceId: `architecture-draw-${index}`,
    }));
    state = addCardsToHand(
      {
        ...state,
        run: {
          ...state.run,
          cycle: {
            ...state.run.cycle,
            focus: 3,
            hand: [],
            drawPile,
            discardPile: [],
            reviewStunFocusBonus: 1,
          },
        },
      },
      "architecture-review",
    );

    state = playOnSquad(state, "architecture-review");

    expect(state.run?.cycle?.tasks.map((task) => task.stunned)).toEqual([true, true]);
    expect(state.run?.cycle?.tasks.map((task) => task.requirements[0]?.unverified)).toEqual([0, 0]);
    expect(state.run?.cycle?.hand).toHaveLength(2);
    expect(state.run?.cycle?.focus).toBe(4);
    expect(state.run?.history.at(-1)).toEqual({
      kind: "card-played",
      nodeId: "cycle-2",
      day: 1,
      cardId: "architecture-review",
      taskId: undefined,
      discipline: undefined,
      label: "Verify 5 · 2 Tasks · Stun 2 · Focus +2 · Draw 2",
    });
  });

  it("skips Tasks without Unverified Work during Architecture Review", () => {
    let state = seedUnverified(startCycle(["odin", "madi", "paul"], "cycle-2"), 3);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          focus: 2,
          tasks: state.run.cycle.tasks.map((task, index) =>
            index === 1
              ? {
                  ...task,
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    unverified: 0,
                  })),
                }
              : task,
          ),
        },
      },
    };

    state = playOnSquad(state, "architecture-review");

    expect(state.run?.cycle?.tasks.map((task) => task.stunned)).toEqual([true, false]);
    expect(state.run?.history.at(-1)).toMatchObject({
      label: "Verify 5 · 1 Task · Stun 1 · Draw 1",
    });
  });
});
