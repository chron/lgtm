import { describe, expect, it } from "vitest";
import { createPlaytestReport, formatPlaytestReport } from "./report";
import {
  mixedPlaytestScenarios,
  playtestScenarios,
  runPlaytestBatch,
  simulatePlaytestRun,
} from "./simulator";

describe("scripted playtest harness", () => {
  it("includes the three real squads as first-class calibration scenarios", () => {
    expect(playtestScenarios.slice(0, 3).map((scenario) => scenario.id)).toEqual([
      "research-squad",
      "platform-squad",
      "panel-squad",
    ]);
  });

  it("balances the mixed matrix evenly across the complete roster", () => {
    const appearances = new Map<string, number>();
    const combinations = new Set<string>();
    for (const scenario of mixedPlaytestScenarios) {
      const combination = [...scenario.squad].sort().join("/");
      combinations.add(combination);
      for (const developerId of scenario.squad) {
        appearances.set(developerId, (appearances.get(developerId) ?? 0) + 1);
      }
    }

    expect(mixedPlaytestScenarios).toHaveLength(12);
    expect(combinations.size).toBe(12);
    expect([...appearances.values()]).toHaveLength(12);
    expect([...appearances.values()].every((count) => count === 3)).toBe(true);
    expect(
      runPlaytestBatch({
        runsPerScenario: 1,
        seed: 77,
        scenarioIds: [mixedPlaytestScenarios[0]!.id],
        scenarios: mixedPlaytestScenarios,
      })[0]?.scenarioId,
    ).toBe(mixedPlaytestScenarios[0]!.id);
  });

  it("replays every build scenario deterministically through the real reducer", () => {
    const first = playtestScenarios.map((scenario, index) =>
      simulatePlaytestRun(scenario, 4_200 + index),
    );
    const replay = playtestScenarios.map((scenario, index) =>
      simulatePlaytestRun(scenario, 4_200 + index),
    );

    expect(replay).toEqual(first);
    expect(first.every((run) => run.outcome !== "stalled")).toBe(true);
    expect(first.every((run) => run.actions > 0 && run.encounters > 0)).toBe(true);
    expect(first.every((run) => run.loopGuardTrips === 0)).toBe(true);
  }, 15_000);

  it("lights up the distinguishing signal for each assembled engine", () => {
    const bySignal = new Map(
      playtestScenarios.map((scenario, index) => [
        scenario.expectedSignal,
        simulatePlaytestRun(scenario, 8_400 + index, "balanced", "showcase"),
      ]),
    );

    expect(bySignal.get("cards")!.maxCardsInDay).toBeGreaterThanOrEqual(5);
    expect(bySignal.get("automation")!.automationInstalled).toBeGreaterThan(0);
    expect(bySignal.get("completion")!.requirementsCompleted).toBeGreaterThan(0);
    expect(bySignal.get("block")!.blockPrevented).toBeGreaterThan(0);
    expect(bySignal.get("debt")!.maxTechDebt).toBeGreaterThan(0);
    expect(bySignal.get("chain")!.peakChain).toBeGreaterThanOrEqual(3);
  }, 15_000);

  it("renders a compact dashboard and retains raw run data", () => {
    const runs = [simulatePlaytestRun(playtestScenarios[0]!, 99)];
    const report = createPlaytestReport(runs, playtestScenarios, "2026-07-19T00:00:00.000Z");
    const output = formatPlaytestReport(report);

    expect(report.runs).toEqual(runs);
    expect(output).toContain("LGTM! // SCRIPTED PLAYTESTS");
    expect(output).toContain("Research Squad");
    expect(output).toContain("LAUNCH RATE");
    expect(output).toContain("REACH");
    expect(output).toContain("CLEAN");
    expect(output).toContain("FINAL RELEASE BOSSES");
    expect(output).toContain("SMOKE SIGNALS");
  });

  it("matches the launch shape of the three successful human calibration runs", () => {
    const calibrations = [
      ["research-squad", 1_631_439_361],
      ["platform-squad", 2_226_205_479],
      ["panel-squad", 3_674_038_866],
    ] as const;

    for (const [scenarioId, seed] of calibrations) {
      const scenario = playtestScenarios.find((candidate) => candidate.id === scenarioId)!;
      const run = simulatePlaytestRun(scenario, seed);
      expect(run.reachedFinalRelease).toBe(true);
      expect(run.launchedFinalRelease).toBe(true);
      expect(run.outcome === "victory" || run.cause === "technically-shipped").toBe(true);
    }
  });
});
