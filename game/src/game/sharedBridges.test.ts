import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard } from "../domain/content";
import type { CardInstance, DeveloperId, Discipline } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { useTestCycle } from "./testSupport";

const sharedBridgeCardIds = [
  "rubber-duck-session",
  "small-pr",
  "contingency-plan",
  "spring-cleaning",
] as const;

function startCycle(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["paul", "odin", "madi"],
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0xb41d63 });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  state = useTestCycle(state, "quick-win");
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: { ...state.run, cycle: { ...state.run.cycle, focus: 20 } },
  };
}

function withCycle(
  state: GameState,
  update: (
    cycle: NonNullable<NonNullable<GameState["run"]>["cycle"]>,
  ) => Partial<NonNullable<NonNullable<GameState["run"]>["cycle"]>>,
): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: { ...state.run, cycle: { ...state.run.cycle, ...update(state.run.cycle) } },
  };
}

function withHand(state: GameState, ...cardIds: string[]): GameState {
  return withCycle(state, () => ({
    hand: cardIds.map((cardId, index) => ({
      cardId,
      instanceId: `bridge-${cardId}-${index}`,
    })),
  }));
}

function play(
  state: GameState,
  cardId: string,
  target: { kind: "squad" } | { taskId: string; discipline?: Discipline },
): GameState {
  const instance = state.run?.cycle?.hand.find((candidate) => candidate.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId} in hand`);
  return gameReducer(state, { type: "PLAY_CARD", instanceId: instance.instanceId, target });
}

describe("shared bridge catalogue", () => {
  it("offers the four normal bridges to every squad", () => {
    const rewards = eligibleRewardCardIds(["seb", "toby", "steph"]);
    expect(sharedBridgeCardIds.every((cardId) => rewards.includes(cardId))).toBe(true);
    for (const cardId of sharedBridgeCardIds) {
      const card = getCard(cardId);
      expect(card.ownerId).toBeUndefined();
      expect(card.rarity).toBeUndefined();
      expect(card.tags).toContain("reward");
    }
  });

  it("turns one Rubber Duck Session into Review and Block tokens", () => {
    let state = withHand(startCycle(), "rubber-duck-session");
    state = play(state, "rubber-duck-session", { kind: "squad" });

    expect(state.run?.cycle?.hand.map((card) => card.cardId)).toEqual(["comment", "checklist"]);
  });

  it("makes Small PR a finite completion refund", () => {
    let state = withHand(startCycle(), "small-pr");
    state = withCycle(state, (cycle) => ({
      tasks: cycle.tasks.map((task) => ({
        ...task,
        requirements: task.requirements.map((requirement) =>
          requirement.discipline === "frontend" ? { ...requirement, verified: 3 } : requirement,
        ),
      })),
    }));
    state = play(state, "small-pr", {
      taskId: "status-composer",
      discipline: "frontend",
    });

    expect(state.run?.cycle?.focus).toBe(20);
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ verified: 5 });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("small-pr");
  });

  it("sets up tomorrow while protecting today with Contingency Plan", () => {
    let state = withHand(startCycle(), "contingency-plan");
    state = play(state, "contingency-plan", { kind: "squad" });

    expect(state.run?.cycle).toMatchObject({ block: 3, queuedCardsDrawn: 2 });
  });

  it("turns hand-clogging Status cards into fresh draws with Spring Cleaning", () => {
    let state = withHand(startCycle(), "spring-cleaning", "tech-debt", "distraction", "frontend-3");
    const replacements: CardInstance[] = [
      { cardId: "backend-3", instanceId: "bridge-replacement-1" },
      { cardId: "infra-3", instanceId: "bridge-replacement-2" },
    ];
    state = withCycle(state, () => ({ drawPile: replacements, discardPile: [] }));
    state = play(state, "spring-cleaning", { kind: "squad" });

    expect(state.run?.cycle?.hand.map((card) => card.cardId)).toEqual([
      "frontend-3",
      "backend-3",
      "infra-3",
    ]);
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toEqual([
      "tech-debt",
      "distraction",
      "spring-cleaning",
    ]);
  });

  it("separates the two defensive cancellation cards and buffs Health Check", () => {
    const featureFlag = getCard("feature-flag");
    expect(featureFlag).toMatchObject({
      cost: 1,
      block: 3,
      stun: true,
    });
    expect(featureFlag.tags).toContain("defense");

    const notReproducible = getCard("not-reproducible");
    expect(notReproducible).toMatchObject({
      cost: 0,
      exhaust: true,
      stun: true,
    });
    expect(notReproducible.tags).toEqual(["defense", "exhaust", "stun", "reward"]);

    expect(getCard("health-check")).toMatchObject({
      amount: 2,
      block: 2,
      automation: { kind: "install", power: 0, blockPower: 2 },
    });
  });
});
