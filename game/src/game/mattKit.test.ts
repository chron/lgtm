import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard } from "../domain/content";
import type { DeveloperId, Discipline, TaskState } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { useTestCycle } from "./testSupport";

function requirement(discipline: Discipline, target: number, verified = 0, unverified = 0) {
  return { discipline, target, verified, unverified, scriptPower: 0, scriptBlock: 0 };
}

function task(taskId: string, requirements: TaskState["requirements"]): TaskState {
  return { taskId, name: taskId, status: "open", stunned: false, spawnedDay: 1, requirements };
}

function scenario(tasks: TaskState[], ...cardIds: string[]): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0x6a77 });
  for (const developerId of ["matt", "seb", "odin"] satisfies DeveloperId[]) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected run");
  state = {
    screen: { name: "map" },
    run: { ...state.run, currentNodeId: null, completedNodeIds: [] },
  };
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  state = useTestCycle(state, "presence-upgrade");
  if (!state.run?.cycle) throw new Error("Expected Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        focus: 30,
        tasks,
        hand: cardIds.map((cardId, index) => ({
          cardId,
          instanceId: `matt-${cardId}-${index}`,
        })),
        drawPile: [
          { cardId: "frontend-3", instanceId: "matt-draw-1" },
          { cardId: "backend-3", instanceId: "matt-draw-2" },
          { cardId: "infra-3", instanceId: "matt-draw-3" },
        ],
        discardPile: [],
      },
    },
  };
}

function play(
  state: GameState,
  cardId: string,
  target: { kind: "squad" } | { taskId: string; discipline?: Discipline },
): GameState {
  const instance = state.run?.cycle?.hand.find((candidate) => candidate.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId}`);
  return gameReducer(state, { type: "PLAY_CARD", instanceId: instance.instanceId, target });
}

describe("Matt's polish and overflow kit", () => {
  it("registers his Starter, five normals, rare, and reward ownership", () => {
    expect(getCard("delight-moment").ownerId).toBe("matt");
    expect(
      [
        "one-more-pass",
        "polish-budget",
        "no-rough-edges",
        "delight-budget",
        "microinteraction",
        "pixel-perfect",
      ].every((id) => eligibleRewardCardIds(["matt"]).includes(id)),
    ).toBe(true);
  });

  it("draws on Delight Moment completion and enforces One More Pass precision", () => {
    let delight = scenario([task("target", [requirement("frontend", 4)])], "delight-moment");
    delight = play(delight, "delight-moment", { taskId: "target", discipline: "frontend" });
    expect(delight.run?.cycle?.hand.map((card) => card.cardId)).toContain("frontend-3");

    const blocked = scenario([task("target", [requirement("backend", 4)])], "one-more-pass");
    const unchanged = play(blocked, "one-more-pass", { taskId: "target", discipline: "backend" });
    expect(unchanged).toEqual(blocked);
    let precise = scenario([task("target", [requirement("backend", 6, 3)])], "one-more-pass");
    precise = play(precise, "one-more-pass", { taskId: "target", discipline: "backend" });
    expect(precise.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(6);
    expect(precise.run?.cycle?.exhaustPile[0]?.cardId).toBe("one-more-pass");
  });

  it("turns actual overflow Review into Block after Polish Budget", () => {
    let state = scenario(
      [task("target", [requirement("frontend", 8, 4, 2)])],
      "polish-budget",
      "delight-moment",
    );
    state = play(state, "polish-budget", { kind: "squad" });
    state = play(state, "delight-moment", { taskId: "target", discipline: "frontend" });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 8,
      unverified: 0,
    });
    expect(state.run?.cycle).toMatchObject({ block: 2, polishBudgetPower: 1 });
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("matt");
  });

  it("rewards a fully cleaned No Rough Edges and counts Delight Budget completion", () => {
    let edges = scenario([task("target", [requirement("backend", 6, 1, 5)])], "no-rough-edges");
    const focusBefore = edges.run?.cycle?.focus ?? 0;
    edges = play(edges, "no-rough-edges", { taskId: "target" });
    expect(edges.run?.cycle?.focus).toBe(focusBefore);
    expect(edges.run?.cycle?.hand.map((card) => card.cardId)).toContain("frontend-3");

    let budget = scenario(
      [
        task("open", [requirement("frontend", 2, 2), requirement("backend", 3)]),
        { ...task("ready", [requirement("infra", 2, 2)]), status: "ready" },
      ],
      "delight-budget",
    );
    budget = play(budget, "delight-budget", { kind: "squad" });
    expect(budget.run?.cycle?.block).toBe(3);
  });

  it("spills Microinteraction into the least-remaining bar", () => {
    let state = scenario(
      [
        task("target", [
          requirement("frontend", 2),
          requirement("backend", 5, 2),
          requirement("infra", 6, 1),
        ]),
      ],
      "microinteraction",
    );
    state = play(state, "microinteraction", { taskId: "target", discipline: "frontend" });
    expect(state.run?.cycle?.tasks[0]?.requirements).toEqual([
      expect.objectContaining({ discipline: "frontend", verified: 2 }),
      expect.objectContaining({ discipline: "backend", verified: 4 }),
      expect.objectContaining({ discipline: "infra", verified: 1 }),
    ]);
  });

  it("duplicates Pixel Perfect overflow as Review across the board and draws per clean Task", () => {
    let state = scenario(
      [
        task("source", [requirement("frontend", 10, 6, 2)]),
        task("other", [requirement("backend", 5, 2, 3)]),
      ],
      "pixel-perfect",
    );
    state = play(state, "pixel-perfect", { taskId: "source", discipline: "frontend" });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 10,
      unverified: 0,
    });
    expect(state.run?.cycle?.tasks[1]?.requirements[0]).toMatchObject({
      verified: 5,
      unverified: 0,
    });
    expect(state.run?.cycle?.hand).toHaveLength(2);
    expect(state.run?.cycle?.exhaustPile[0]?.cardId).toBe("pixel-perfect");
  });
});
