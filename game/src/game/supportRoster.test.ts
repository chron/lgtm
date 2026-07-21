import { describe, expect, it } from "vitest";
import { eligibleRewardCardIds, getCard } from "../domain/content";
import type { DeveloperId, Discipline, TaskState } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { useTestCycle } from "./testSupport";

function scenario(lead: DeveloperId, cycleId: string, ...cardIds: string[]): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0x5a77 });
  for (const developerId of [lead, "odin", "paul"] satisfies DeveloperId[]) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected run");
  state = { screen: { name: "map" }, run: { ...state.run, currentNodeId: null } };
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  state = useTestCycle(state, cycleId);
  if (!state.run?.cycle) throw new Error("Expected Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        focus: 30,
        hand: cardIds.map((cardId, index) => ({
          cardId,
          instanceId: `${lead}-${cardId}-${index}`,
        })),
        drawPile: ["frontend-3", "backend-3", "infra-3", "review-3"].map((cardId, index) => ({
          cardId,
          instanceId: `${lead}-draw-${index}`,
        })),
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

function setRequirement(
  state: GameState,
  taskIndex: number,
  requirementIndex: number,
  patch: Partial<TaskState["requirements"][number]>,
): GameState {
  if (!state.run?.cycle) throw new Error("Expected Cycle");
  return {
    ...state,
    run: {
      ...state.run,
      cycle: {
        ...state.run.cycle,
        tasks: state.run.cycle.tasks.map((task, index) =>
          index === taskIndex
            ? {
                ...task,
                requirements: task.requirements.map((requirement, requirementIndexAtTask) =>
                  requirementIndexAtTask === requirementIndex
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

describe("support roster integration", () => {
  it("registers all three developers, their rewards, and Steph's Macro", () => {
    expect(getCard("check-the-logs").ownerId).toBe("toby");
    expect(getCard("one-click-setup").ownerId).toBe("steph");
    expect(getCard("make-space").ownerId).toBe("elspeth");
    expect(getCard("macro").ownerId).toBe("steph");
    expect(eligibleRewardCardIds(["toby"])).toEqual(
      expect.arrayContaining([
        "on-call",
        "useful-alerting",
        "above-and-beyond",
        "keep-it-humming",
        "triage",
        "nothing-gets-past-me",
      ]),
    );
    expect(eligibleRewardCardIds(["steph"])).toContain("golden-path");
    expect(eligibleRewardCardIds(["elspeth"])).toContain("sustainable-pace");
  });

  it("runs Toby's Block, Guard, and non-Crunch Triage cards", () => {
    let state = scenario(
      "toby",
      "status-refresh",
      "useful-alerting",
      "keep-it-humming",
      "above-and-beyond",
      "triage",
    );
    const task = state.run!.cycle!.tasks[0]!;
    state = play(state, "useful-alerting", { kind: "squad" });
    expect(state.run?.cycle).toMatchObject({ block: 2, guardPower: 2 });

    state = play(state, "keep-it-humming", {
      taskId: task.taskId,
      discipline: task.requirements[1]!.discipline,
    });
    expect(state.run?.cycle?.block).toBe(4);
    state = play(state, "above-and-beyond", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(12);
    state = play(state, "triage", { taskId: task.taskId });
    expect(state.run?.cycle).toMatchObject({ block: 16 });
    expect(state.run?.cycle?.tasks[0]?.stunned).toBe(true);
  });

  it("plays Toby and Elspeth's defensive Starters at their full printed value", () => {
    let toby = scenario("toby", "participant-profiles", "check-the-logs");
    toby = play(toby, "check-the-logs", {
      taskId: toby.run!.cycle!.tasks[1]!.taskId,
      discipline: "infra",
    });
    expect(toby.run?.cycle?.tasks[1]?.requirements[1]?.verified).toBe(2);
    expect(toby.run?.cycle?.block).toBe(3);

    let elspeth = scenario("elspeth", "status-refresh", "make-space");
    elspeth = play(elspeth, "make-space", {
      taskId: elspeth.run!.cycle!.tasks[0]!.taskId,
      discipline: "backend",
    });
    expect(elspeth.run?.cycle?.tasks[0]?.requirements[1]?.verified).toBe(3);
    expect(elspeth.run?.cycle?.block).toBe(5);
  });

  it("does not let Triage cancel Crunch", () => {
    let state = scenario("toby", "status-refresh", "triage");
    state = { ...state, run: { ...state.run!, cycle: { ...state.run!.cycle!, day: 2 } } };
    const unchanged = play(state, "triage", { taskId: state.run!.cycle!.tasks[0]!.taskId });
    expect(unchanged).toEqual(state);
  });

  it("lets Toby convert prevented Crunch locally or across every open Task", () => {
    let state = scenario("toby", "status-refresh", "on-call", "nothing-gets-past-me");
    if (!state.run?.cycle) throw new Error("Expected Cycle");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          day: 2,
          tasks: [
            ...state.run.cycle.tasks,
            {
              taskId: "bonus-task",
              name: "Bonus Task",
              status: "open",
              stunned: false,
              spawnedDay: 1,
              requirements: [
                {
                  discipline: "infra",
                  target: 8,
                  verified: 0,
                  unverified: 0,
                  scriptPower: 0,
                },
              ],
            },
          ],
        },
      },
    };
    state = play(state, "on-call", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(2);
    state = play(state, "nothing-gets-past-me", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(8);
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.morale).toBe(12);
    expect(state.run?.cycle?.tasks[0]?.requirements[1]?.verified).toBe(2);
    expect(state.run?.cycle?.tasks[1]?.requirements[0]?.verified).toBe(2);
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("toby");
  });

  it("turns Steph's installation cards into uncapped Paved Road Focus", () => {
    let state = scenario(
      "steph",
      "status-refresh",
      "one-click-setup",
      "guardrails-not-gatekeepers",
      "automate-this-bit",
    );
    const requirement = state.run!.cycle!.tasks[0]!.requirements[0]!;
    const target = {
      taskId: state.run!.cycle!.tasks[0]!.taskId,
      discipline: requirement.discipline,
    };
    state = play(state, "one-click-setup", target);
    expect(state.run?.cycle?.focus).toBe(30);
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 1,
      scriptPower: 1,
    });
    state = play(state, "guardrails-not-gatekeepers", { kind: "squad" });
    expect(state.run?.cycle).toMatchObject({ focus: 30, block: 2, guardPower: 2 });
    state = play(state, "automate-this-bit", target);
    expect(state.run?.cycle?.focus).toBe(30);
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("steph");
  });

  it("runs tactic-installed Scripts through CI before each card's explicit trigger", () => {
    let setup = scenario("steph", "status-refresh", "one-click-setup");
    setup = { ...setup, run: { ...setup.run!, tools: ["ci-runner"] } };
    const task = setup.run!.cycle!.tasks[0]!;
    setup = play(setup, "one-click-setup", {
      taskId: task.taskId,
      discipline: task.requirements[0]!.discipline,
    });
    expect(setup.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 2,
      scriptPower: 1,
    });
    expect(setup.run?.history.at(-1)).toMatchObject({
      label: "Script +1 · CI +1 · Run +1",
    });

    let automate = scenario("steph", "status-refresh", "automate-this-bit");
    automate = { ...automate, run: { ...automate.run!, tools: ["ci-runner"] } };
    automate = play(automate, "automate-this-bit", {
      taskId: automate.run!.cycle!.tasks[0]!.taskId,
      discipline: automate.run!.cycle!.tasks[0]!.requirements[0]!.discipline,
    });
    expect(automate.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      verified: 2,
      scriptPower: 2,
    });
  });

  it("refactors, hot reloads, and executes generated Macros in meter order", () => {
    let state = scenario(
      "steph",
      "status-refresh",
      "refactor-the-workflow",
      "hot-reload",
      "make-it-a-command",
    );
    state = setRequirement(state, 0, 0, { target: 20, scriptPower: 2 });
    state = {
      ...state,
      run: {
        ...state.run!,
        cycle: { ...state.run!.cycle!, guardPower: 1 },
      },
    };
    const requirement = state.run!.cycle!.tasks[0]!.requirements[0]!;
    const target = {
      taskId: state.run!.cycle!.tasks[0]!.taskId,
      discipline: requirement.discipline,
    };
    state = play(state, "refactor-the-workflow", target);
    expect(state.run?.cycle?.tasks[0]?.requirements[0]).toMatchObject({
      scriptPower: 4,
    });
    expect(state.run?.cycle?.guardPower).toBe(2);
    expect(state.run?.cycle?.focus).toBe(31);
    state = play(state, "hot-reload", target);
    expect(state.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(8);
    expect(state.run?.cycle?.block).toBe(4);
    state = play(state, "make-it-a-command", { kind: "squad" });
    expect(state.run?.cycle?.hand.filter((card) => card.cardId === "macro")).toHaveLength(2);
    state = play(state, "macro", target);
    expect(state.run?.cycle?.tasks[0]?.requirements[0]?.verified).toBe(12);
    expect(state.run?.cycle?.block).toBe(6);
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toContain("macro");
  });

  it("installs Golden Path on every incomplete bar and refunds per bar", () => {
    let state = scenario("steph", "status-refresh", "golden-path");
    state = play(state, "golden-path", { kind: "squad" });
    expect(
      state.run?.cycle?.tasks[0]?.requirements.map((requirement) => requirement.scriptPower),
    ).toEqual([1, 1]);
    expect(state.run?.cycle?.focus).toBe(30);
    expect(state.run?.cycle?.exhaustPile[0]?.cardId).toBe("golden-path");
  });

  it("stacks Elspeth's Flexible Block and checks Room to Breathe after the passive", () => {
    let state = scenario("elspeth", "status-refresh", "psychological-safety", "room-to-breathe");
    state = { ...state, run: { ...state.run!, cycle: { ...state.run!.cycle!, day: 2 } } };
    state = play(state, "psychological-safety", { kind: "squad" });
    expect(state.run?.cycle?.psychologicalSafetyStacks).toBe(1);
    state = play(state, "room-to-breathe", {
      taskId: state.run!.cycle!.tasks[0]!.taskId,
      discipline: state.run!.cycle!.tasks[0]!.requirements[0]!.discipline,
    });
    expect(state.run?.cycle?.block).toBe(4);
    expect(state.run?.cycle?.hand).toHaveLength(2);
    expect(state.run?.cycle?.triggeredPassiveIds).toContain("elspeth");
  });

  it("resolves Elspeth's generated support, scaling Block, Guard, and rare reset", () => {
    let state = scenario(
      "elspeth",
      "participant-profiles",
      "check-in",
      "air-cover",
      "healthy-guardrails",
      "sustainable-pace",
    );
    state = play(state, "check-in", { kind: "squad" });
    expect(state.run?.cycle?.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["snippet", "checklist"]),
    );
    state = play(state, "air-cover", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(6);
    state = play(state, "healthy-guardrails", {
      taskId: state.run!.cycle!.tasks[0]!.taskId,
      discipline: state.run!.cycle!.tasks[0]!.requirements[0]!.discipline,
    });
    expect(state.run?.cycle?.block).toBe(10);
    expect(state.run?.cycle?.guardPower).toBe(2);
    state = play(state, "sustainable-pace", { kind: "squad" });
    expect(state.run?.cycle?.block).toBe(20);
    expect(state.run?.cycle?.focus).toBe(29);
    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["sustainable-pace"]),
    );
  });
});
