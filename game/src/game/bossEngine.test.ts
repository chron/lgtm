import { describe, expect, it } from "vitest";
import { bossDefinitions, selectBossDefinition, type BossDefinition } from "../domain/bosses";
import type { CycleState, RunState, TaskDefinition, TaskState } from "../domain/models";
import {
  createBossEncounter,
  drainBossEffectQueue,
  isBossLaunchReady,
  queueBossEffects,
  reconcileBossEncounter,
} from "./bossEngine";
import { gameReducer, initialGameState } from "./gameReducer";

const fixtureProject: TaskDefinition = {
  id: "fixture-project",
  name: "Ship the Fixture",
  role: "primary",
  requirements: [{ discipline: "backend", target: 10 }],
  intents: [],
};

const fixtureApproval: TaskDefinition = {
  id: "fixture-approval",
  name: "Approve the Fixture",
  requirements: [{ discipline: "frontend", target: 2 }],
  intents: [],
};

const fixtureBoss: BossDefinition = {
  id: "fixture-boss",
  stakeholder: "Fixture",
  title: "The Test Double",
  projectTitle: "Ship the Fixture",
  warning: "Expect assertions.",
  portrait: "/fixture.webp",
  eligibility: () => true,
  project: { id: "fixture-cycle", name: "Ship the Fixture", maxDays: 8, tasks: [fixtureProject] },
  achievement: { name: "Fixture Shipped", rules: "Ship the fixture." },
  retroLines: {
    victory: "fixture accepted",
    knownIssues: "fixture accepted with comments",
    defeat: "fixture rejected",
  },
  phases: [
    {
      id: "build",
      title: "Build",
      summary: "Build it.",
      reactionArt: "/fixture.webp",
      onEnter: [],
      exitTrigger: { kind: "project-progress", ratio: 0.5 },
    },
    {
      id: "stakeholder-review",
      title: "Stakeholder Review",
      summary: "Approve it.",
      reactionArt: "/fixture.webp",
      onEnter: [{ kind: "spawn-task", task: fixtureApproval, requiredForLaunch: true }],
      exitTrigger: { kind: "launch-ready" },
    },
    {
      id: "launch-window",
      title: "Launch Window",
      summary: "Launch it.",
      reactionArt: "/fixture.webp",
      onEnter: [],
    },
  ],
};

function taskState(definition: TaskDefinition): TaskState {
  return {
    taskId: definition.id,
    name: definition.name,
    role: definition.role,
    status: "open",
    stunned: false,
    spawnedDay: 1,
    requirements: definition.requirements.map((requirement) => ({
      ...requirement,
      verified: 0,
      unverified: 0,
      scriptPower: 0,
      scriptBlock: 0,
    })),
  };
}

function fixtureRun(): { run: RunState; cycle: CycleState } {
  const started = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
  if (!started.run) throw new Error("Expected run");
  const cycle: CycleState = {
    nodeId: "fixture-node",
    cycleId: fixtureBoss.project.id,
    startingMorale: started.run.morale,
    day: 1,
    focus: 3,
    block: 0,
    tasks: [taskState(fixtureProject)],
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    blockedDisciplines: [],
    triggeredPassiveIds: [],
    resolvedIntents: [],
    temporaryCardCounter: 0,
    sideQuestCounter: 0,
    cardsPlayedThisDay: 0,
    cardsPlayedThisCycle: 0,
    generatedCardsPlayedThisDay: 0,
    generatedCardsPlayedThisCycle: 0,
    cardsExhaustedThisDay: 0,
    cardsExhaustedThisCycle: 0,
    chain: { count: 0, transfersBetweenTasks: false },
    peakChain: 0,
    prototypePower: 0,
    fullStackPower: 0,
    cardTagWorkBonuses: {},
    dayWorkBonuses: [],
    reviewStunFocusBonus: 0,
    polishBudgetPower: 0,
    queuedDistractions: 0,
    queuedCardsDrawn: 0,
    intentProtections: {},
    defects: 0,
    techDebtAdded: 0,
    boss: createBossEncounter(fixtureBoss),
  };
  return {
    run: { ...started.run, selectedBossId: fixtureBoss.id, cycle },
    cycle,
  };
}

describe("Final Release boss engine", () => {
  it("selects one eligible boss deterministically without consuming run randomness", () => {
    for (const seed of [1, 2, 3, 42, 0x5eed1234]) {
      expect(selectBossDefinition(seed).id).toBe(selectBossDefinition(seed).id);
    }
    expect(new Set(Array.from({ length: 20 }, (_, seed) => selectBossDefinition(seed).id))).toEqual(
      new Set(bossDefinitions.map((boss) => boss.id)),
    );

    const started = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
    expect(started.run?.rngState).toBe(42);
    expect(started.run?.history[0]).toEqual({
      kind: "boss-selected",
      bossId: started.run?.selectedBossId,
    });
  });

  it("runs a fixture definition through every phase with no reducer boss branch", () => {
    let { run, cycle } = fixtureRun();
    cycle = {
      ...cycle,
      tasks: [
        {
          ...cycle.tasks[0]!,
          requirements: [{ ...cycle.tasks[0]!.requirements[0]!, verified: 5 }],
        },
      ],
    };
    run = { ...run, cycle };

    ({ run, cycle } = reconcileBossEncounter(run, cycle, fixtureBoss));
    expect(cycle.boss).toMatchObject({
      bossId: "fixture-boss",
      phase: "stakeholder-review",
      requiredSpawnedTaskIds: ["fixture-approval"],
    });
    expect(cycle.tasks.map((task) => task.taskId)).toEqual(["fixture-project", "fixture-approval"]);
    expect(run.history.map((event) => event.kind)).toContain("boss-phase-changed");

    cycle = {
      ...cycle,
      boss: { ...cycle.boss!, transitionNotice: undefined },
      tasks: cycle.tasks.map((task) =>
        task.taskId === "fixture-project"
          ? {
              ...task,
              status: "ready",
              requirements: [{ ...task.requirements[0]!, verified: 10 }],
            }
          : { ...task, status: "ready" },
      ),
    };
    run = { ...run, cycle };
    expect(isBossLaunchReady(cycle, fixtureBoss)).toBe(false);
    expect(reconcileBossEncounter(run, cycle, fixtureBoss).cycle.boss?.phase).toBe(
      "stakeholder-review",
    );

    cycle = {
      ...cycle,
      tasks: cycle.tasks.map((task) =>
        task.taskId === "fixture-approval" ? { ...task, status: "shipped" } : task,
      ),
    };
    run = { ...run, cycle };
    ({ run, cycle } = reconcileBossEncounter(run, cycle, fixtureBoss));
    expect(cycle.boss?.phase).toBe("launch-window");
    expect(cycle.boss?.transitionNotice?.title).toBe("Launch Window");
  });

  it("drains typed Work, Scope, Regression, Crunch, and spawn effects in order", () => {
    let { run, cycle } = fixtureRun();
    cycle = {
      ...cycle,
      block: 1,
      boss: queueBossEffects(cycle.boss!, [
        {
          kind: "scope",
          target: { kind: "task", taskId: "fixture-project", discipline: "backend" },
          amount: 3,
        },
        {
          kind: "work",
          target: { kind: "open-requirement", order: "most-remaining" },
          amount: 4,
          workKind: "unverified",
        },
        {
          kind: "regression",
          target: { kind: "all-open-tasks", discipline: "backend" },
          amount: 2,
        },
        { kind: "crunch", moraleLoss: 3 },
      ]),
    };
    run = { ...run, cycle };

    const resolved = drainBossEffectQueue(run, cycle);
    expect(resolved.cycle.tasks[0]?.requirements[0]).toMatchObject({
      target: 13,
      verified: 0,
      unverified: 2,
    });
    expect(resolved.run.morale).toBe(8);
    expect(resolved.cycle.block).toBe(0);
    expect(resolved.cycle.boss?.effectQueue).toEqual([]);
    expect(resolved.resolutions).toHaveLength(4);
  });
});
