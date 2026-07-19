import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard, getCardForInstance } from "../domain/content";
import type { DeveloperId, Discipline, ToolId } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { resolveCardTarget } from "./rules";

function startCycle(
  nodeId: "cycle-1" | "cycle-2" | "final-release" = "cycle-1",
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["irene", "madi", "odin"],
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0x1ae0e });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");

  const path =
    nodeId === "cycle-1"
      ? { currentNodeId: null, completedNodeIds: [] }
      : nodeId === "cycle-2"
        ? { currentNodeId: "event-1", completedNodeIds: ["cycle-1", "event-1"] }
        : {
            currentNodeId: "event-4",
            completedNodeIds: [
              "cycle-1",
              "event-1",
              "cycle-2",
              "incident-1",
              "event-2",
              "cycle-3",
              "event-3",
              "cycle-4",
              "incident-2",
              "event-4",
            ],
          };
  state = {
    screen: { name: "map" },
    run: { ...state.run, ...path },
  };
  return gameReducer(state, { type: "VISIT_NODE", nodeId });
}

function addCardsToHand(state: GameState, ...cardIds: string[]): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        hand: [
          ...state.run.cycle.hand,
          ...cardIds.map((cardId, index) => ({
            cardId,
            instanceId: `irene-test-${cardId}-${index}`,
          })),
        ],
      },
    },
  };
}

function withDrawPile(state: GameState, count = 12): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        drawPile: Array.from({ length: count }, (_, index) => ({
          cardId: "frontend-3",
          instanceId: `irene-draw-${index}`,
        })),
        discardPile: [],
      },
    },
  };
}

function withTools(state: GameState, ...tools: ToolId[]): GameState {
  if (!state.run) throw new Error("Expected a run");
  return { ...state, run: { ...state.run, tools } };
}

function setRequirement(
  state: GameState,
  taskId: string,
  discipline: Discipline,
  patch: { verified?: number; unverified?: number; scriptPower?: number },
): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        tasks: state.run.cycle.tasks.map((task) =>
          task.taskId === taskId
            ? {
                ...task,
                requirements: task.requirements.map((requirement) =>
                  requirement.discipline === discipline
                    ? { ...requirement, ...patch }
                    : requirement,
                ),
              }
            : task,
        ),
      },
    },
  };
}

function play(
  state: GameState,
  cardId: string,
  target: { kind: "squad" } | { taskId: string; discipline?: Discipline },
): GameState {
  if (!state.run?.cycle?.hand.some((card) => card.cardId === cardId)) {
    state = addCardsToHand(state, cardId);
  }
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId} in hand`);
  return gameReducer(state, { type: "PLAY_CARD", instanceId: instance.instanceId, target });
}

describe("Irene's card catalogue", () => {
  it("authors one Starter, five normal rewards, and one rare", () => {
    const rewards = eligibleRewardCardIds(["irene"])
      .map(getCard)
      .filter((card) => card.ownerId === "irene");

    expect(getCard("already-fixed")).toMatchObject({
      ownerId: "irene",
      cost: 1,
      discipline: "flexible",
      amount: 3,
      workKind: "verified",
    });
    expect(rewards.map((card) => card.id)).toEqual([
      "quietly-automated",
      "last-10-percent",
      "no-fuss",
      "while-im-here",
      "quick-study",
      "all-sorted",
    ]);
    expect(rewards.filter((card) => card.rarity === "normal")).toHaveLength(5);
    expect(rewards.filter((card) => card.rarity === "rare")).toHaveLength(1);
  });
});

describe("Irene's completion engine", () => {
  it("only plays Last 10% into the final two Work and then Exhausts", () => {
    let state = withDrawPile(startCycle());
    state = setRequirement(state, "status-composer", "frontend", { verified: 2 });
    state = addCardsToHand(state, "last-10-percent");
    const instance = state.run?.cycle?.hand.find((card) => card.cardId === "last-10-percent");
    if (!state.run || !instance) throw new Error("Expected card and run");

    expect(
      resolveCardTarget(state.run, instance, {
        taskId: "status-composer",
        discipline: "frontend",
      }),
    ).toEqual({ legal: false, reason: "Choose a requirement with 2 or less Work remaining." });

    state = setRequirement(state, "status-composer", "frontend", { verified: 3 });
    state = play(state, "last-10-percent", {
      taskId: "status-composer",
      discipline: "frontend",
    });

    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ verified: 5 });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("last-10-percent");
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("irene");
  });

  it("lets No Fuss refund its Focus and Quietly Done draw on completion", () => {
    let state = withDrawPile(startCycle());
    state = setRequirement(state, "status-composer", "frontend", { verified: 2 });
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: { ...state.run, cycle: { ...state.run.cycle, focus: 9 } },
    };
    const handBefore = state.run?.cycle?.hand.length ?? 0;

    state = play(state, "no-fuss", { taskId: "status-composer", discipline: "frontend" });

    expect(state.run?.cycle?.focus).toBe(9);
    expect(state.run?.cycle?.hand).toHaveLength(handBefore + 1);
    expect(state.run?.history.at(-1)).toMatchObject({
      cardId: "no-fuss",
      label: "Frontend +3 verified · Draw 1 · Focus +1",
    });
  });

  it("spills While I'm Here into the least remaining bar and draws for both completions", () => {
    let state = withDrawPile(startCycle("final-release"));
    state = setRequirement(state, "final-release", "frontend", { verified: 8 });
    state = setRequirement(state, "final-release", "backend", { verified: 8 });
    state = setRequirement(state, "final-release", "infra", { verified: 8 });
    const handBefore = state.run?.cycle?.hand.length ?? 0;

    state = play(state, "while-im-here", {
      taskId: "final-release",
      discipline: "frontend",
    });

    const requirements = state.run?.cycle?.tasks[0]?.requirements;
    expect(requirements?.map(({ discipline, verified }) => ({ discipline, verified }))).toEqual([
      { discipline: "frontend", verified: 10 },
      { discipline: "backend", verified: 10 },
      { discipline: "infra", verified: 8 },
    ]);
    expect(state.run?.cycle?.hand).toHaveLength(handBefore + 2);
    expect(state.run?.history.findLast((event) => event.kind === "card-played")).toMatchObject({
      label: "Frontend +2 verified · Backend spill +2 · Draw 2",
    });
  });

  it("copies only the last Work card's printed payload into an Exhausting zero-cost card", () => {
    let state = withDrawPile(startCycle("final-release"));
    state = addCardsToHand(state, "quick-study");
    const study = state.run?.cycle?.hand.find((card) => card.cardId === "quick-study");
    if (!state.run || !study) throw new Error("Expected Quick Study");
    expect(resolveCardTarget(state.run, study, { kind: "squad" })).toEqual({
      legal: false,
      reason: "Play a Work card first.",
    });

    state = play(state, "agent-swarm", { taskId: "final-release", discipline: "backend" });
    state = play(state, "quick-study", { kind: "squad" });
    const generated = state.run?.cycle?.hand.find((card) => card.generated);
    if (!generated) throw new Error("Expected a generated Work copy");

    expect(getCardForInstance(generated)).toMatchObject({
      cost: 0,
      kind: "work",
      discipline: "backend",
      amount: 5,
      workKind: "verified",
      exhaust: true,
    });
    expect(getCardForInstance(generated).tags).toEqual(["exhaust", "generated"]);
    expect(getCardForInstance(generated)).not.toHaveProperty("ownerId");
    expect(state.run?.deck.some((card) => card.cardId === generated.cardId)).toBe(false);

    state = gameReducer(state, {
      type: "PLAY_CARD",
      instanceId: generated.instanceId,
      target: { taskId: "final-release", discipline: "backend" },
    });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.instanceId)).toContain(
      generated.instanceId,
    );
  });

  it("completes every qualifying bar with All Sorted and draws once for each", () => {
    let state = withDrawPile(startCycle("cycle-2"));
    state = setRequirement(state, "status-composer", "frontend", { verified: 4 });
    state = setRequirement(state, "status-composer", "backend", { verified: 1 });
    state = setRequirement(state, "reconnect-logic", "backend", { verified: 1 });
    const handBefore = state.run?.cycle?.hand.length ?? 0;

    state = play(state, "all-sorted", { kind: "squad" });

    expect(
      state.run?.cycle?.tasks.flatMap((task) =>
        task.requirements.map((requirement) => ({
          taskId: task.taskId,
          discipline: requirement.discipline,
          remaining: requirement.target - requirement.verified - requirement.unverified,
        })),
      ),
    ).toEqual([
      { taskId: "status-composer", discipline: "frontend", remaining: 0 },
      { taskId: "status-composer", discipline: "backend", remaining: 0 },
      { taskId: "reconnect-logic", discipline: "backend", remaining: 0 },
      { taskId: "reconnect-logic", discipline: "infra", remaining: 4 },
    ]);
    expect(state.run?.cycle?.hand).toHaveLength(handBefore + 3);
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("all-sorted");
    expect(state.run?.history.at(-1)).toMatchObject({
      label: "Complete 3 requirements · Draw 3",
    });
  });

  it("draws for CI installs, chained Script triggers, explicit triggers, and next-Day Scripts", () => {
    let state = withTools(withDrawPile(startCycle("cycle-2"), 30), "ci-runner");
    state = setRequirement(state, "status-composer", "frontend", { verified: 3 });
    let handBefore = state.run?.cycle?.hand.length ?? 0;
    state = play(state, "quietly-automated", {
      taskId: "status-composer",
      discipline: "frontend",
    });
    expect(state.run?.cycle?.hand).toHaveLength(handBefore + 1);

    state = setRequirement(state, "reconnect-logic", "backend", {
      unverified: 1,
      scriptPower: 1,
    });
    handBefore = state.run?.cycle?.hand.length ?? 0;
    state = play(state, "agentic-loop", {
      taskId: "reconnect-logic",
      discipline: "backend",
    });
    expect(state.run?.cycle?.hand).toHaveLength(handBefore + 1);

    state = setRequirement(state, "reconnect-logic", "infra", {
      verified: 3,
      scriptPower: 1,
    });
    handBefore = state.run?.cycle?.hand.length ?? 0;
    state = play(state, "run-it-now", {
      taskId: "reconnect-logic",
      discipline: "infra",
    });
    expect(state.run?.cycle?.hand).toHaveLength(handBefore + 1);

    state = setRequirement(state, "status-composer", "backend", {
      verified: 2,
      scriptPower: 1,
    });
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("irene");
    expect(state.run?.cycle?.hand).toHaveLength(6);
  });

  it("draws when CI runs a Script installed after Review", () => {
    let state = withTools(withDrawPile(startCycle("cycle-2")), "ci-runner");
    state = setRequirement(state, "status-composer", "frontend", {
      verified: 1,
      unverified: 3,
    });
    const handBefore = state.run?.cycle?.hand.length ?? 0;

    state = play(state, "write-the-rfc", { taskId: "status-composer" });

    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 5,
      unverified: 0,
      scriptPower: 1,
    });
    expect(state.run?.cycle?.hand).toHaveLength(handBefore + 1);
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("irene");
  });
});
