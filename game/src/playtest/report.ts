import { cards } from "../domain/content";
import type { PlaytestRunResult, PlaytestScenario } from "./simulator";

interface PlaytestScenarioSummary {
  scenarioId: string;
  scenarioName: string;
  runs: number;
  reachedFinalRelease: number;
  reachRate: number;
  launchedFinalRelease: number;
  launchRate: number;
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
  averageScheduleBonusCredits: number;
  loopGuardTrips: number;
  averageDurationMinutes: number;
}

export interface PlaytestBatchReport {
  schemaVersion: 1;
  generatedAt: string;
  totalRuns: number;
  summaries: PlaytestScenarioSummary[];
  bossWinRates: {
    bossId: string;
    runs: number;
    reachRate: number;
    launchRate: number;
    winRate: number;
  }[];
  outcomeCounts: { outcome: string; runs: number }[];
  cardAssociations: CardAssociationSummary[];
  diagnostics: string[];
  runs: PlaytestRunResult[];
}

interface CardAssociationSummary {
  cardId: string;
  cardName: string;
  ownerId?: string;
  rare: boolean;
  eligibleRuns: number;
  presentRuns: number;
  absentRuns: number;
  winsWith: number;
  winsWithout: number;
  winRateWith: number | null;
  winRateWithout: number | null;
  winRateLift: number | null;
  averageCopiesWhenPresent: number;
  winningDeckInclusionRate: number | null;
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, places = 1): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function deckCopies(run: PlaytestRunResult, cardId: string): number {
  return run.finalDeck?.find((card) => card.cardId === cardId)?.copies ?? 0;
}

function createCardAssociations(runs: readonly PlaytestRunResult[]): CardAssociationSummary[] {
  return cards
    .filter((card) => card.tags.includes("reward"))
    .map((card) => {
      const eligibleRuns = runs.filter(
        (run) => !card.ownerId || run.squad.includes(card.ownerId) || deckCopies(run, card.id) > 0,
      );
      const presentRuns = eligibleRuns.filter((run) => deckCopies(run, card.id) > 0);
      const absentRuns = eligibleRuns.filter((run) => deckCopies(run, card.id) === 0);
      const winsWith = presentRuns.filter((run) => run.outcome === "victory").length;
      const winsWithout = absentRuns.filter((run) => run.outcome === "victory").length;
      const eligibleWins = winsWith + winsWithout;
      const winRateWith = presentRuns.length === 0 ? null : winsWith / presentRuns.length;
      const winRateWithout = absentRuns.length === 0 ? null : winsWithout / absentRuns.length;
      return {
        cardId: card.id,
        cardName: card.name,
        ...(card.ownerId ? { ownerId: card.ownerId } : {}),
        rare: card.tags.includes("rare"),
        eligibleRuns: eligibleRuns.length,
        presentRuns: presentRuns.length,
        absentRuns: absentRuns.length,
        winsWith,
        winsWithout,
        winRateWith,
        winRateWithout,
        winRateLift:
          winRateWith === null || winRateWithout === null ? null : winRateWith - winRateWithout,
        averageCopiesWhenPresent: round(
          average(presentRuns.map((run) => deckCopies(run, card.id))),
          2,
        ),
        winningDeckInclusionRate: eligibleWins === 0 ? null : winsWith / eligibleWins,
      };
    })
    .sort((left, right) => left.cardName.localeCompare(right.cardName));
}

function summarizeGroup(runs: readonly PlaytestRunResult[]): PlaytestScenarioSummary {
  const wins = runs.filter((run) => run.outcome === "victory").length;
  const reachedFinalRelease = runs.filter((run) => run.reachedFinalRelease).length;
  const launchedFinalRelease = runs.filter((run) => run.launchedFinalRelease).length;
  const days = runs.map((run) => run.days);
  return {
    scenarioId: runs[0]?.scenarioId ?? "unknown",
    scenarioName: runs[0]?.scenarioName ?? "Unknown",
    runs: runs.length,
    reachedFinalRelease,
    reachRate: runs.length === 0 ? 0 : reachedFinalRelease / runs.length,
    launchedFinalRelease,
    launchRate: runs.length === 0 ? 0 : launchedFinalRelease / runs.length,
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
    averageScheduleBonusCredits: round(average(runs.map((run) => run.scheduleBonusCredits))),
    loopGuardTrips: runs.reduce((sum, run) => sum + run.loopGuardTrips, 0),
    averageDurationMinutes: round(
      average(
        runs.flatMap((run) => (run.durationMs === undefined ? [] : [run.durationMs / 60_000])),
      ),
    ),
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
      reachRate:
        bossRuns.length === 0
          ? 0
          : bossRuns.filter((run) => run.reachedFinalRelease).length / bossRuns.length,
      launchRate:
        bossRuns.length === 0
          ? 0
          : bossRuns.filter((run) => run.launchedFinalRelease).length / bossRuns.length,
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
    if (summary.reachRate === 0) {
      diagnostics.push(`${summary.scenarioName}: never reached Final Release.`);
    } else if (summary.launchRate === 0) {
      diagnostics.push(`${summary.scenarioName}: reached Final Release but never launched.`);
    }
    if (summary.winRate === 0) {
      diagnostics.push(`${summary.scenarioName}: no clean wins in this batch.`);
    }
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
    cardAssociations: createCardAssociations(runs),
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

function signedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function formatCardAssociationRows(associations: readonly CardAssociationSummary[]): string[] {
  const rankable = associations.filter(
    (card) => card.presentRuns >= 5 && card.absentRuns >= 5 && card.winRateLift !== null,
  );
  const positive = rankable
    .filter((card) => card.winRateLift! > 0)
    .sort(
      (left, right) =>
        right.winRateLift! - left.winRateLift! || right.presentRuns - left.presentRuns,
    )
    .slice(0, 8);
  const negative = rankable
    .filter((card) => card.winRateLift! < 0)
    .sort(
      (left, right) =>
        left.winRateLift! - right.winRateLift! || right.presentRuns - left.presentRuns,
    )
    .slice(0, 8);
  const row = (card: CardAssociationSummary) =>
    `  ${pad(card.cardName, 26, "left")} ${pad(card.presentRuns, 5)} with · ${pad(percent(card.winRateWith!), 4)} win · ${pad(card.absentRuns, 5)} without · ${pad(percent(card.winRateWithout!), 4)} base · ${pad(signedPercent(card.winRateLift!), 4)} lift · ${pad(percent(card.winningDeckInclusionRate ?? 0), 4)} of wins`;

  if (positive.length === 0 && negative.length === 0) {
    return ["  Not enough eligible with/without samples yet (need 5 of each)."];
  }
  return [
    ...(positive.length > 0 ? ["  POSITIVE", ...positive.map(row)] : []),
    ...(positive.length > 0 && negative.length > 0 ? [""] : []),
    ...(negative.length > 0 ? ["  NEGATIVE", ...negative.map(row)] : []),
  ];
}

export function formatPlaytestReport(report: PlaytestBatchReport): string {
  const human = report.runs.length > 0 && report.runs.every((run) => run.policy === "human");
  const rows = report.summaries.map((summary) => [
    pad(summary.scenarioName, 24, "left"),
    `${bar(summary.launchRate)} ${pad(percent(summary.launchRate), 4)}`,
    pad(percent(summary.reachRate), 5),
    pad(percent(summary.winRate), 5),
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
    pad(summary.averageScheduleBonusCredits.toFixed(1), 7),
  ]);
  const header = [
    pad("BUILD", 24, "left"),
    pad("LAUNCH RATE", 17, "left"),
    pad("REACH", 5),
    pad("CLEAN", 5),
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
    pad("EARLY$", 7),
  ];
  const separator = header.map((column) => "─".repeat(column.length));
  const bossRows = report.bossWinRates.map(
    (boss) =>
      `  ${pad(boss.bossId, 25, "left")} ${pad(percent(boss.reachRate), 4)} reached · ${bar(boss.launchRate, 12)} ${pad(percent(boss.launchRate), 4)} launched · ${pad(percent(boss.winRate), 4)} clean  (${boss.runs} runs)`,
  );
  const diagnostics =
    report.diagnostics.length === 0
      ? ["  ✓ No obvious smoke signals in this batch."]
      : report.diagnostics.map((diagnostic) => `  ! ${diagnostic}`);
  const outcomes = report.outcomeCounts.map(
    (outcome) =>
      `  ${pad(outcome.outcome, 24, "left")} ${pad(outcome.runs, 4)}  ${percent(outcome.runs / report.totalRuns)}`,
  );
  const deckModes = [...new Set(report.runs.map((run) => run.deckMode))];
  const deckLabel = `${deckModes.join(" + ")} deck${deckModes.length === 1 ? "s" : " modes"}`;
  const cardAssociationRows = formatCardAssociationRows(report.cardAssociations);

  return [
    human ? "LGTM! // HUMAN PLAYTESTS" : "LGTM! // SCRIPTED PLAYTESTS",
    `${report.totalRuns} ${human ? "recorded" : "seeded"} runs · ${deckLabel} · actual reducer · ${report.generatedAt}`,
    "",
    header.join("  "),
    separator.join("  "),
    ...rows.map((row) => row.join("  ")),
    ...(human
      ? [
          "",
          "WALL CLOCK",
          ...report.summaries.map(
            (summary) =>
              `  ${pad(summary.scenarioName, 24, "left")} ${summary.averageDurationMinutes.toFixed(1)} min average`,
          ),
        ]
      : []),
    "",
    "FINAL RELEASE BOSSES",
    ...bossRows,
    "",
    "OUTCOMES",
    ...outcomes,
    ...(!human
      ? [
          "",
          "CARD ASSOCIATIONS",
          "  Final permanent decks · owner-eligible runs · association, not causation",
          ...cardAssociationRows,
        ]
      : []),
    "",
    "SMOKE SIGNALS",
    ...diagnostics,
    "",
    "Legend: SCRIPT = Script power installed · BLOCKED = Morale damage prevented · DEAD = dead hands · EARLY$ = ahead-of-schedule Credits",
  ].join("\n");
}
