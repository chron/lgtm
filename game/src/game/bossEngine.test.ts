import { describe, expect, it } from "vitest";
import {
  bossDefinitions,
  getBossDefinition,
  getScheduledBossIntent,
  getScheduledBossMoraleLoss,
  selectBossDefinition,
  type BossDefinition,
} from "../domain/bosses";
import type { CycleState, RunState, TaskDefinition, TaskState } from "../domain/models";
import { buildRetroBoard } from "../domain/retro";
import {
  acknowledgeBossTransition,
  createBossEncounter,
  drainBossEffectQueue,
  getBossIntentPreview,
  isBossLaunchReady,
  queueBossEffects,
  reconcileBossEncounter,
  resolveBossDayIntent,
} from "./bossEngine";
import { gameReducer, initialGameState } from "./gameReducer";
import { incomingMorale, refreshTaskStatus, requirementProgress, resolveCardTarget } from "./rules";

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
      cadence: [],
      exitTrigger: { kind: "project-progress", ratio: 0.5 },
    },
    {
      id: "stakeholder-review",
      title: "Stakeholder Review",
      summary: "Approve it.",
      reactionArt: "/fixture.webp",
      onEnter: [{ kind: "spawn-task", task: fixtureApproval, requiredForLaunch: true }],
      cadence: [],
      exitTrigger: { kind: "launch-ready" },
    },
    {
      id: "launch-window",
      title: "Launch Window",
      summary: "Launch it.",
      reactionArt: "/fixture.webp",
      onEnter: [],
      cadence: [],
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

function bossRun(boss: BossDefinition, morale = 10): { run: RunState; cycle: CycleState } {
  const started = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
  if (!started.run) throw new Error("Expected run");
  const cycle: CycleState = {
    ...fixtureRun().cycle,
    nodeId: "final-release",
    cycleId: boss.project.id,
    startingMorale: morale,
    tasks: boss.project.tasks.filter((task) => task.role !== "complication").map(taskState),
    boss: createBossEncounter(boss),
  };
  return {
    run: {
      ...started.run,
      morale,
      maxMorale: morale,
      selectedBossId: boss.id,
      cycle,
    },
    cycle,
  };
}

function setRequirementWork(
  cycle: CycleState,
  taskId: string,
  discipline: "frontend" | "backend" | "infra",
  verified: number,
  unverified = 0,
): CycleState {
  return {
    ...cycle,
    tasks: cycle.tasks.map((task) =>
      task.taskId !== taskId
        ? task
        : refreshTaskStatus({
            ...task,
            requirements: task.requirements.map((requirement) =>
              requirement.discipline === discipline
                ? { ...requirement, verified, unverified }
                : requirement,
            ),
          }),
    ),
  };
}

function addVerifiedWork(cycle: CycleState, amount: number): CycleState {
  let remaining = amount;
  const tasks = cycle.tasks.map((task) => ({
    ...task,
    requirements: task.requirements.map((requirement) => ({ ...requirement })),
  }));
  const orderedTasks = [
    ...tasks.filter((task) => task.role === "complication" && task.status !== "shipped"),
    ...tasks.filter((task) => task.role !== "complication" && task.status !== "shipped"),
  ];
  for (const task of orderedTasks) {
    for (const requirement of task.requirements) {
      const capacity = Math.max(0, requirement.target - requirementProgress(requirement));
      const added = Math.min(remaining, capacity);
      requirement.verified += added;
      remaining -= added;
      if (remaining === 0) break;
    }
    if (remaining === 0) break;
  }
  return { ...cycle, tasks: tasks.map(refreshTaskStatus) };
}

function reviewWork(cycle: CycleState, amount: number): CycleState {
  let remaining = amount;
  return {
    ...cycle,
    tasks: cycle.tasks.map((task) =>
      refreshTaskStatus({
        ...task,
        requirements: task.requirements.map((requirement) => {
          const reviewed = Math.min(remaining, requirement.unverified);
          remaining -= reviewed;
          return {
            ...requirement,
            unverified: requirement.unverified - reviewed,
            verified: requirement.verified + reviewed,
          };
        }),
      }),
    ),
  };
}

function shipReadyComplications(cycle: CycleState): CycleState {
  return {
    ...cycle,
    tasks: cycle.tasks.map((task) =>
      task.role === "complication" && task.status === "ready"
        ? { ...task, status: "shipped" }
        : task,
    ),
  };
}

function acknowledgeIfNeeded(
  run: RunState,
  cycle: CycleState,
): { run: RunState; cycle: CycleState } {
  return cycle.boss?.transitionNotice ? acknowledgeBossTransition(run, cycle) : { run, cycle };
}

function runCoherentScenario(boss: BossDefinition): { run: RunState; cycle: CycleState } {
  let { run, cycle } = bossRun(boss, 18);
  for (let day = 1; day <= boss.project.maxDays; day += 1) {
    cycle = reviewWork(addVerifiedWork(cycle, 10), 5);
    cycle = shipReadyComplications(cycle);
    run = { ...run, cycle };
    ({ run, cycle } = reconcileBossEncounter(run, cycle, boss));
    ({ run, cycle } = acknowledgeIfNeeded(run, cycle));
    cycle = shipReadyComplications(cycle);
    run = { ...run, cycle };
    ({ run, cycle } = reconcileBossEncounter(run, cycle, boss));
    ({ run, cycle } = acknowledgeIfNeeded(run, cycle));
    if (cycle.boss?.phase === "launch-window" && isBossLaunchReady(cycle, boss)) {
      return { run, cycle };
    }

    cycle = { ...cycle, block: 5 };
    run = { ...run, cycle };
    ({ run, cycle } = resolveBossDayIntent(run, cycle, boss));
    if (run.morale <= 0) return { run, cycle };
    cycle = {
      ...cycle,
      day: cycle.day + 1,
      block: 0,
      tasks: cycle.tasks.map((task) => ({ ...task, stunned: false })),
    };
    run = { ...run, cycle };
  }
  return { run, cycle };
}

function runUnfocusedScenario(boss: BossDefinition): { run: RunState; cycle: CycleState } {
  let { run, cycle } = bossRun(boss);
  for (let day = 1; day <= boss.project.maxDays && run.morale > 0; day += 1) {
    ({ run, cycle } = resolveBossDayIntent(run, cycle, boss));
    cycle = { ...cycle, day: cycle.day + 1 };
    run = { ...run, cycle };
  }
  return { run, cycle };
}

describe("Final Release boss engine", () => {
  it.each(bossDefinitions)(
    "authors $stakeholder as a complete three-phase catalogue entry",
    (boss) => {
      expect(boss.project.maxDays).toBe(9);
      expect(boss.project.tasks[0]?.name).toBe(boss.projectTitle);
      expect(boss.warning.length).toBeGreaterThan(20);
      expect(boss.phases.map((phase) => phase.id)).toEqual([
        "build",
        "stakeholder-review",
        "launch-window",
      ]);
      expect(boss.phases.every((phase) => phase.reactionArt.includes("bosses"))).toBe(true);
      expect(boss.phases.every((phase) => phase.cadence.length > 0)).toBe(true);
    },
  );

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
    expect(resolved.run.morale).toBe(10);
    expect(resolved.cycle.block).toBe(0);
    expect(resolved.cycle.boss?.effectQueue).toEqual([]);
    expect(resolved.resolutions).toHaveLength(4);
  });

  it("authors Mateja's helpful Work as a visible, optional Stun target", () => {
    const boss = getBossDefinition("mateja-weekend-pivot");
    let { run, cycle } = bossRun(boss);
    expect(getBossIntentPreview(run, cycle, boss)).toMatchObject({
      label: "I Built This Bit",
      sourceTaskId: "final-release",
      stunned: false,
      moraleLoss: 0,
    });
    expect(getScheduledBossIntent(run, cycle, boss)?.intentKind).toBe("ai-assist");

    const stunCard = { cardId: "feature-flag", instanceId: "boss-stun" };
    cycle = { ...cycle, focus: 3, hand: [...cycle.hand, stunCard] };
    run = { ...run, cycle };
    expect(resolveCardTarget(run, stunCard, { taskId: "final-release" })).toMatchObject({
      legal: true,
      kind: "tactic",
      stun: true,
    });
    let stunnedState = gameReducer(
      { screen: { name: "cycle", nodeId: cycle.nodeId, cycleId: cycle.cycleId }, run },
      {
        type: "PLAY_CARD",
        instanceId: stunCard.instanceId,
        target: { taskId: "final-release" },
      },
    );
    expect(stunnedState.run?.cycle?.tasks[0]?.stunned).toBe(true);
    stunnedState = gameReducer(stunnedState, { type: "END_DAY" });
    expect(
      stunnedState.run?.cycle?.tasks[0]?.requirements.every(
        (requirement) => requirement.unverified === 0,
      ),
    ).toBe(true);
    expect(stunnedState.run?.cycle?.resolvedIntents).toContain("Stunned · I Built This Bit");

    ({ run, cycle } = resolveBossDayIntent(run, cycle, boss));
    expect(cycle.tasks[0]?.requirements).toEqual([
      expect.objectContaining({ discipline: "frontend", unverified: 6 }),
      expect.objectContaining({ discipline: "backend", unverified: 0 }),
      expect.objectContaining({ discipline: "infra", unverified: 0 }),
    ]);
    expect(run.history.at(-1)).toMatchObject({
      kind: "boss-effect-resolved",
      label: expect.stringContaining("I Built This Bit"),
    });

    ({ run, cycle } = bossRun(boss));
    cycle = {
      ...cycle,
      tasks: cycle.tasks.map((task) => ({ ...task, stunned: true })),
    };
    run = { ...run, cycle };
    ({ run, cycle } = resolveBossDayIntent(run, cycle, boss));
    expect(cycle.tasks[0]?.requirements.every((requirement) => requirement.unverified === 0)).toBe(
      true,
    );
    expect(cycle.resolvedIntents).toContain("Stunned · I Built This Bit");
  });

  it("spawns Mateja's required Platform Task at Stakeholder Review", () => {
    const boss = getBossDefinition("mateja-weekend-pivot");
    let { run, cycle } = bossRun(boss);
    cycle = setRequirementWork(cycle, "final-release", "frontend", 10);
    cycle = setRequirementWork(cycle, "final-release", "backend", 5);
    run = { ...run, cycle };
    ({ run, cycle } = reconcileBossEncounter(run, cycle, boss));

    expect(cycle.boss).toMatchObject({
      phase: "stakeholder-review",
      requiredSpawnedTaskIds: ["make-it-a-platform"],
    });
    expect(cycle.tasks.find((task) => task.taskId === "make-it-a-platform")).toMatchObject({
      role: "complication",
      status: "open",
    });
    expect(cycle.boss?.transitionNotice).toMatchObject({
      title: "Actually, It's a Platform",
      resolvedEffects: ["Required Task · Make It a Platform"],
    });
  });

  it("authors Tristan's fallback Scope, two Validation Tasks, and Confidence Gate", () => {
    const boss = getBossDefinition("tristan-significance-test");
    let { run, cycle } = bossRun(boss);
    ({ run, cycle } = resolveBossDayIntent(run, cycle, boss));
    expect(
      cycle.tasks[0]?.requirements.find((requirement) => requirement.discipline === "backend"),
    ).toMatchObject({ target: 14 });

    cycle = setRequirementWork(cycle, "final-release", "frontend", 10);
    cycle = setRequirementWork(cycle, "final-release", "backend", 6);
    run = { ...run, cycle };
    ({ run, cycle } = reconcileBossEncounter(run, cycle, boss));
    expect(cycle.boss?.requiredSpawnedTaskIds).toEqual(["check-false-positives"]);
    ({ run, cycle } = acknowledgeIfNeeded(run, cycle));

    cycle = setRequirementWork(cycle, "final-release", "backend", 14);
    cycle = setRequirementWork(cycle, "final-release", "infra", 1);
    run = { ...run, cycle };
    ({ run, cycle } = reconcileBossEncounter(run, cycle, boss));
    expect(cycle.boss?.requiredSpawnedTaskIds).toEqual([
      "check-false-positives",
      "segment-breakdown",
    ]);
    expect(cycle.tasks.map((task) => task.taskId)).toContain("segment-breakdown");

    cycle = setRequirementWork(cycle, "final-release", "frontend", 10);
    cycle = setRequirementWork(cycle, "final-release", "backend", 14);
    cycle = setRequirementWork(cycle, "final-release", "infra", 10);
    cycle = {
      ...cycle,
      tasks: cycle.tasks.map((task) =>
        task.taskId === "check-false-positives"
          ? { ...task, status: "shipped" }
          : task.taskId === "segment-breakdown"
            ? { ...task, status: "ready" }
            : task,
      ),
    };
    expect(isBossLaunchReady(cycle, boss)).toBe(false);
    cycle = {
      ...cycle,
      tasks: cycle.tasks.map((task) =>
        task.taskId === "segment-breakdown" ? { ...task, status: "shipped" } : task,
      ),
    };
    expect(isBossLaunchReady(cycle, boss)).toBe(true);
  });

  it("scales Tristan's Readout Crunch only with unfinished Validation Tasks", () => {
    const boss = getBossDefinition("tristan-significance-test");
    let { run, cycle } = bossRun(boss, 20);
    cycle = {
      ...cycle,
      day: 3,
      boss: { ...cycle.boss!, phase: "stakeholder-review" },
      tasks: [
        ...cycle.tasks,
        taskState(boss.project.tasks.find((task) => task.id === "check-false-positives")!),
        taskState(boss.project.tasks.find((task) => task.id === "segment-breakdown")!),
      ],
    };
    run = {
      ...run,
      cycle,
      history: [
        ...run.history,
        {
          kind: "boss-phase-changed",
          bossId: boss.id,
          from: "build",
          to: "stakeholder-review",
          day: 1,
        },
      ],
    };
    expect(getBossIntentPreview(run, cycle, boss)?.moraleLoss).toBe(8);
    expect(getScheduledBossMoraleLoss(run, cycle, boss)).toBe(8);
    expect(incomingMorale(run, cycle)).toBe(8);
    cycle = {
      ...cycle,
      tasks: cycle.tasks.map((task) =>
        task.taskId === "check-false-positives" ? { ...task, status: "shipped" } : task,
      ),
    };
    run = { ...run, cycle };
    expect(getBossIntentPreview(run, cycle, boss)?.moraleLoss).toBe(6);
    expect(getScheduledBossMoraleLoss(run, cycle, boss)).toBe(6);
    cycle = {
      ...cycle,
      tasks: cycle.tasks.map((task) =>
        task.taskId === "final-release" ? { ...task, stunned: true } : task,
      ),
    };
    run = { ...run, cycle };
    expect(getScheduledBossMoraleLoss(run, cycle, boss)).toBe(0);
  });

  it("lets launch-window Scope and Regression reopen completed requirements", () => {
    const boss = getBossDefinition("mateja-weekend-pivot");
    let { run, cycle } = bossRun(boss);
    cycle = {
      ...cycle,
      boss: { ...cycle.boss!, phase: "launch-window" },
      tasks: cycle.tasks.map((task) => ({
        ...task,
        status: "ready",
        requirements: task.requirements.map((requirement) => ({
          ...requirement,
          verified: requirement.target,
        })),
      })),
    };
    const originalTarget = cycle.tasks[0]!.requirements.reduce(
      (total, requirement) => total + requirement.target,
      0,
    );
    cycle = {
      ...cycle,
      boss: queueBossEffects(cycle.boss!, [
        {
          kind: "scope",
          target: { kind: "open-requirement", order: "least-remaining" },
          amount: 4,
        },
      ]),
    };
    run = { ...run, cycle };
    ({ run, cycle } = drainBossEffectQueue(run, cycle));
    expect(cycle.tasks[0]?.status).toBe("open");
    expect(
      cycle.tasks[0]!.requirements.reduce((total, requirement) => total + requirement.target, 0),
    ).toBe(originalTarget + 4);

    cycle = {
      ...cycle,
      tasks: cycle.tasks.map((task) => ({
        ...task,
        status: "ready",
        requirements: task.requirements.map((requirement) => ({
          ...requirement,
          verified: requirement.target,
        })),
      })),
      boss: queueBossEffects(cycle.boss!, [
        {
          kind: "regression",
          target: { kind: "open-requirement", order: "most-progress" },
          amount: 5,
        },
      ]),
    };
    run = { ...run, cycle };
    ({ cycle } = drainBossEffectQueue(run, cycle));
    expect(cycle.tasks[0]?.status).toBe("open");
    expect(
      cycle.tasks[0]!.requirements.some(
        (requirement) => requirementProgress(requirement) < requirement.target,
      ),
    ).toBe(true);
  });

  it.each(bossDefinitions)("uses all three $stakeholder Retro outcomes", (boss) => {
    const clean = bossRun(boss).run;
    const launched = {
      ...clean,
      history: [
        ...clean.history,
        {
          kind: "final-release-launched" as const,
          bossId: boss.id,
          day: 8,
          unverifiedWork: 0,
          defects: 0,
          moraleLoss: 0,
          outcome: "clean" as const,
        },
      ],
    };
    const knownIssues = {
      ...launched,
      history: launched.history.map((event) =>
        event.kind === "final-release-launched"
          ? { ...event, defects: 1, unverifiedWork: 1, outcome: "known-issues" as const }
          : event,
      ),
    };
    expect(buildRetroBoard(launched, "victory").bossNote).toBe(boss.retroLines.victory);
    expect(buildRetroBoard(knownIssues, "victory").bossNote).toBe(boss.retroLines.knownIssues);
    expect(buildRetroBoard(clean, "defeat", "final-release").bossNote).toBe(boss.retroLines.defeat);
  });

  it.each(bossDefinitions)(
    "$stakeholder rewards a coherent mixed plan and punishes doing nothing",
    (boss) => {
      const coherent = runCoherentScenario(boss);
      expect(coherent.run.morale).toBeGreaterThan(0);
      expect(coherent.cycle.boss?.phase).toBe("launch-window");
      expect(isBossLaunchReady(coherent.cycle, boss)).toBe(true);
      expect(coherent.cycle.day).toBeLessThanOrEqual(boss.project.maxDays);

      const unfocused = runUnfocusedScenario(boss);
      expect(unfocused.run.morale).toBeLessThanOrEqual(0);
      expect(isBossLaunchReady(unfocused.cycle, boss)).toBe(false);
    },
  );
});
