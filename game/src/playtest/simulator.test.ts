import { describe, expect, it } from "vitest";
import { createPlaytestReport, formatPlaytestReport } from "./report";
import { playtestScenarios, simulatePlaytestRun } from "./simulator";

describe("scripted playtest harness", () => {
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
  });

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
  });

  it("renders a compact dashboard and retains raw run data", () => {
    const runs = [simulatePlaytestRun(playtestScenarios[0]!, 99)];
    const report = createPlaytestReport(runs, playtestScenarios, "2026-07-19T00:00:00.000Z");
    const output = formatPlaytestReport(report);

    expect(report.runs).toEqual(runs);
    expect(output).toContain("LGTM! // SCRIPTED PLAYTESTS");
    expect(output).toContain("Card Storm");
    expect(output).toContain("FINAL RELEASE BOSSES");
    expect(output).toContain("SMOKE SIGNALS");
  });
});
