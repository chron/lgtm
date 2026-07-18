import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, formatIntent, getCard, getCycle, tools } from "../domain/content";
import type { DeveloperId, Discipline, ToolId } from "../domain/models";
import { gameReducer, initialGameState } from "./gameReducer";
import type { GameState } from "./gameReducer";

function startCycle(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["paul", "irene", "madi"],
  seed = 0x5eed1234,
  nodeId: "cycle-1" | "cycle-2" | "cycle-3" | "final-release" = "cycle-1",
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
  return gameReducer(state, { type: "VISIT_NODE", nodeId });
}

function shipReadyCycle(seed = 0x5eed1234): GameState {
  let state = startCycle(["paul", "irene", "madi"], seed);
  state = playCard(state, "frontend-3", "status-composer", "frontend");
  state = playCard(state, "frontend-3", "status-composer", "frontend");
  state = playCard(state, "agent-swarm", "status-composer", "backend");
  return gameReducer(state, { type: "SHIP_TASK", taskId: "status-composer" });
}

function startCycleAt(
  nodeId: "cycle-1" | "cycle-2" | "cycle-3" | "final-release",
  squad: readonly [DeveloperId, DeveloperId, DeveloperId] = ["paul", "irene", "madi"],
  seed = 0x5eed1234,
): GameState {
  return startCycle(squad, seed, nodeId);
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

function startMap(completedNodeIds: readonly string[] = []): GameState {
  const state = gameReducer(initialGameState, { type: "START_RUN" });
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
      .filter((intent) => intent.kind === "scope");
    expect(scopeIntents.length).toBeGreaterThan(0);
    expect(scopeIntents.every((intent) => intent.amount >= 3)).toBe(true);
    expect(formatIntent({ kind: "interruption" })).toBe("+1 Distraction");
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
      defects: 1,
      moraleDelta: -1,
      creditsGained: 40,
      techDebtAdded: 2,
    });
    expect(state.run?.morale).toBe(9);
    expect(state.run?.techDebt).toBe(2);
    expect(state.run?.credits).toBe(80);
    expect(state.run?.completedNodeIds).toContain("cycle-1");
    expect(state.run?.history.at(-1)).toMatchObject({
      kind: "cycle-finished",
      nodeId: "cycle-1",
      outcome: "shipped",
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
    expect(state.run?.morale).toBe(9);
    expect(state.run?.cycle?.defects).toBe(1);
    expect(state.run?.cycle?.tasks.map((task) => task.status)).toEqual(["shipped", "open"]);
    expect(state.run?.history.at(-1)).toEqual({
      kind: "task-shipped",
      nodeId: "cycle-2",
      taskId: "status-composer",
      defects: 1,
      moraleLoss: 1,
      techDebtAdded: 2,
      focusGained: 1,
    });
    expect(state.run?.techDebt).toBe(2);
    expect(state.run?.cycle?.focus).toBe(1);

    const beforeIllegalPlay = state;
    state = playCard(state, "vibe-code", "status-composer", "frontend");
    expect(state).toBe(beforeIllegalPlay);
  });

  it("keeps a Ready Task reviewable before it ships", () => {
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
      task?.requirements.find((requirement) => requirement.discipline === "backend"),
    ).toMatchObject({ verified: 3, unverified: 0 });
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
                  ? requirement.target - 3
                  : 0,
            })),
          })),
        },
      },
    };
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const startingDrawPile = state.run.cycle.drawPile.length;

    state = playCard(state, "frontend-3", "status-composer", "frontend");
    state = playCard(state, "infra-3", "reconnect-logic", "infra");

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
    expect(state.run?.morale).toBe(0);
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
    state = gameReducer(state, { type: "CHOOSE_EVENT", choice: "push-back" });

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

  it("makes the Scope Creep event choices mechanically distinct", () => {
    let pushBack = startMap(["cycle-1"]);
    if (!pushBack.run) throw new Error("Expected a run");
    pushBack = { ...pushBack, run: { ...pushBack.run, morale: 7 } };
    pushBack = gameReducer(pushBack, { type: "VISIT_NODE", nodeId: "event-1" });
    pushBack = gameReducer(pushBack, { type: "CHOOSE_EVENT", choice: "push-back" });
    expect(pushBack.run).toMatchObject({ morale: 9, credits: 40 });
    expect(pushBack.run?.completedNodeIds).toContain("event-1");

    let cappedMorale = startMap(["cycle-1"]);
    if (!cappedMorale.run) throw new Error("Expected a run");
    cappedMorale = { ...cappedMorale, run: { ...cappedMorale.run, morale: 9 } };
    cappedMorale = gameReducer(cappedMorale, { type: "VISIT_NODE", nodeId: "event-1" });
    cappedMorale = gameReducer(cappedMorale, {
      type: "CHOOSE_EVENT",
      choice: "push-back",
    });
    expect(cappedMorale.run?.morale).toBe(10);

    let sureEasy = startMap(["cycle-1"]);
    sureEasy = gameReducer(sureEasy, { type: "VISIT_NODE", nodeId: "event-1" });
    sureEasy = gameReducer(sureEasy, { type: "CHOOSE_EVENT", choice: "sure-easy" });
    expect(sureEasy.run).toMatchObject({ morale: 10, credits: 75 });
    expect(sureEasy.run?.techDebt).toBe(3);
    expect(sureEasy.run?.deck.at(-1)?.cardId).toBe("tech-debt");
    expect(sureEasy.run?.completedNodeIds).toContain("event-1");

    sureEasy = gameReducer(sureEasy, { type: "VISIT_NODE", nodeId: "cycle-2" });
    expect(sureEasy.run?.techDebt).toBe(3);
    expect(sureEasy.run?.deck.at(-1)?.cardId).toBe("tech-debt");
  });

  it("authors eight unrestricted build-shaping Tools", () => {
    expect(tools).toHaveLength(8);
    expect(tools.map((tool) => tool.id)).toEqual([
      "pairing-session",
      "ci-runner",
      "test-suite",
      "error-budget",
      "merge-queue",
      "noise-cancelling-headphones",
      "enterprise-ai-licence",
      "cron-upgrade",
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
