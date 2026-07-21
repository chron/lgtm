import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getBossDefinition } from "../domain/bosses";
import type { CycleState, RunState, TaskState } from "../domain/models";
import { createBossEncounter } from "../game/bossEngine";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { BossIntentPanel } from "./BossIntentPanel";

function taskState(bossId: string): TaskState {
  const boss = getBossDefinition(bossId);
  const task = boss.project.tasks.find((candidate) => candidate.role !== "complication")!;
  return {
    taskId: task.id,
    name: task.name,
    role: task.role,
    status: "open",
    stunned: false,
    spawnedDay: 1,
    requirements: task.requirements.map((requirement) => ({
      ...requirement,
      verified: 0,
      unverified: 0,
      scriptPower: 0,
    })),
  };
}

function fixture(bossId: string): { run: RunState; cycle: CycleState } {
  const boss = getBossDefinition(bossId);
  const cycle: CycleState = {
    nodeId: "final-release",
    cycleId: boss.id,
    startingMorale: 10,
    day: 1,
    focus: 3,
    block: 0,
    guardPower: 0,
    tasks: [taskState(bossId)],
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
    boss: createBossEncounter(boss),
  };
  const baseRun = gameReducer(initialGameState, { type: "START_RUN", seed: 42 }).run;
  if (!baseRun) throw new Error("Initial run fixture missing");
  return {
    cycle,
    run: { ...baseRun, selectedBossId: bossId, cycle },
  };
}

describe("BossIntentPanel", () => {
  it("shows Mateja's helpful intent and its mechanical explanation", () => {
    const { run, cycle } = fixture("mateja-weekend-pivot");
    const markup = renderToStaticMarkup(<BossIntentPanel run={run} cycle={cycle} />);
    expect(markup).toContain("Mateja · Build");
    expect(markup).toContain("I Built This Bit");
    expect(markup).toContain("Unverified AI Assisted Work");
  });

  it("makes a cancelled boss intent unmistakable", () => {
    const { run, cycle } = fixture("tristan-significance-test");
    const stunnedCycle = {
      ...cycle,
      tasks: cycle.tasks.map((task) => ({ ...task, stunned: true })),
    };
    const markup = renderToStaticMarkup(<BossIntentPanel run={run} cycle={stunnedCycle} />);
    expect(markup).toContain("Cancelled Today · Need More Data");
    expect(markup).toContain("Cancelled");
  });
});
