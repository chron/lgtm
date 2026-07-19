import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard } from "../domain/content";
import type { CardInstance, DeveloperId, Discipline, ToolId } from "../domain/models";
import { gameReducer, initialGameState } from "./gameReducer";
import type { GameState } from "./gameReducer";
import { useTestCycle } from "./testSupport";

function startCycle(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["madi", "irene", "odin"],
  nodeId: "cycle-1" | "cycle-2" | "final-release" = "cycle-1",
  seed = 0x0a11ce,
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");

  const path =
    nodeId === "cycle-1"
      ? { currentNodeId: null, completedNodeIds: [] }
      : nodeId === "cycle-2"
        ? {
            currentNodeId: "event-1",
            completedNodeIds: ["cycle-1", "event-1"],
          }
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
    run: {
      ...state.run,
      currentNodeId: path.currentNodeId,
      completedNodeIds: [...path.completedNodeIds],
    },
  };
  const entered = gameReducer(state, { type: "VISIT_NODE", nodeId });
  return nodeId === "cycle-1"
    ? useTestCycle(entered, "quick-win")
    : nodeId === "cycle-2"
      ? useTestCycle(entered, "presence-upgrade")
      : entered;
}

function addCardsToHand(state: GameState, ...cardIds: string[]): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  const cards: CardInstance[] = cardIds.map((cardId, index) => ({
    cardId,
    instanceId: `madi-test-${cardId}-${state.run?.cycle?.temporaryCardCounter ?? 0}-${index}`,
  }));
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        hand: [...state.run.cycle.hand, ...cards],
      },
    },
  };
}

function withTools(state: GameState, ...tools: ToolId[]): GameState {
  if (!state.run) throw new Error("Expected a run");
  return { ...state, run: { ...state.run, tools } };
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

describe("Madi's card catalogue", () => {
  it("authors one Starter, five normal rewards, one rare, and a non-reward token", () => {
    const rewards = eligibleRewardCardIds(["madi"])
      .map(getCard)
      .filter((card) => card.ownerId === "madi");

    expect(getCard("agent-swarm")).toMatchObject({ ownerId: "madi" });
    expect(rewards.map((card) => card.id)).toEqual([
      "yak-shave",
      "custom-toolchain",
      "plan-it-out",
      "write-the-rfc",
      "agentic-loop",
      "parallel-agents",
    ]);
    expect(rewards.filter((card) => card.rarity === "normal")).toHaveLength(5);
    expect(rewards.filter((card) => card.rarity === "rare")).toHaveLength(1);
    expect(eligibleRewardCardIds(["madi"])).not.toContain("sub-agent");
    expect(getCard("sub-agent").tags).toEqual(
      expect.arrayContaining(["generated", "exhaust", "ai-assisted"]),
    );
  });
});

describe("Madi's automation engine", () => {
  it("installs Custom Setup before Agentic Loop triggers the target Script", () => {
    let state = startCycle(["madi", "odin", "paul"]);
    state = playOnRequirement(state, "agentic-loop", "status-composer", "frontend");

    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      unverified: 2,
      verified: 1,
      scriptPower: 1,
    });
    expect(state.run?.history.at(-1)).toEqual({
      kind: "card-played",
      nodeId: "cycle-1",
      day: 1,
      cardId: "agentic-loop",
      taskId: "status-composer",
      discipline: "frontend",
      label: "Frontend +2 unverified · Script +1 · Trigger +1",
      generated: false,
      generatedByCardId: undefined,
      exhausted: false,
      cardsPlayedThisDay: 1,
      chain: { taskId: "status-composer", count: 1 },
    });
  });

  it("keeps CI installation Work separate from the full after-Work trigger", () => {
    let state = withTools(
      startCycle(["madi", "odin", "paul"], "final-release"),
      "ci-runner",
      "cron-upgrade",
    );
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
              requirement.discipline === "frontend"
                ? { ...requirement, scriptPower: 1 }
                : requirement,
            ),
          })),
        },
      },
    };

    state = playOnRequirement(state, "agentic-loop", "final-release", "frontend");

    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      unverified: 2,
      verified: 6,
      scriptPower: 2,
    });
    expect(state.run?.history.at(-1)).toMatchObject({
      label: "Frontend +2 unverified · Script +1 · Run +2 · Trigger +4",
    });
  });

  it("runs a seeded AI Automation engine turn with stackable Toolchain Work", () => {
    let state = startCycle(["madi", "irene", "odin"], "final-release", 0x0a1700);
    state = playOnSquad(state, "custom-toolchain");
    state = playOnRequirement(state, "yak-shave", "final-release", "frontend");
    state = playOnRequirement(state, "agentic-loop", "final-release", "frontend");

    expect(state.run?.cycle).toMatchObject({
      cardTagWorkBonuses: { "ai-assisted": 2 },
      queuedDistractions: 1,
      lastWorkDiscipline: "frontend",
    });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      unverified: 4,
      verified: 3,
      scriptPower: 3,
    });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("custom-toolchain");
  });

  it("stacks multiple Custom Toolchains for every AI Assisted Work card", () => {
    let state = startCycle(["madi", "odin", "paul"], "final-release");
    state = playOnSquad(state, "custom-toolchain");
    state = playOnSquad(state, "custom-toolchain");
    state = playOnRequirement(state, "agent-swarm", "final-release", "backend");

    expect(state.run?.cycle?.cardTagWorkBonuses).toEqual({ "ai-assisted": 4 });
    expect(state.run?.cycle?.tasks[0]?.requirements[1]).toMatchObject({
      unverified: 9,
      scriptPower: 1,
    });
  });

  it("keeps Yak Shave at zero Work and delivers its delayed Distraction", () => {
    let state = startCycle(["madi", "odin", "paul"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          prototypePower: 4,
          fullStackPower: 3,
          lastWorkDiscipline: "backend",
          cardTagWorkBonuses: { automation: 5 },
        },
      },
    };

    state = playOnRequirement(state, "yak-shave", "status-composer", "frontend");
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 0,
      unverified: 0,
      scriptPower: 2,
    });
    expect(state.run?.cycle).toMatchObject({
      queuedDistractions: 1,
      lastWorkDiscipline: "backend",
    });

    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.hand.filter((card) => card.cardId === "distraction")).toHaveLength(1);
  });

  it("adds Plan It Out to the ordinary five-card next-Day draw", () => {
    let state = startCycle(["madi", "odin", "paul"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const drawPile = Array.from({ length: 8 }, (_, index) => ({
      cardId: index % 2 === 0 ? "frontend-3" : "backend-3",
      instanceId: `planned-draw-${index}`,
    }));
    state = addCardsToHand(
      {
        ...state,
        run: {
          ...state.run,
          cycle: {
            ...state.run.cycle,
            hand: [],
            drawPile,
            discardPile: [],
          },
        },
      },
      "plan-it-out",
    );

    state = playOnSquad(state, "plan-it-out");
    expect(state.run?.cycle).toMatchObject({ queuedCardsDrawn: 3 });
    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.cycle?.hand).toHaveLength(8);
    expect(state.run?.cycle).toMatchObject({ queuedCardsDrawn: 0, day: 2 });
  });

  it("Reviews first, then installs only on requirements still incomplete", () => {
    let state = withTools(startCycle(["madi", "irene", "odin"], "cycle-2"), "ci-runner");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task) =>
            task.taskId !== "status-composer"
              ? task
              : {
                  ...task,
                  requirements: task.requirements.map((requirement) =>
                    requirement.discipline === "frontend"
                      ? { ...requirement, unverified: 4 }
                      : { ...requirement, verified: requirement.target },
                  ),
                },
          ),
        },
      },
    };
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const drawBefore = state.run.cycle.drawPile.length;

    state = playOnTask(state, "write-the-rfc", "status-composer");

    expect(state.run?.cycle?.tasks[0]?.requirements).toEqual([
      expect.objectContaining({
        discipline: "frontend",
        verified: 4,
        unverified: 1,
        scriptPower: 1,
      }),
      expect.objectContaining({ discipline: "backend", verified: 3, scriptPower: 0 }),
    ]);
    expect(state.run?.cycle?.drawPile).toHaveLength(drawBefore - 1);
    expect(state.run?.cycle?.triggeredPassiveIds).toEqual(
      expect.arrayContaining(["odin", "irene"]),
    );
    expect(state.run?.history.at(-1)).toMatchObject({
      label: "Verify 3 · Script +1 · 1 bar · Run +1 · Stun · Draw 1",
    });
  });

  it("draws once for each requirement completed by start-of-Day Scripts", () => {
    let state = startCycle(["madi", "irene", "odin"], "cycle-2");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const drawPile = Array.from({ length: 7 }, (_, index) => ({
      cardId: "frontend-3",
      instanceId: `script-completion-draw-${index}`,
    }));
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          hand: [],
          drawPile,
          discardPile: [],
          tasks: state.run.cycle.tasks.map((task, taskIndex) => ({
            ...task,
            requirements: task.requirements.map((requirement, requirementIndex) => ({
              ...requirement,
              verified: taskIndex === 0 && requirementIndex === 0 ? requirement.target - 1 : 0,
              scriptPower: taskIndex === 0 || (taskIndex === 1 && requirementIndex === 0) ? 1 : 0,
              target: taskIndex === 1 && requirementIndex === 0 ? 1 : requirement.target,
            })),
          })),
        },
      },
    };

    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.cycle?.hand).toHaveLength(7);
    expect(state.run?.cycle?.triggeredPassiveIds).toEqual(["irene"]);
  });
});

describe("Madi's Generated card storm", () => {
  it("runs a seeded Parallel Agents payoff and Exhausts every Sub-Agent", () => {
    let state = startCycle(["madi", "irene", "odin"], "final-release", 0x5ababe);
    state = playOnSquad(state, "parallel-agents");

    expect(state.run).toMatchObject({ techDebt: 1 });
    expect(state.run?.cycle?.hand.filter((card) => card.cardId === "sub-agent")).toEqual([
      expect.objectContaining({ generated: true }),
      expect.objectContaining({ generated: true }),
      expect.objectContaining({ generated: true }),
    ]);
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("parallel-agents");

    for (let index = 0; index < 3; index += 1) {
      state = playOnRequirement(state, "sub-agent", "final-release", "frontend");
    }

    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      unverified: 3,
      verified: 6,
      scriptPower: 3,
    });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["parallel-agents", "sub-agent", "sub-agent", "sub-agent"]),
    );
    expect(state.run?.deck.map((card) => card.cardId)).not.toContain("sub-agent");
    expect(state.run?.history.filter((event) => event.kind === "card-played")).toHaveLength(4);
  });
});
