import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard } from "../domain/content";
import type { CardInstance, DeveloperId, Discipline, TaskState } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { taskUnverifiedWork } from "./rules";
import { useTestCycle } from "./testSupport";

const sharedRareIds = [
  "copy-paste",
  "all-hands",
  "deploy-train",
  "review-blitz",
  "open-source-it",
  "known-shortcut",
  "protected-time",
  "declare-bankruptcy",
] as const;

function startCycle(
  cycleId = "presence-upgrade",
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["paul", "irene", "madi"],
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0xa11a11 });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  state = useTestCycle(state, cycleId);
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
    hand: cardIds.map((cardId, index) => ({ cardId, instanceId: `rare-${cardId}-${index}` })),
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

function totalVerified(task: TaskState): number {
  return task.requirements.reduce((total, requirement) => total + requirement.verified, 0);
}

describe("shared rare catalogue", () => {
  it("offers all eight rares to every squad at the locked costs", () => {
    const rewards = eligibleRewardCardIds(["seb", "toby", "steph"]);
    expect(sharedRareIds.every((id) => rewards.includes(id))).toBe(true);
    expect(sharedRareIds.map((id) => getCard(id))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "all-hands", cost: 2 }),
        expect.objectContaining({ id: "deploy-train", cost: 2 }),
        expect.objectContaining({ id: "review-blitz", cost: 2 }),
        expect.objectContaining({ id: "declare-bankruptcy", cost: 3 }),
      ]),
    );
    for (const id of sharedRareIds) {
      expect(getCard(id).ownerId).toBeUndefined();
      expect(getCard(id).rarity).toBe("rare");
      expect(getCard(id).tags).toEqual(expect.arrayContaining(["rare", "reward"]));
    }
  });

  it("spends All Hands' four Work across each open Task's unfinished requirements", () => {
    let state = withHand(startCycle(), "all-hands");
    state = play(state, "all-hands", { kind: "squad" });
    const tasks = state.run?.cycle?.tasks ?? [];
    expect(tasks.map(totalVerified)).toEqual([4, 4]);
    expect(
      tasks[0]?.requirements.find((requirement) => requirement.discipline === "backend"),
    ).toMatchObject({ verified: 3 });
    expect(
      tasks[0]?.requirements.find((requirement) => requirement.discipline === "frontend"),
    ).toMatchObject({ verified: 1 });
  });

  it("runs every Script and the shared Guard with Deploy Train", () => {
    let state = withHand(startCycle(), "deploy-train");
    state = withCycle(state, (cycle) => ({
      guardPower: 3,
      tasks: cycle.tasks.map((task, taskIndex) => ({
        ...task,
        requirements: task.requirements.map((requirement, requirementIndex) => ({
          ...requirement,
          scriptPower: taskIndex === 0 && requirementIndex < 2 ? requirementIndex + 1 : 0,
        })),
      })),
    }));
    state = play(state, "deploy-train", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(3);
    expect(
      state.run?.cycle?.tasks[0]?.requirements.map((requirement) => requirement.verified),
    ).toEqual([1, 2]);
  });

  it("cleans every Task with Review Blitz", () => {
    let state = withHand(startCycle(), "review-blitz");
    state = withCycle(state, (cycle) => ({
      tasks: cycle.tasks.map((task, taskIndex) => ({
        ...task,
        requirements: task.requirements.map((requirement, requirementIndex) => ({
          ...requirement,
          unverified: taskIndex + requirementIndex + 1,
        })),
      })),
    }));
    state = play(state, "review-blitz", { kind: "squad" });
    expect(state.run?.cycle?.tasks.every((task) => taskUnverifiedWork(task) === 0)).toBe(true);
  });

  it("opens the whole shared token toolbox", () => {
    let state = withHand(startCycle(), "open-source-it");
    state = play(state, "open-source-it", { kind: "squad" });
    expect(state.run?.cycle?.hand.map((card) => card.cardId)).toEqual([
      "snippet",
      "quick-fix",
      "checklist",
      "comment",
    ]);
  });

  it("turns current Tech Debt into risky throughput with Known Shortcut", () => {
    let state = withHand(startCycle("quick-win"), "known-shortcut");
    state = withCycle(state, (cycle) => ({
      tasks: cycle.tasks.map((task) => ({
        ...task,
        requirements: task.requirements.map((requirement) =>
          requirement.discipline === "frontend" ? { ...requirement, target: 10 } : requirement,
        ),
      })),
    }));
    if (!state.run) throw new Error("Expected a run");
    state = { ...state, run: { ...state.run, techDebt: 4 } };
    state = play(state, "known-shortcut", {
      taskId: "status-composer",
      discipline: "frontend",
    });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ unverified: 7 });
  });

  it("turns later Block gains into Work after Protected Time", () => {
    let state = withHand(startCycle("quick-win"), "protected-time", "standup-cover");
    state = play(state, "protected-time", { kind: "squad" });
    expect(state.run?.cycle).toMatchObject({ block: 8, blockWorkPower: 1 });
    state = play(state, "standup-cover", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(12);
    expect(state.run?.cycle?.tasks[0]?.requirements[1]).toMatchObject({ verified: 1 });
  });

  it("exhausts Debt from every active pile without changing the Debt score", () => {
    let state = withHand(startCycle("quick-win"), "declare-bankruptcy", "tech-debt");
    const drawDebt: CardInstance = { cardId: "tech-debt", instanceId: "debt-draw" };
    const discardDebt: CardInstance = { cardId: "tech-debt", instanceId: "debt-discard" };
    state = withCycle(state, () => ({
      focus: 5,
      drawPile: [drawDebt],
      discardPile: [discardDebt],
    }));
    if (!state.run) throw new Error("Expected a run");
    state = { ...state, run: { ...state.run, techDebt: 9 } };
    state = play(state, "declare-bankruptcy", { kind: "squad" });
    expect(state.run?.cycle).toMatchObject({ focus: 5 });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toEqual([
      "tech-debt",
      "tech-debt",
      "tech-debt",
      "declare-bankruptcy",
    ]);
    expect(state.run?.cycle?.drawPile).toEqual([]);
    expect(state.run?.cycle?.discardPile).toEqual([]);
    expect(state.run?.techDebt).toBe(9);
  });

  it("makes the next direct card effect happen twice with Copy/Paste", () => {
    let state = withHand(startCycle("quick-win"), "copy-paste", "flexible-2");
    state = play(state, "copy-paste", { kind: "squad" });
    expect(state.run?.cycle?.copiedCardEffectCount).toBe(1);
    state = play(state, "flexible-2", {
      taskId: "status-composer",
      discipline: "frontend",
    });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ verified: 4 });
    expect(state.run?.cycle?.copiedCardEffectCount).toBe(0);
  });
});
