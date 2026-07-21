import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard } from "../domain/content";
import type { DeveloperId, Discipline, TaskState } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { useTestCycle } from "./testSupport";

function requirement(discipline: Discipline, target: number, verified = 0, unverified = 0) {
  return { discipline, target, verified, unverified, scriptPower: 0 };
}

function task(taskId: string, requirements: TaskState["requirements"]): TaskState {
  return { taskId, name: taskId, status: "open", stunned: false, spawnedDay: 1, requirements };
}

function scenario(tasks: TaskState[], ...cardIds: string[]): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0x5eb });
  for (const developerId of ["seb", "matt", "irene"] satisfies DeveloperId[]) {
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
          instanceId: `seb-${cardId}-${index}`,
        })),
        drawPile: [],
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

describe("Seb's distributed Frontend kit", () => {
  it("registers his Starter, five normals, rare, and reward ownership", () => {
    expect(getCard("use-the-component").ownerId).toBe("seb");
    expect(
      [
        "design-tokens",
        "ladle",
        "extract-component",
        "used-everywhere",
        "polish-the-primitives",
        "design-system-migration",
      ].every((id) => eligibleRewardCardIds(["seb"]).includes(id)),
    ).toBe(true);
  });

  it("turns Use the Component into a finite board-order Shared Components cascade", () => {
    let state = scenario(
      [
        task("source", [requirement("frontend", 3)]),
        task("second", [requirement("frontend", 1), requirement("backend", 2)]),
        task("third", [requirement("frontend", 2), requirement("backend", 2)]),
      ],
      "use-the-component",
    );
    state = play(state, "use-the-component", { taskId: "source", discipline: "frontend" });

    expect(state.run?.cycle?.tasks.map((candidate) => candidate.requirements[0]?.verified)).toEqual(
      [3, 1, 2],
    );
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("seb");
  });

  it("resolves Design Tokens, Ladle, and Extract Component's extra echo", () => {
    let tokens = scenario(
      [
        task("first", [requirement("frontend", 2), requirement("backend", 1)]),
        task("second", [requirement("frontend", 3), requirement("backend", 1)]),
      ],
      "design-tokens",
    );
    tokens = play(tokens, "design-tokens", { kind: "squad" });
    expect(
      tokens.run?.cycle?.tasks.map((candidate) => candidate.requirements[0]?.verified),
    ).toEqual([2, 3]);
    expect(tokens.run?.cycle?.exhaustPile[0]?.cardId).toBe("design-tokens");

    let ladle = scenario([task("target", [requirement("frontend", 5)])], "ladle");
    ladle = play(ladle, "ladle", { taskId: "target", discipline: "frontend" });
    expect(ladle.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 2,
      scriptPower: 1,
    });

    let extract = scenario(
      [task("source", [requirement("frontend", 4)]), task("other", [requirement("frontend", 3)])],
      "extract-component",
    );
    extract = play(extract, "extract-component", {
      taskId: "source",
      discipline: "frontend",
    });
    expect(extract.run?.cycle?.tasks[1]?.requirements[0]?.verified).toBe(2);
  });

  it("scales Used Everywhere and lets clean Review spread Polish the Primitives", () => {
    let used = scenario(
      [
        task("source", [requirement("frontend", 12)]),
        task("second", [requirement("frontend", 5)]),
        task("third", [requirement("frontend", 5)]),
      ],
      "used-everywhere",
    );
    used = play(used, "used-everywhere", { taskId: "source", discipline: "frontend" });
    expect(used.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(6);

    let polish = scenario(
      [
        task("source", [requirement("backend", 5, 1, 4)]),
        task("other", [requirement("frontend", 4)]),
      ],
      "polish-the-primitives",
    );
    polish = play(polish, "polish-the-primitives", { taskId: "source" });
    expect(polish.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 5,
      unverified: 0,
    });
    expect(polish.run?.cycle?.tasks[1]?.requirements[0]?.verified).toBe(2);
  });

  it("migrates every incomplete Frontend bar, installs Script 1, and triggers it", () => {
    let state = scenario(
      [
        task("first", [requirement("frontend", 4)]),
        task("second", [requirement("frontend", 2), requirement("infra", 2)]),
      ],
      "design-system-migration",
    );
    state = play(state, "design-system-migration", { kind: "squad" });
    expect(state.run?.cycle?.tasks.map((candidate) => candidate.requirements[0])).toEqual([
      expect.objectContaining({ verified: 1, scriptPower: 1 }),
      expect.objectContaining({ verified: 1, scriptPower: 1 }),
    ]);
    expect(state.run?.cycle?.exhaustPile[0]?.cardId).toBe("design-system-migration");
  });

  it("treats start-of-Day Scripts as ordinary packets for Seb and Matt", () => {
    let state = scenario([
      task("source", [
        { ...requirement("frontend", 4, 3), scriptPower: 2 },
        requirement("backend", 2, 0, 1),
      ]),
      task("other", [requirement("frontend", 1), requirement("infra", 2)]),
    ]);
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.tasks[0]?.requirements).toEqual([
      expect.objectContaining({ discipline: "frontend", verified: 4 }),
      expect.objectContaining({ discipline: "backend", verified: 1, unverified: 0 }),
    ]);
    expect(state.run?.cycle?.tasks[1]?.requirements[0]).toMatchObject({ verified: 1 });
    expect(state.run?.cycle?.triggeredPassiveIds).toEqual(expect.arrayContaining(["seb", "matt"]));
  });
});
