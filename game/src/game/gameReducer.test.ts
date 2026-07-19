import { describe, expect, it } from "vitest";
import {
  describeIntent,
  eligibleRewardCardIds,
  formatIntent,
  getCard,
  getCycle,
  tools,
} from "../domain/content";
import { getEvent } from "../domain/events";
import { selectEncounterLineup } from "../domain/encounters";
import type { DeveloperId, Discipline, ToolId } from "../domain/models";
import { gameReducer, initialGameState } from "./gameReducer";
import type { GameState } from "./gameReducer";
import { resolveEventChoice } from "./eventResolution";
import { taskShippingPreview } from "./rules";

function startCycle(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["paul", "irene", "madi"],
  seed = 0x5eed1234,
  nodeId: "cycle-1" | "cycle-2" | "cycle-3" | "incident-1" | "final-release" = "cycle-1",
): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  const pathToNode = {
    "cycle-1": { currentNodeId: null, completedNodeIds: [] },
    "cycle-2": {
      currentNodeId: "event-1",
      completedNodeIds: ["cycle-1", "event-1"],
    },
    "cycle-3": {
      currentNodeId: "event-2",
      completedNodeIds: ["cycle-1", "event-1", "cycle-2", "incident-1", "event-2"],
    },
    "final-release": {
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
    },
    "incident-1": {
      currentNodeId: "cycle-2",
      completedNodeIds: ["cycle-1", "event-1", "cycle-2"],
    },
  } as const;
  const path = pathToNode[nodeId];
  state = {
    screen: { name: "map" },
    run: {
      ...state.run,
      currentNodeId: path.currentNodeId,
      completedNodeIds: [...path.completedNodeIds],
    },
  };
  const entered = gameReducer(state, { type: "VISIT_NODE", nodeId });
  const legacyCycleId =
    nodeId === "cycle-1"
      ? "quick-win"
      : nodeId === "cycle-2"
        ? "presence-upgrade"
        : nodeId === "cycle-3"
          ? "growth-spurt"
          : undefined;
  return legacyCycleId ? useAuthoredCycle(entered, legacyCycleId) : entered;
}

function shipReadyCycle(seed = 0x5eed1234): GameState {
  let state = startCycle(["paul", "irene", "madi"], seed);
  state = playCard(state, "frontend-3", "status-composer", "frontend");
  state = playCard(state, "frontend-3", "status-composer", "frontend");
  state = playCard(state, "agent-swarm", "status-composer", "backend");
  return gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });
}

function startCycleAt(
  nodeId: "cycle-1" | "cycle-2" | "cycle-3" | "incident-1" | "final-release",
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["paul", "irene", "madi"],
  seed = 0x5eed1234,
): GameState {
  return startCycle(squad, seed, nodeId);
}

function useAuthoredCycle(state: GameState, cycleId: string): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  const definition = getCycle(cycleId);
  return {
    ...state,
    screen: { name: "cycle", nodeId: state.run.cycle.nodeId, cycleId },
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        cycleId,
        day: 1,
        tasks: definition.tasks
          .filter((task) => task.role !== "complication")
          .map((task) => ({
            taskId: task.id,
            name: task.name,
            role: task.role,
            status: "open" as const,
            stunned: false,
            spawnedDay: 1,
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified: 0,
              unverified: 0,
              scriptPower: 0,
              scriptBlock: 0,
            })),
          })),
      },
    },
  };
}

function playCard(
  state: GameState,
  cardId: string,
  taskId: string,
  discipline?: Discipline,
): GameState {
  if (!state.run?.cycle?.hand.some((card) => card.cardId === cardId)) {
    state = addCardToHand(state, cardId);
  }
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`${cardId} is not in hand`);
  return gameReducer(state, {
    type: "PLAY_CARD",
    instanceId: instance.instanceId,
    target: { taskId, discipline },
  });
}

function playCardOnSquad(state: GameState, cardId: string): GameState {
  if (!state.run?.cycle?.hand.some((card) => card.cardId === cardId)) {
    state = addCardToHand(state, cardId);
  }
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`${cardId} is not in hand`);
  return gameReducer(state, {
    type: "PLAY_CARD",
    instanceId: instance.instanceId,
    target: { kind: "squad" },
  });
}

function playCardOnDiscipline(state: GameState, cardId: string, discipline: Discipline): GameState {
  if (!state.run?.cycle?.hand.some((card) => card.cardId === cardId)) {
    state = addCardToHand(state, cardId);
  }
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`${cardId} is not in hand`);
  return gameReducer(state, {
    type: "PLAY_CARD",
    instanceId: instance.instanceId,
    target: { kind: "discipline", discipline },
  });
}

function addCardToHand(state: GameState, cardId: string): GameState {
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  const instance = {
    cardId,
    instanceId: `test-${cardId}-${state.run.cycle.hand.length}`,
  };
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        hand: [...state.run.cycle.hand, instance],
      },
    },
  };
}

function withTools(state: GameState, ...toolIds: ToolId[]): GameState {
  if (!state.run) throw new Error("Expected a run");
  return { ...state, run: { ...state.run, tools: toolIds } };
}

function startMap(completedNodeIds: readonly string[] = [], seed?: number): GameState {
  const state = gameReducer(initialGameState, { type: "START_RUN", seed });
  if (!state.run) throw new Error("Expected a run");
  return {
    screen: { name: "map" },
    run: {
      ...state.run,
      currentNodeId: completedNodeIds.at(-1) ?? null,
      completedNodeIds: [...completedNodeIds],
    },
  };
}

describe("gameReducer", () => {
  it("builds a 10-card deck from three character cards and seven Basics", () => {
    const state = startCycle();
    expect(state.run?.deck).toHaveLength(10);
    expect(state.run?.deck.map((card) => card.cardId)).toEqual([
      "vibe-code",
      "already-fixed",
      "agent-swarm",
      "standup-cover",
      "flexible-2",
      "frontend-3",
      "backend-3",
      "infra-3",
      "flexible-2",
      "review-3",
    ]);
    expect(state.run?.cycle?.hand).toHaveLength(5);
    expect(
      ["frontend-3", "backend-3", "infra-3"].map((cardId) => getCard(cardId).workKind),
    ).toEqual(["unverified", "unverified", "unverified"]);
    expect(getCard("flexible-2")).toMatchObject({ workKind: "verified", amount: 2 });
    expect(getCard("review-3")).toMatchObject({ kind: "review", amount: 3 });
    expect(getCard("standup-cover")).toMatchObject({ kind: "tactic", block: 4 });
  });

  it("renames the shared reward to UI Polish without changing its stable id", () => {
    expect(getCard("pixel-perfect")).toMatchObject({ id: "pixel-perfect", name: "UI Polish" });
  });

  it("uses Pitch In for one Unverified Work on a mismatched requirement", () => {
    let state = startCycle();
    state = playCard(state, "frontend-3", "status-composer", "backend");

    const backend = state.run?.cycle?.tasks[0]?.requirements.find(
      (requirement) => requirement.discipline === "backend",
    );
    expect(backend).toMatchObject({ verified: 0, unverified: 1 });
    expect(state.run?.cycle?.focus).toBe(2);
    expect(state.run?.cycle?.triggeredPassiveIds).not.toContain("paul");
    expect(state.run?.cycle?.triggeredPassiveIds).not.toContain("madi");
  });

  it("keeps a Ready Task intent active until it ships", () => {
    let state = startCycle();
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");
    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.morale).toBe(8);
    expect(state.run?.cycle?.day).toBe(2);
    expect(state.run?.cycle?.resolvedIntents).toEqual(["Crunch · −2 Morale"]);
    expect(state.run?.cycle?.tasks[0]?.status).toBe("ready");
  });

  it("takes telegraphed Morale damage from an Open Task at End Day", () => {
    const state = gameReducer(startCycle(), { type: "END_DAY" });
    expect(state.run?.morale).toBe(8);
    expect(state.run?.cycle?.resolvedIntents).toContain("Crunch · −2 Morale");
  });

  it("uses temporary Block against Crunch and resets it on the next Day", () => {
    let state = startCycle();
    state = addCardToHand(state, "standup-cover");
    state = playCard(state, "standup-cover", "status-composer");
    expect(state.run?.cycle).toMatchObject({ block: 0, focus: 3 });

    state = playCardOnSquad(state, "standup-cover");
    expect(state.run?.cycle?.block).toBe(4);

    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.morale).toBe(10);
    expect(state.run?.cycle).toMatchObject({ day: 2, block: 0 });
    expect(state.run?.cycle?.resolvedIntents).toContain("Crunch · −2 Morale");
  });

  it("uses Block against Defects when shipping risky work", () => {
    let state = startCycleAt("cycle-2");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: { ...state.run, cycle: { ...state.run.cycle, focus: 4 } },
    };
    state = playCardOnSquad(state, "standup-cover");
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    state = playCard(state, "flexible-2", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });

    expect(state.run?.morale).toBe(10);
    expect(state.run?.cycle?.block).toBe(1);
    expect(state.run?.history.at(-1)).toMatchObject({
      kind: "task-shipped",
      defects: 3,
      moraleLoss: 0,
    });
  });

  it("Stuns the current intent without progress and clears Stun next Day", () => {
    let state = startCycle();
    const before = state.run?.cycle?.tasks[0]?.requirements;
    state = playCard(state, "not-reproducible", "status-composer");

    expect(state.run?.cycle?.tasks[0]?.stunned).toBe(true);
    expect(state.run?.cycle?.tasks[0]?.requirements).toEqual(before);

    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.morale).toBe(10);
    expect(state.run?.cycle?.tasks[0]?.stunned).toBe(false);
    expect(state.run?.cycle?.resolvedIntents).toContain("Stunned · Crunch · −2 Morale");
  });

  it("turns an installed Guard Script into fresh Block next Day", () => {
    let state = startCycle();
    state = playCard(state, "health-check", "status-composer", "frontend");

    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      scriptBlock: 2,
    });
    expect(state.run?.cycle?.block).toBe(1);

    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.morale).toBe(9);
    expect(state.run?.cycle).toMatchObject({ day: 2, block: 2 });
  });

  it("ramps encounters from one Task to three before one boss project", () => {
    expect(
      ["quick-win", "presence-upgrade", "growth-spurt", "final-release"].map(
        (cycleId) => getCycle(cycleId).tasks.length,
      ),
    ).toEqual([1, 2, 3, 1]);

    const boss = startCycleAt("final-release");
    expect(boss.screen).toEqual({
      name: "cycle",
      nodeId: "final-release",
      cycleId: "final-release",
    });
    expect(boss.run?.cycle?.tasks).toHaveLength(1);
    expect(boss.run?.cycle?.tasks[0]?.taskId).toBe("final-release");
  });

  it("uses meaningful Scope jumps and punchy Distraction copy", () => {
    const scopeIntents = ["quick-win", "presence-upgrade", "growth-spurt", "final-release"]
      .flatMap((cycleId) => getCycle(cycleId).tasks)
      .flatMap((task) => task.intents)
      .filter((intent) => intent?.kind === "scope");
    expect(scopeIntents.length).toBeGreaterThan(0);
    expect(scopeIntents.every((intent) => intent.amount >= 3)).toBe(true);
    expect(formatIntent({ kind: "interruption" })).toBe("+1 Distraction");
    expect(formatIntent({ kind: "spawn", taskId: "pager-storm", taskName: "Pager Storm" })).toBe(
      "Spawn · Pager Storm",
    );
  });

  it("adds visible Unverified Work from a generic AI Assist intent", () => {
    let state = useAuthoredCycle(startCycle(), "ai-results-analysis");
    state = gameReducer(state, { type: "END_DAY" });

    const themeClustering = state.run?.cycle?.tasks.find(
      (task) => task.taskId === "theme-clustering",
    );
    expect(themeClustering?.requirements[0]).toMatchObject({
      discipline: "backend",
      verified: 0,
      unverified: 3,
    });
    expect(state.run?.cycle?.resolvedIntents).toContain("AI Assist · Backend +3 Unverified");
    expect(describeIntent({ kind: "ai-assist", discipline: "backend", amount: 3 })).toBe(
      "Adds 3 Unverified Backend Work to this Task. Ship this Task or Stun its intent before End Day to stop it.",
    );
  });

  it("lets Stun reject AI Assist for the Day", () => {
    let state = useAuthoredCycle(startCycle(), "ai-results-analysis");
    state = playCard(state, "not-reproducible", "theme-clustering");
    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.cycle?.tasks[0]?.requirements[0]?.unverified).toBe(0);
    expect(state.run?.cycle?.resolvedIntents).toContain(
      "Stunned · AI Assist · Backend +3 Unverified",
    );
  });

  it("lets Review clean AI-assisted Work before shipping", () => {
    let state = useAuthoredCycle(startCycle(), "ai-results-analysis");
    state = gameReducer(state, { type: "END_DAY" });
    state = playCard(state, "review-3", "theme-clustering");

    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 3,
      unverified: 0,
    });
  });

  it("previews and applies the cost of shipping AI-assisted Work dirty", () => {
    let state = useAuthoredCycle(startCycle(), "ai-results-analysis");
    state = gameReducer(state, { type: "END_DAY" });
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task) =>
            task.taskId === "theme-clustering"
              ? {
                  ...task,
                  status: "ready" as const,
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.target - requirement.unverified,
                  })),
                }
              : task,
          ),
        },
      },
    };

    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const task = state.run.cycle.tasks.find((candidate) => candidate.taskId === "theme-clustering");
    if (!task) throw new Error("Expected Theme Clustering");
    expect(taskShippingPreview(task)).toEqual({
      unverified: 3,
      defects: 1,
      moraleLoss: 1,
      techDebt: 2,
    });

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "theme-clustering" });
    expect(state.run?.techDebt).toBe(2);
    expect(state.run?.morale).toBe(9);
    expect(state.run?.cycle).toMatchObject({ defects: 1, techDebtAdded: 2 });
    expect(state.run?.history.at(-1)).toMatchObject({
      kind: "task-shipped",
      taskId: "theme-clustering",
      defects: 1,
      techDebtAdded: 2,
    });
  });

  it("starts an Incident with its primary Task and spawns an age-zero Complication", () => {
    let state = startCycleAt("incident-1", ["paul", "odin", "irene"]);
    expect(state.run?.cycle?.cycleId).toBe("production-incident");
    expect(state.run?.cycle?.tasks.map((task) => task.taskId)).toEqual(["restore-service"]);

    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.cycle?.day).toBe(2);
    expect(state.run?.cycle?.tasks.map((task) => [task.taskId, task.spawnedDay])).toEqual([
      ["restore-service", 1],
      ["pager-storm", 2],
    ]);

    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.resolvedIntents).toContain("+1 Distraction");
  });

  it("lets Stun cancel an Incident spawn intent", () => {
    let state = startCycleAt("incident-1", ["paul", "odin", "irene"]);
    state = playCard(state, "not-reproducible", "restore-service");
    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.cycle?.tasks.map((task) => task.taskId)).toEqual(["restore-service"]);
    expect(state.run?.cycle?.resolvedIntents).toContain("Stunned · Spawn · Pager Storm");
  });

  it("ends an Incident when its primary Task ships and queues Tool then card rewards", () => {
    let state = startCycleAt("incident-1", ["paul", "odin", "irene"], 24680);
    state = gameReducer(state, { type: "END_DAY" });
    if (!state.run?.cycle) throw new Error("Expected an active Incident");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task) =>
            task.taskId === "restore-service"
              ? {
                  ...task,
                  status: "ready" as const,
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.target,
                  })),
                }
              : task,
          ),
        },
      },
    };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "restore-service" });
    expect(state.screen.name).toBe("report");
    if (state.screen.name !== "report") throw new Error("Expected an Incident report");
    expect(state.screen.report).toMatchObject({ outcome: "shipped", toolReward: true });
    expect(state.screen.report.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ taskId: "restore-service", completed: true }),
        expect.objectContaining({ taskId: "pager-storm", completed: false, cleared: true }),
      ]),
    );
    expect(state.run?.pendingToolReward?.toolIds).toHaveLength(3);
    expect(state.run?.pendingCardReward?.cardIds).toHaveLength(3);
    expect(state.run?.history.at(-2)).toMatchObject({
      kind: "task-shipped",
      focusGained: 0,
    });

    state = gameReducer(state, { type: "CONTINUE_REPORT" });
    expect(state.screen.name).toBe("tool-reward");
    const toolId = state.run?.pendingToolReward?.toolIds[0];
    if (!toolId) throw new Error("Expected a Tool reward");
    state = gameReducer(state, { type: "CHOOSE_TOOL_REWARD", toolId });
    expect(state.screen.name).toBe("reward");
    expect(state.run?.tools).toContain(toolId);
    expect(state.run?.pendingCardReward).not.toBeNull();
    state = gameReducer(state, { type: "SKIP_CARD_REWARD" });
    expect(state.screen.name).toBe("map");
  });

  it("makes an Incident Side Quest required before the primary Task can end the Cycle", () => {
    let state = startCycleAt("incident-1", ["paul", "odin", "irene"], 24680);
    state = playCardOnDiscipline(state, "side-quest", "frontend");
    if (!state.run?.cycle) throw new Error("Expected an active Incident");
    const sideQuest = state.run.cycle.tasks.find((task) => task.role === "side-quest");
    if (!sideQuest) throw new Error("Expected a Side Quest");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task) => ({
            ...task,
            status: "ready" as const,
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified: requirement.target,
            })),
          })),
        },
      },
    };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "restore-service" });
    expect(state.screen.name).toBe("cycle");
    expect(state.run?.cycle).toMatchObject({ focus: 3, prototypePower: 0 });

    state = gameReducer(state, { type: "SHIP_TASK", taskId: sideQuest.taskId });
    expect(state.screen.name).toBe("report");
    if (state.screen.name !== "report") throw new Error("Expected an Incident report");
    expect(state.screen.report).toMatchObject({ outcome: "shipped", toolReward: true });
    expect(state.screen.report.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ taskId: "restore-service", completed: true }),
        expect.objectContaining({ taskId: sideQuest.taskId, completed: true }),
      ]),
    );
    expect(state.run?.history.at(-2)).toMatchObject({
      kind: "task-shipped",
      taskId: sideQuest.taskId,
      focusGained: 0,
    });
  });

  it("applies the larger Incident miss penalty without offering rewards", () => {
    let state = startCycleAt("incident-1", ["paul", "odin", "irene"]);
    if (!state.run?.cycle) throw new Error("Expected an active Incident");
    state = {
      ...state,
      run: {
        ...state.run,
        morale: 20,
        cycle: { ...state.run.cycle, startingMorale: 20 },
      },
    };
    for (let day = 0; day < 4; day += 1) {
      state = gameReducer(state, { type: "END_DAY" });
    }

    expect(state.screen.name).toBe("report");
    if (state.screen.name !== "report") throw new Error("Expected an Incident report");
    expect(state.screen.report).toMatchObject({
      outcome: "missed",
      moraleDelta: -17,
      techDebtAdded: 4,
      toolReward: false,
    });
    expect(state.run?.morale).toBe(3);
    expect(state.run?.pendingToolReward).toBeNull();
    expect(state.run?.pendingCardReward).toBeNull();
  });

  it("makes every Odin Review Stun its Task's intent", () => {
    let state = startCycle(["paul", "odin", "madi"]);
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    state = playCard(state, "design-review", "status-composer");

    const frontend = state.run?.cycle?.tasks[0]?.requirements[0];
    expect(frontend).toMatchObject({ verified: 4, unverified: 0 });
    expect(state.run?.cycle?.tasks[0]?.stunned).toBe(true);
    expect(state.run?.cycle?.triggeredPassiveIds).toEqual(["madi", "odin"]);
  });

  it("does not ration Odin's Stun to one Review per Day", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          focus: 2,
          tasks: state.run.cycle.tasks.map((task) => ({
            ...task,
            requirements: task.requirements.map((requirement, index) => ({
              ...requirement,
              unverified: index === 0 ? 3 : 0,
            })),
          })),
        },
      },
    };

    state = playCard(state, "review-3", "status-composer");
    state = playCard(state, "review-3", "reconnect-logic");

    expect(state.run?.cycle?.tasks.map((task) => task.stunned)).toEqual([true, true]);
    expect(state.run?.cycle?.tasks.map((task) => task.requirements[0]?.verified)).toEqual([3, 3]);
  });

  it("ships every Ready Task with exact Defect, Morale, and credit consequences", () => {
    const state = shipReadyCycle();

    expect(state.screen.name).toBe("report");
    if (state.screen.name !== "report") throw new Error("Expected report");
    expect(state.screen.report).toMatchObject({
      outcome: "shipped",
      defects: 3,
      moraleDelta: -3,
      creditsGained: 40,
      techDebtAdded: 4,
    });
    expect(state.run?.morale).toBe(7);
    expect(state.run?.techDebt).toBe(4);
    expect(state.run?.credits).toBe(80);
    expect(state.run?.completedNodeIds).toContain("cycle-1");
    expect(state.run?.history.at(-1)).toMatchObject({
      kind: "cycle-finished",
      nodeId: "cycle-1",
      outcome: "shipped",
    });
  });

  it("previews the opening discipline Basics as three Defects and four Tech Debt", () => {
    let state = startCycle();
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "backend-3", "status-composer", "backend");
    const task = state.run?.cycle?.tasks[0];
    if (!task) throw new Error("Expected Status Composer");

    expect(taskShippingPreview(task)).toEqual({
      unverified: 8,
      defects: 3,
      moraleLoss: 3,
      techDebt: 4,
    });
  });

  it("ships one Ready Task immediately and makes it untargetable", () => {
    let state = startCycleAt("cycle-2");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");

    expect(state.run?.cycle?.tasks[0]?.status).toBe("ready");
    state = gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });

    expect(state.screen.name).toBe("cycle");
    expect(state.run?.morale).toBe(7);
    expect(state.run?.cycle?.defects).toBe(3);
    expect(state.run?.cycle?.tasks.map((task) => task.status)).toEqual(["shipped", "open"]);
    expect(state.run?.history.at(-1)).toEqual({
      kind: "task-shipped",
      nodeId: "cycle-2",
      taskId: "status-composer",
      defects: 3,
      moraleLoss: 3,
      techDebtAdded: 4,
      focusGained: 1,
    });
    expect(state.run?.techDebt).toBe(4);
    expect(state.run?.cycle?.focus).toBe(1);

    const beforeIllegalPlay = state;
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    expect(state).toBe(beforeIllegalPlay);
  });

  it("lets Review clean opening Unverified Work while a Ready Task waits to ship", () => {
    let state = startCycleAt("cycle-2");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");

    state = {
      ...state,
      run: {
        ...state.run,
        cycle: { ...state.run.cycle, focus: 1 },
      },
    };
    state = addCardToHand(state, "review-3");
    state = playCard(state, "review-3", "status-composer");

    const task = state.run?.cycle?.tasks[0];
    expect(task?.status).toBe("ready");
    expect(
      task?.requirements.find((requirement) => requirement.discipline === "frontend"),
    ).toMatchObject({ verified: 3, unverified: 2 });
  });

  it("adds Tech Debt when one Task ships with two or more Defects", () => {
    let state = startCycleAt("cycle-2");
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    state = playCard(state, "flexible-2", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");
    const initialDeckSize = state.run?.deck.length ?? 0;

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });

    expect(state.run?.morale).toBe(7);
    expect(state.run?.cycle).toMatchObject({ defects: 3, techDebtAdded: 4 });
    expect(state.run?.techDebt).toBe(4);
    expect(state.run?.deck).toHaveLength(initialDeckSize + 1);
    expect(state.run?.deck.at(-1)?.cardId).toBe("tech-debt");
    expect(state.run?.history.at(-1)).toMatchObject({
      kind: "task-shipped",
      defects: 3,
      techDebtAdded: 4,
      focusGained: 1,
    });
  });

  it("lets Review pay down the Tech Debt consequence before shipping", () => {
    let state = startCycleAt("cycle-2");
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    state = playCard(state, "flexible-2", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = { ...state, run: { ...state.run, cycle: { ...state.run.cycle, focus: 1 } } };
    state = addCardToHand(state, "review-3");
    state = playCard(state, "review-3", "status-composer");
    state = gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });

    expect(state.run?.techDebt).toBe(2);
    expect(state.run?.cycle).toMatchObject({ defects: 2, techDebtAdded: 2 });
    expect(state.run?.deck.at(-1)?.cardId).not.toBe("tech-debt");
  });

  it("installs a Script that adds Verified Work at the start of each new Day", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
    state = addCardToHand(state, "quick-script");
    state = playCard(state, "quick-script", "reconnect-logic", "backend");

    expect(state.run?.cycle?.tasks[1]?.requirements[0]).toMatchObject({
      verified: 1,
      scriptPower: 1,
    });

    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.day).toBe(2);
    expect(state.run?.cycle?.tasks[1]?.requirements[0]).toMatchObject({
      verified: 2,
      scriptPower: 1,
    });
  });

  it("lets a Script move an Open Task to Ready at the start of a new Day", () => {
    let state = startCycle(["paul", "odin", "madi"]);
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
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.discipline === "frontend" ? 5 : 2,
                    scriptPower: requirement.discipline === "backend" ? 1 : 0,
                  })),
                },
          ),
        },
      },
    };

    expect(state.run?.cycle?.tasks[0]?.status).toBe("open");
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.tasks[0]).toMatchObject({ status: "ready" });
    expect(state.run?.cycle?.tasks[0]?.requirements[1]).toMatchObject({ verified: 3 });
  });

  it("can trigger an installed Script immediately", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
    state = addCardToHand(state, "quick-script");
    state = playCard(state, "quick-script", "reconnect-logic", "backend");
    state = addCardToHand(state, "run-it-now");
    state = playCard(state, "run-it-now", "reconnect-logic", "backend");

    expect(state.run?.cycle?.tasks[1]?.requirements[0]).toMatchObject({
      verified: 2,
      scriptPower: 1,
    });
    expect(state.run?.cycle?.focus).toBe(1);
  });

  it("offers the Automation family in post-Cycle rewards", () => {
    const rewardIds = eligibleRewardCardIds(["paul", "odin", "irene"]);
    expect(rewardIds).toEqual(
      expect.arrayContaining(["quick-script", "cron-job", "run-it-now", "quietly-automated"]),
    );
  });

  it("restores Focus for every non-final Task Paul ships", () => {
    let state = startCycleAt("cycle-3", ["paul", "odin", "madi"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          focus: 0,
          tasks: state.run.cycle.tasks.map((task) => ({
            ...task,
            status: "ready" as const,
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified: requirement.target,
              unverified: 0,
            })),
          })),
        },
      },
    };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "billing-webhook" });
    expect(state.run?.cycle?.focus).toBe(1);
    state = gameReducer(state, { type: "SHIP_TASK", taskId: "onboarding-polish" });
    expect(state.run?.cycle?.focus).toBe(2);
    state = gameReducer(state, { type: "SHIP_TASK", taskId: "deploy-pipeline" });

    const shippingEvents = state.run?.history.filter((event) => event.kind === "task-shipped");
    expect(shippingEvents?.map((event) => event.focusGained)).toEqual([1, 1, 0]);
  });

  it("installs a Script for every AI Assisted card Madi plays", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "frontend");

    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ scriptPower: 2 });
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("madi");
  });

  it("draws after every requirement Irene completes with Verified Work", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "irene"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task) => ({
            ...task,
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified:
                (task.taskId === "status-composer" && requirement.discipline === "frontend") ||
                (task.taskId === "reconnect-logic" && requirement.discipline === "infra")
                  ? requirement.target - 2
                  : 0,
            })),
          })),
        },
      },
    };
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const startingDrawPile = state.run.cycle.drawPile.length;

    state = playCard(state, "flexible-2", "status-composer", "frontend");
    state = playCard(state, "flexible-2", "reconnect-logic", "infra");

    expect(state.run?.cycle?.drawPile).toHaveLength(startingDrawPile - 2);
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("irene");
    expect(state.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(5);
    expect(state.run?.cycle?.tasks[1]?.requirements[1]?.verified).toBe(4);
  });

  it("lets Paul's ship passive overfill Focus", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task, index) =>
            index > 0
              ? task
              : {
                  ...task,
                  status: "ready" as const,
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.target,
                  })),
                },
          ),
        },
      },
    };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });
    expect(state.run?.cycle?.focus).toBe(4);
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("paul");
    expect(state.run?.history.at(-1)).toMatchObject({ focusGained: 1 });
  });

  it("authors Paul's complete Starter, five-card normal pool, and rare", () => {
    const paulRewards = eligibleRewardCardIds(["paul"])
      .map(getCard)
      .filter((card) => card.ownerId === "paul");

    expect(getCard("vibe-code")).toMatchObject({ ownerId: "paul" });
    expect(paulRewards.map((card) => card.id)).toEqual([
      "spike-it",
      "side-quest",
      "full-stack",
      "new-model-dropped",
      "post-through-it",
      "ebb-and-flow",
    ]);
    expect(paulRewards.filter((card) => card.rarity === "normal")).toHaveLength(5);
    expect(paulRewards.filter((card) => card.rarity === "rare")).toHaveLength(1);
  });

  it("turns shipped Side Quest scope into stackable Prototype Work", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "irene"]);
    state = playCardOnDiscipline(state, "side-quest", "frontend");

    const sideQuest = state.run?.cycle?.tasks.find((task) => task.role === "side-quest");
    expect(sideQuest).toMatchObject({
      name: "Dark Mode for Sharkimedes",
      prototypeReward: 1,
      status: "open",
      requirements: [{ discipline: "frontend", target: 3 }],
    });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("side-quest");

    state = playCard(state, "frontend-3", sideQuest?.taskId ?? "missing", "frontend");
    state = gameReducer(state, { type: "SHIP_TASK", taskId: sideQuest?.taskId ?? "missing" });

    expect(state.run?.cycle).toMatchObject({ prototypePower: 1, focus: 2 });
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("paul");

    state = playCard(state, "flexible-2", "status-composer", "frontend");
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ verified: 3 });
  });

  it("makes Full Stack reward switching actual target disciplines", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "irene"]);
    state = playCardOnSquad(state, "full-stack");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "backend-3", "reconnect-logic", "backend");

    expect(state.run?.cycle).toMatchObject({
      fullStackPower: 1,
      lastWorkDiscipline: "backend",
      cardsPlayedThisDay: 3,
    });
    expect(state.run?.cycle?.tasks[1]?.requirements[0]).toMatchObject({ unverified: 4 });
  });

  it("generates risky Quick Fixes and Exhausts them after play", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
    state = playCardOnSquad(state, "new-model-dropped");

    expect(state.run).toMatchObject({ techDebt: 1 });
    expect(state.run?.cycle?.hand.filter((card) => card.cardId === "quick-fix")).toEqual([
      expect.objectContaining({ generated: true }),
      expect.objectContaining({ generated: true }),
    ]);

    state = playCard(state, "quick-fix", "status-composer", "frontend");
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("quick-fix");
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      unverified: 2,
      scriptPower: 1,
    });
  });

  it("scales Post Through It from cards already played today", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "irene"]);
    state = playCard(state, "spike-it", "status-composer", "frontend");
    state = playCard(state, "vibe-code", "reconnect-logic", "backend");
    state = playCardOnSquad(state, "post-through-it");

    expect(state.run?.cycle).toMatchObject({ block: 4, cardsPlayedThisDay: 3 });
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("spike-it");
  });

  it("front-loads Ebb & Flow and puts its hangover into the next hand", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "irene"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          focus: 0,
          drawPile: [
            { cardId: "frontend-3", instanceId: "ebb-draw-1" },
            { cardId: "backend-3", instanceId: "ebb-draw-2" },
            { cardId: "infra-3", instanceId: "ebb-draw-3" },
          ],
          discardPile: [],
        },
      },
    };

    state = playCardOnSquad(state, "ebb-and-flow");
    expect(state.run?.cycle).toMatchObject({ focus: 3, queuedDistractions: 3 });
    expect(state.run?.cycle?.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining(["ebb-draw-1", "ebb-draw-2", "ebb-draw-3"]),
    );
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("ebb-and-flow");

    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle).toMatchObject({
      day: 2,
      cardsPlayedThisDay: 0,
      queuedDistractions: 0,
    });
    expect(state.run?.cycle?.hand.filter((card) => card.cardId === "distraction")).toHaveLength(4);
    expect(state.run?.cycle?.resolvedIntents).toContain("+1 Distraction");
  });

  it("does not restore Focus for the final Task in a Cycle", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          focus: 1,
          tasks: state.run.cycle.tasks.map((task) => ({
            ...task,
            status: task.taskId === "status-composer" ? "shipped" : "ready",
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified: requirement.target,
            })),
          })),
        },
      },
    };
    state = gameReducer(state, { type: "SHIP_TASK", taskId: "reconnect-logic" });
    expect(state.run?.history.at(-2)).toMatchObject({
      kind: "task-shipped",
      focusGained: 0,
    });
  });

  it("cancels a Task's intent only after that Task ships", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
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
                  status: "ready" as const,
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.target,
                  })),
                },
          ),
        },
      },
    };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });
    state = gameReducer(state, { type: "END_DAY" });

    expect(state.run?.morale).toBe(10);
    expect(state.run?.cycle?.resolvedIntents).toEqual(["+1 Distraction"]);
  });

  it("loses immediately when a risky Task ships away the last Morale", () => {
    let state = startCycle();
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "agent-swarm", "status-composer", "backend");
    if (!state.run) throw new Error("Expected a run");
    state = { ...state, run: { ...state.run, morale: 1 } };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });

    expect(state.screen).toEqual({
      name: "retro",
      outcome: "defeat",
      cause: "technically-shipped",
    });
    expect(state.run?.morale).toBe(-2);
    expect(state.run?.cycle).toBeNull();
    expect(state.run?.history.at(-1)).toMatchObject({
      kind: "task-shipped",
      taskId: "status-composer",
    });
  });

  it("creates a deterministic three-card reward with squad, team, and wildcard slots", () => {
    const first = shipReadyCycle(123456);
    const second = shipReadyCycle(123456);
    const cardIds = first.run?.pendingCardReward?.cardIds;

    expect(cardIds).toEqual(second.run?.pendingCardReward?.cardIds);
    expect(cardIds).toHaveLength(3);
    expect(new Set(cardIds).size).toBe(3);
    if (!cardIds || !first.run) throw new Error("Expected a reward");

    const [squadCard, teamCard, wildcardCard] = cardIds.map(getCard);
    expect(squadCard.ownerId && first.run.squad.includes(squadCard.ownerId)).toBe(true);
    expect(teamCard.ownerId).toBeUndefined();
    expect(!wildcardCard.ownerId || first.run.squad.includes(wildcardCard.ownerId)).toBe(true);
  });

  it("adds a chosen reward card to the permanent deck", () => {
    let state = shipReadyCycle(98765);
    const initialDeckSize = state.run?.deck.length ?? 0;
    const cardId = state.run?.pendingCardReward?.cardIds[0];
    if (!cardId) throw new Error("Expected a reward card");

    state = gameReducer(state, { type: "CONTINUE_REPORT" });
    expect(state.screen.name).toBe("reward");
    state = gameReducer(state, { type: "CHOOSE_CARD_REWARD", cardId });

    expect(state.screen.name).toBe("map");
    expect(state.run?.deck).toHaveLength(initialDeckSize + 1);
    expect(state.run?.deck.at(-1)?.cardId).toBe(cardId);
    expect(state.run?.pendingCardReward).toBeNull();
    expect(state.run?.history.at(-1)).toEqual({
      kind: "card-added",
      cardId,
      sourceNodeId: "cycle-1",
    });
  });

  it("skips a reward without changing the permanent deck", () => {
    let state = shipReadyCycle(45678);
    const initialDeck = state.run?.deck;

    state = gameReducer(state, { type: "CONTINUE_REPORT" });
    state = gameReducer(state, { type: "SKIP_CARD_REWARD" });

    expect(state.screen.name).toBe("map");
    expect(state.run?.deck).toEqual(initialDeck);
    expect(state.run?.pendingCardReward).toBeNull();
    expect(state.run?.history.at(-1)).toEqual({
      kind: "card-skipped",
      sourceNodeId: "cycle-1",
    });
  });

  it("misses at the final deadline, loses Morale, and adds Tech Debt", () => {
    let state = startCycle();
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        morale: 20,
        cycle: { ...state.run.cycle, startingMorale: 20 },
      },
    };
    state = gameReducer(state, { type: "END_DAY" });
    state = gameReducer(state, { type: "END_DAY" });
    state = gameReducer(state, { type: "END_DAY" });
    state = gameReducer(state, { type: "END_DAY" });
    state = gameReducer(state, { type: "END_DAY" });

    expect(state.screen.name).toBe("report");
    if (state.screen.name !== "report") throw new Error("Expected report");
    expect(state.screen.report).toMatchObject({
      outcome: "missed",
      defects: 0,
      moraleDelta: -12,
      creditsGained: 0,
      techDebtAdded: 3,
    });
    expect(state.run?.morale).toBe(8);
    expect(state.run?.techDebt).toBe(3);
    expect(state.screen.report.tasks.map((task) => task.completed)).toEqual([false]);
    expect(state.run?.deck.at(-1)?.cardId).toBe("tech-debt");
    expect(state.run?.pendingCardReward).toBeNull();
  });

  it("resolves the final intent before deciding whether a Ready Task auto-ships", () => {
    let state = startCycleAt("cycle-2", ["paul", "odin", "madi"]);
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          day: 5,
          tasks: state.run.cycle.tasks.map((task) => ({
            ...task,
            status: task.taskId === "status-composer" ? "open" : "ready",
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified: requirement.target,
            })),
          })),
        },
      },
    };

    state = gameReducer(state, { type: "END_DAY" });

    expect(state.screen.name).toBe("report");
    if (state.screen.name !== "report") throw new Error("Expected report");
    expect(state.screen.report.outcome).toBe("missed");
    expect(state.screen.report.tasks.map((task) => task.completed)).toEqual([false, true]);
    expect(state.screen.report.resolvedIntents).toContain("Crunch · −3 Morale");
  });

  it("does not allow more than three developers", () => {
    let state = gameReducer(initialGameState, { type: "START_RUN" });
    for (const developerId of ["paul", "odin", "irene", "madi"] as const) {
      state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
    }
    expect(state.run?.squad).toEqual(["paul", "odin", "irene"]);
  });

  it("keeps locked map nodes unavailable", () => {
    const state = gameReducer(startMap(), { type: "VISIT_NODE", nodeId: "event-1" });
    expect(state.screen.name).toBe("map");
    expect(state.run?.completedNodeIds).toEqual([]);
  });

  it("opens the seeded encounter assigned to each map slot", () => {
    const seed = 4242;
    const lineup = selectEncounterLineup(seed);
    const opener = gameReducer(startMap([], seed), { type: "VISIT_NODE", nodeId: "cycle-1" });
    const safeElite = gameReducer(startMap(["cycle-1", "event-1", "cycle-2"], seed), {
      type: "VISIT_NODE",
      nodeId: "cycle-safe-1",
    });

    expect(opener.run?.cycle?.cycleId).toBe(lineup.opener);
    expect(safeElite.run?.cycle?.cycleId).toBe(lineup.safeIncidents[0]);
  });

  it("locks the unchosen Incident after taking its safer Cycle", () => {
    const safeElite = gameReducer(startMap(["cycle-1", "event-1", "cycle-2"]), {
      type: "VISIT_NODE",
      nodeId: "cycle-safe-1",
    });
    if (!safeElite.run) throw new Error("Expected a run");
    const returned = {
      screen: { name: "map" as const },
      run: {
        ...safeElite.run,
        cycle: null,
        completedNodeIds: [...safeElite.run.completedNodeIds, "cycle-safe-1"],
      },
    };

    expect(gameReducer(returned, { type: "VISIT_NODE", nodeId: "incident-1" })).toBe(returned);
  });

  it.each([
    ["event-1", "event", ["cycle-1"]],
    ["shop-1", "shop", ["cycle-1", "event-1", "cycle-2", "incident-1"]],
    ["cycle-2", "cycle", ["cycle-1", "event-1"]],
    ["incident-1", "cycle", ["cycle-1", "event-1", "cycle-2"]],
    [
      "retro-1",
      "retro",
      [
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
        "final-release",
      ],
    ],
  ] as const)("routes %s to the %s placeholder", (nodeId, screenName, predecessors) => {
    let state = startMap(predecessors);
    state = gameReducer(state, { type: "VISIT_NODE", nodeId });
    expect(state.screen.name).toBe(screenName);
    expect(state.run?.currentNodeId).toBe(nodeId);
  });

  it("locks the unchosen sibling after committing to a branch", () => {
    let state = startMap(["cycle-1"]);
    state = gameReducer(state, { type: "VISIT_NODE", nodeId: "event-1" });
    if (state.screen.name !== "event" || !state.run) throw new Error("Expected an Event");
    const choiceId = getEvent(state.screen.eventId).choices.find(
      (choice) => !resolveEventChoice(choice, state.run!).disabledReason,
    )?.id;
    if (!choiceId) throw new Error("Expected an enabled Event choice");
    state = gameReducer(state, { type: "CHOOSE_EVENT", choiceId });

    expect(state.screen.name).toBe("map");
    expect(state.run?.currentNodeId).toBe("event-1");
    expect(state.run?.completedNodeIds).toContain("event-1");

    const beforeLockedVisit = state;
    state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-optional-1" });
    expect(state).toBe(beforeLockedVisit);

    state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-2" });
    expect(state.screen.name).toBe("cycle");
    expect(state.run?.currentNodeId).toBe("cycle-2");
  });

  it("resolves a composed Quarterly Connect choice and records exact outcomes", () => {
    let retro = startMap(["cycle-1"]);
    if (!retro.run) throw new Error("Expected a run");
    retro = {
      screen: { name: "event", nodeId: "event-1", eventId: "quarterly-connect" },
      run: {
        ...retro.run,
        morale: 7,
        techDebt: 3,
        deck: [...retro.run.deck, { cardId: "tech-debt", instanceId: "test-debt" }],
        currentNodeId: "event-1",
      },
    };
    retro = gameReducer(retro, { type: "CHOOSE_EVENT", choiceId: "retro" });
    expect(retro.run).toMatchObject({ morale: 10, credits: 40, techDebt: 1 });
    expect(retro.run?.deck.some((card) => card.cardId === "tech-debt")).toBe(false);
    expect(retro.run?.completedNodeIds).toContain("event-1");
    expect(retro.run?.history.at(-1)).toEqual({
      kind: "event-resolved",
      nodeId: "event-1",
      eventId: "quarterly-connect",
      choiceId: "retro",
      outcome: ["+3 Morale", "−2 Tech Debt"],
    });
  });

  it("selects four seeded Events deterministically without repeats", () => {
    const runEventRoute = (seed: number) => {
      let state = startMap([], seed);
      const eventIds: string[] = [];
      const route = [
        ["cycle-1", "event-1"],
        ["incident-1", "event-2"],
        ["cycle-3", "event-3"],
        ["incident-2", "event-4"],
      ] as const;
      for (const [sourceNodeId, eventNodeId] of route) {
        if (!state.run) throw new Error("Expected a run");
        state = {
          screen: { name: "map" },
          run: {
            ...state.run,
            currentNodeId: sourceNodeId,
            completedNodeIds: state.run.completedNodeIds.includes(sourceNodeId)
              ? state.run.completedNodeIds
              : [...state.run.completedNodeIds, sourceNodeId],
          },
        };
        state = gameReducer(state, { type: "VISIT_NODE", nodeId: eventNodeId });
        if (state.screen.name !== "event" || !state.run) throw new Error("Expected an Event");
        eventIds.push(state.screen.eventId);
        const choiceId = getEvent(state.screen.eventId).choices.find(
          (choice) => !resolveEventChoice(choice, state.run!).disabledReason,
        )?.id;
        if (!choiceId) throw new Error("Expected an enabled Event choice");
        state = gameReducer(state, { type: "CHOOSE_EVENT", choiceId });
        while (state.screen.name === "event" && state.screen.resolution) {
          const option = state.screen.resolution.pending.options[0];
          if (!option) throw new Error("Expected an Event option");
          state = gameReducer(state, { type: "CHOOSE_EVENT_OPTION", optionId: option.id });
        }
      }
      return { eventIds, history: state.run?.history };
    };

    const first = runEventRoute(0xe7e17);
    const second = runEventRoute(0xe7e17);
    expect(first.eventIds).toEqual(second.eventIds);
    expect(new Set(first.eventIds).size).toBe(4);
    expect(first.history?.filter((entry) => entry.kind === "event-resolved")).toHaveLength(4);
  });

  it("authors unrestricted build-shaping and event-exclusive Tools", () => {
    expect(tools).toHaveLength(13);
    expect(tools.map((tool) => tool.id)).toEqual([
      "pairing-session",
      "ci-runner",
      "test-suite",
      "error-budget",
      "merge-queue",
      "noise-cancelling-headphones",
      "enterprise-ai-licence",
      "cron-upgrade",
      "cat-tax",
      "reef-shark",
      "platypus",
      "pangolin",
      "timezone-wrangler",
    ]);
    expect(tools.every((tool) => !tool.rules.includes("first"))).toBe(true);
  });

  it("offers deterministic unique Tool rewards and never offers an owned Tool", () => {
    const base = withTools(startMap(), "pairing-session");
    const first = gameReducer(base, { type: "OFFER_TOOL_REWARD", sourceNodeId: "incident-a" });
    const second = gameReducer(base, { type: "OFFER_TOOL_REWARD", sourceNodeId: "incident-a" });

    expect(first.screen.name).toBe("tool-reward");
    expect(first.run?.pendingToolReward).toEqual(second.run?.pendingToolReward);
    const offered = first.run?.pendingToolReward?.toolIds;
    expect(offered).toHaveLength(3);
    expect(new Set(offered).size).toBe(3);
    expect(offered).not.toContain("pairing-session");
    expect(offered).not.toEqual(
      expect.arrayContaining([
        "cat-tax",
        "reef-shark",
        "platypus",
        "pangolin",
        "timezone-wrangler",
      ]),
    );

    const chosen = offered?.[0];
    if (!chosen) throw new Error("Expected a Tool reward");
    const selected = gameReducer(first, { type: "CHOOSE_TOOL_REWARD", toolId: chosen });
    expect(selected.screen.name).toBe("map");
    expect(selected.run?.tools).toEqual(["pairing-session", chosen]);
    expect(selected.run?.pendingToolReward).toBeNull();
    expect(selected.run?.history.at(-1)).toEqual({
      kind: "tool-added",
      toolId: chosen,
      sourceNodeId: "incident-a",
    });
  });

  it("makes every Pitch In Verified with Pairing Session", () => {
    let state = withTools(startCycle(["paul", "odin", "madi"]), "pairing-session");
    state = playCard(state, "backend-3", "status-composer", "frontend");
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 1,
      unverified: 0,
    });
  });

  it("runs newly installed Scripts immediately with CI Runner", () => {
    let state = withTools(startCycleAt("cycle-2", ["paul", "odin", "madi"]), "ci-runner");
    state = playCard(state, "quick-script", "reconnect-logic", "backend");
    expect(state.run?.cycle?.tasks[1]?.requirements[0]).toMatchObject({
      verified: 2,
      scriptPower: 1,
    });
  });

  it("turns every point of Review into Block with Test Suite", () => {
    let state = withTools(startCycle(["paul", "irene", "madi"]), "test-suite");
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    state = playCard(state, "review-3", "status-composer");
    expect(state.run?.cycle).toMatchObject({ block: 3 });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 3,
      unverified: 1,
    });
  });

  it("carries all unused Block between Days with Error Budget", () => {
    let state = withTools(startCycle(["paul", "odin", "madi"]), "error-budget");
    state = playCardOnSquad(state, "protect-the-branch");
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle).toMatchObject({ day: 2, block: 4 });
  });

  it("draws two and gains Focus on every ship with Merge Queue", () => {
    let state = withTools(startCycleAt("cycle-2", ["paul", "odin", "madi"]), "merge-queue");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          focus: 3,
          hand: [],
          drawPile: [
            { cardId: "frontend-3", instanceId: "merge-draw-1" },
            { cardId: "backend-3", instanceId: "merge-draw-2" },
          ],
          tasks: state.run.cycle.tasks.map((task) =>
            task.taskId === "status-composer"
              ? {
                  ...task,
                  status: "ready",
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.target,
                  })),
                }
              : task,
          ),
        },
      },
    };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });
    expect(state.run?.cycle?.focus).toBe(5);
    expect(state.run?.cycle?.hand.map((card) => card.instanceId)).toEqual([
      "merge-draw-1",
      "merge-draw-2",
    ]);
  });

  it("replaces every drawn Distraction with Noise-Cancelling Headphones", () => {
    let state = withTools(
      startCycleAt("cycle-2", ["paul", "odin", "madi"]),
      "noise-cancelling-headphones",
    );
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.hand).toHaveLength(5);
    expect(state.run?.cycle?.hand.some((card) => card.cardId === "distraction")).toBe(false);
  });

  it("supercharges every AI Assisted card and adds Debt with the enterprise licence", () => {
    let state = withTools(startCycle(["paul", "odin", "madi"]), "enterprise-ai-licence");
    state = playCard(state, "agent-swarm", "status-composer", "frontend");
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ unverified: 3 });
    expect(state.run).toMatchObject({ techDebt: 1 });
    expect(state.run?.cycle).toMatchObject({ techDebtAdded: 1 });
  });

  it("runs every Script twice with Cron Upgrade", () => {
    let state = withTools(startCycle(["paul", "odin", "madi"]), "cron-upgrade");
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task) => ({
            ...task,
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              scriptPower: requirement.discipline === "frontend" ? 1 : 0,
            })),
          })),
        },
      },
    };
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({ verified: 2 });
  });
});
