import type { PlaytestRunResult, PlaytestScenario } from "./simulator";

interface PlaytestScenarioSummary {
  scenarioId: string;
  scenarioName: string;
  runs: number;
  wins: number;
  winRate: number;
  stalled: number;
  averageEncounters: number;
  averageCyclesShipped: number;
  averageDays: number;
  averageEndingMorale: number;
  averageTechDebt: number;
  averageCardsPerDay: number;
  averagePeakChain: number;
  averageAutomation: number;
  averageBlockPrevented: number;
  averageDeadHands: number;
  averageDefects: number;
  loopGuardTrips: number;
}

export interface PlaytestBatchReport {
  schemaVersion: 1;
  generatedAt: string;
  totalRuns: number;
  summaries: PlaytestScenarioSummary[];
  bossWinRates: { bossId: string; runs: number; winRate: number }[];
  outcomeCounts: { outcome: string; runs: number }[];
  diagnostics: string[];
  runs: PlaytestRunResult[];
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, places = 1): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function summarizeGroup(runs: readonly PlaytestRunResult[]): PlaytestScenarioSummary {
  const wins = runs.filter((run) => run.outcome === "victory").length;
  const days = runs.map((run) => run.days);
  return {
    scenarioId: runs[0]?.scenarioId ?? "unknown",
    scenarioName: runs[0]?.scenarioName ?? "Unknown",
    runs: runs.length,
    wins,
    winRate: runs.length === 0 ? 0 : wins / runs.length,
    stalled: runs.filter((run) => run.outcome === "stalled" || run.outcome === "incomplete").length,
    averageEncounters: round(average(runs.map((run) => run.encounters))),
    averageCyclesShipped: round(average(runs.map((run) => run.cyclesShipped))),
    averageDays: round(average(days)),
    averageEndingMorale: round(average(runs.map((run) => run.endingMorale))),
    averageTechDebt: round(average(runs.map((run) => run.endingTechDebt))),
    averageCardsPerDay: round(
      average(runs.map((run) => (run.days === 0 ? 0 : run.cardsPlayed / run.days))),
    ),
    averagePeakChain: round(average(runs.map((run) => run.peakChain))),
    averageAutomation: round(average(runs.map((run) => run.automationInstalled))),
    averageBlockPrevented: round(average(runs.map((run) => run.blockPrevented))),
    averageDeadHands: round(average(runs.map((run) => run.deadHands))),
    averageDefects: round(average(runs.map((run) => run.defects))),
    loopGuardTrips: runs.reduce((sum, run) => sum + run.loopGuardTrips, 0),
  };
}

export function createPlaytestReport(
  runs: readonly PlaytestRunResult[],
  scenarios: readonly PlaytestScenario[],
  generatedAt = new Date().toISOString(),
): PlaytestBatchReport {
  const summaries = [...new Set(runs.map((run) => run.scenarioId))].map((scenarioId) =>
    summarizeGroup(runs.filter((run) => run.scenarioId === scenarioId)),
  );
  const bossIds = [...new Set(runs.map((run) => run.bossId))].sort();
  const bossWinRates = bossIds.map((bossId) => {
    const bossRuns = runs.filter((run) => run.bossId === bossId);
    return {
      bossId,
      runs: bossRuns.length,
      winRate:
        bossRuns.length === 0
          ? 0
          : bossRuns.filter((run) => run.outcome === "victory").length / bossRuns.length,
    };
  });
  const diagnostics: string[] = [];
  const outcomeLabels = runs.map((run) =>
    run.outcome === "victory" ? "victory" : (run.cause ?? run.outcome),
  );
  const outcomeCounts = [...new Set(outcomeLabels)]
    .map((outcome) => ({
      outcome,
      runs: outcomeLabels.filter((candidate) => candidate === outcome).length,
    }))
    .sort((left, right) => right.runs - left.runs);
  for (const summary of summaries) {
    const scenario = scenarios.find((candidate) => candidate.id === summary.scenarioId);
    if (summary.stalled > 0) {
      diagnostics.push(`${summary.scenarioName}: ${summary.stalled} runs did not reach Retro.`);
    }
    if (summary.loopGuardTrips > 0) {
      diagnostics.push(
        `${summary.scenarioName}: loop guard tripped ${summary.loopGuardTrips} times; inspect for an infinite or excessively long turn.`,
      );
    }
    if (summary.winRate === 0) diagnostics.push(`${summary.scenarioName}: no wins in this batch.`);
    if (summary.winRate === 1 && summary.averageEndingMorale >= 8) {
      diagnostics.push(
        `${summary.scenarioName}: 100% wins with high Morale; may be under-pressured.`,
      );
    }
    if (scenario?.expectedSignal === "automation" && summary.averageAutomation < 2) {
      diagnostics.push(`${summary.scenarioName}: its automation engine barely installed anything.`);
    }
    if (scenario?.expectedSignal === "chain" && summary.averagePeakChain < 3) {
      diagnostics.push(`${summary.scenarioName}: average peak Chain stayed below 3.`);
    }
    if (scenario?.expectedSignal === "cards" && summary.averageCardsPerDay < 3.5) {
      diagnostics.push(`${summary.scenarioName}: Card Storm never became much of a storm.`);
    }
    if (scenario?.expectedSignal === "block" && summary.averageBlockPrevented < 5) {
      diagnostics.push(`${summary.scenarioName}: Block prevented very little Morale damage.`);
    }
    if (scenario?.expectedSignal === "debt" && summary.averageTechDebt < 1) {
      diagnostics.push(`${summary.scenarioName}: the Debt build never meaningfully touched Debt.`);
    }
  }
  return {
    schemaVersion: 1,
    generatedAt,
    totalRuns: runs.length,
    summaries,
    bossWinRates,
    outcomeCounts,
    diagnostics,
    runs: [...runs],
  };
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function bar(value: number, width = 12): string {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function pad(value: string | number, width: number, align: "left" | "right" = "right"): string {
  const text = String(value);
  return align === "left" ? text.padEnd(width) : text.padStart(width);
}

export function formatPlaytestReport(report: PlaytestBatchReport): string {
  const rows = report.summaries.map((summary) => [
    pad(summary.scenarioName, 24, "left"),
    `${bar(summary.winRate)} ${pad(percent(summary.winRate), 4)}`,
    pad(summary.averageEncounters.toFixed(1), 6),
    pad(summary.averageCyclesShipped.toFixed(1), 7),
    pad(summary.averageDays.toFixed(1), 5),
    pad(summary.averageEndingMorale.toFixed(1), 6),
    pad(summary.averageTechDebt.toFixed(1), 5),
    pad(summary.averageCardsPerDay.toFixed(1), 7),
    pad(summary.averagePeakChain.toFixed(1), 6),
    pad(summary.averageAutomation.toFixed(1), 7),
    pad(summary.averageBlockPrevented.toFixed(1), 7),
    pad(summary.averageDeadHands.toFixed(1), 6),
  ]);
  const header = [
    pad("BUILD", 24, "left"),
    pad("WIN RATE", 17, "left"),
    pad("FIGHTS", 6),
    pad("SHIPPED", 7),
    pad("DAYS", 5),
    pad("MORALE", 6),
    pad("DEBT", 5),
    pad("CARDS/D", 7),
    pad("CHAIN", 6),
    pad("SCRIPT", 7),
    pad("BLOCKED", 7),
    pad("DEAD", 6),
  ];
  const separator = header.map((column) => "─".repeat(column.length));
  const bossRows = report.bossWinRates.map(
    (boss) =>
      `  ${pad(boss.bossId, 18, "left")} ${bar(boss.winRate, 16)} ${pad(percent(boss.winRate), 4)}  (${boss.runs} runs)`,
  );
  const diagnostics =
    report.diagnostics.length === 0
      ? ["  ✓ No obvious smoke signals in this batch."]
      : report.diagnostics.map((diagnostic) => `  ! ${diagnostic}`);
  const outcomes = report.outcomeCounts.map(
    (outcome) =>
      `  ${pad(outcome.outcome, 24, "left")} ${pad(outcome.runs, 4)}  ${percent(outcome.runs / report.totalRuns)}`,
  );
  const human = report.runs.length > 0 && report.runs.every((run) => run.policy === "human");
  const deckModes = [...new Set(report.runs.map((run) => run.deckMode))];
  const deckLabel = `${deckModes.join(" + ")} deck${deckModes.length === 1 ? "s" : " modes"}`;

  return [
    human ? "LGTM! // HUMAN PLAYTESTS" : "LGTM! // SCRIPTED PLAYTESTS",
    `${report.totalRuns} ${human ? "recorded" : "seeded"} runs · ${deckLabel} · actual reducer · ${report.generatedAt}`,
    "",
    header.join("  "),
    separator.join("  "),
    ...rows.map((row) => row.join("  ")),
    "",
    "FINAL RELEASE BOSSES",
    ...bossRows,
    "",
    "OUTCOMES",
    ...outcomes,
    "",
    "SMOKE SIGNALS",
    ...diagnostics,
    "",
    "Legend: SCRIPT = Script power installed · BLOCKED = Morale damage prevented · DEAD = dead hands",
  ].join("\n");
}
