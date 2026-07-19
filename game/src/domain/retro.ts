import { getBossDefinition } from "./bosses";
import type { RunState } from "./models";

export type RetroOutcome = "victory" | "defeat";
export type RetroCause = "morale" | "final-release" | "technically-shipped";
type RetroColumnKind = "good" | "bad" | "actions";

export interface RetroFormat {
  good: string;
  bad: string;
  actions: string;
}

interface RetroColumn {
  kind: RetroColumnKind;
  label: string;
  stickies: readonly string[];
}

export interface RetroBoard {
  result: "SHIPPED" | "SHIPPED*" | "TECHNICALLY SHIPPED" | "BURNED OUT" | "MISSED LAUNCH";
  resultDetail: string;
  bossNote: string;
  columns: readonly [RetroColumn, RetroColumn, RetroColumn];
}

export const retroFormats = [
  { good: "Went Well", bad: "Didn't Go Well", actions: "Actions" },
  { good: "Keep", bad: "Drop", actions: "Try" },
  { good: "Continue", bad: "Stop", actions: "Start" },
  { good: "Roses", bad: "Thorns", actions: "Buds" },
  { good: "Wins", bad: "Wobbles", actions: "Next" },
] as const satisfies readonly RetroFormat[];

function seededIndex(seed: number, length: number): number {
  let value = (seed ^ 0x5e7f05ec) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) % length;
}

export function selectRetroFormat(seed: number): RetroFormat {
  return retroFormats[seededIndex(seed, retroFormats.length)]!;
}

function cap(stickies: readonly string[], fallback: string): readonly string[] {
  return stickies.length > 0 ? stickies.slice(0, 4) : [fallback];
}

export function buildRetroBoard(
  run: RunState,
  outcome: RetroOutcome,
  cause?: RetroCause,
): RetroBoard {
  const format = selectRetroFormat(run.seed);
  const shippedTasks = run.history.filter((event) => event.kind === "task-shipped");
  const bossShipments = shippedTasks.filter((event) => event.nodeId === "final-release");
  const launchDefects = bossShipments.reduce((total, event) => total + event.defects, 0);
  const allDefects = shippedTasks.reduce((total, event) => total + event.defects, 0);
  const moraleLost = Math.max(0, run.maxMorale - run.morale);
  const cardPlays = run.history.filter((event) => event.kind === "card-played");
  const generatedCardsPlayed = cardPlays.filter((event) => event.generated).length;
  const peakChain = cardPlays.reduce((peak, event) => Math.max(peak, event.chain?.count ?? 0), 0);
  const missedCycles = run.history.filter(
    (event) => event.kind === "cycle-finished" && event.outcome === "missed",
  ).length;
  const sideQuests = shippedTasks.filter((event) => event.taskId.startsWith("side-quest-")).length;

  const result =
    outcome === "victory"
      ? launchDefects === 1
        ? "SHIPPED*"
        : "SHIPPED"
      : cause === "technically-shipped"
        ? "TECHNICALLY SHIPPED"
        : cause === "morale"
          ? "BURNED OUT"
          : "MISSED LAUNCH";
  const resultDetail =
    result === "SHIPPED"
      ? "Clean launch · 0 Defects"
      : result === "SHIPPED*"
        ? "Victory · Known Issues"
        : result === "TECHNICALLY SHIPPED"
          ? `${Math.max(2, launchDefects)} Defects · Launch rejected`
          : result === "BURNED OUT"
            ? "Morale reached 0"
            : "Final deadline missed";

  const good = [
    outcome === "victory" && launchDefects === 0 ? "0 Defects at launch" : undefined,
    shippedTasks.length > 0 ? `${shippedTasks.length} Tasks shipped` : undefined,
    run.tools.length > 0 ? `${run.tools.length} Tools put to work` : undefined,
    peakChain >= 3 ? `Chain peaked at ${peakChain}` : undefined,
    generatedCardsPlayed >= 3 ? `${generatedCardsPlayed} Generated cards played` : undefined,
    run.morale >= 5 ? `Team finished with ${run.morale} Morale` : undefined,
  ].filter((sticky): sticky is string => Boolean(sticky));

  const bad = [
    allDefects > 0 ? `${allDefects} Defects shipped` : undefined,
    run.techDebt > 0 ? `${run.techDebt} Tech Debt came with us` : undefined,
    moraleLost > 0 ? `${moraleLost} Morale left on the floor` : undefined,
    missedCycles > 0 ? `${missedCycles} Cycle${missedCycles === 1 ? "" : "s"} missed` : undefined,
    sideQuests > 1 ? `${sideQuests} Side Quests seemed important at the time` : undefined,
  ].filter((sticky): sticky is string => Boolean(sticky));

  const actions = [
    launchDefects > 0 || run.techDebt >= 3 ? "Review AI output before launch" : undefined,
    run.morale <= 3 ? "Bring more Block to the readout" : undefined,
    launchDefects > 0 ? "Leave time to Verify" : undefined,
    peakChain < 2 ? "Pick a Task and keep the thread" : undefined,
    run.tools.length === 0 ? "Use the Tool budget" : undefined,
    sideQuests > 0 ? "Budget the Side Quests" : undefined,
  ].filter((sticky): sticky is string => Boolean(sticky));

  const boss = getBossDefinition(run.selectedBossId);
  const bossNote =
    outcome === "defeat"
      ? boss.retroLines.defeat
      : launchDefects === 1
        ? boss.retroLines.knownIssues
        : boss.retroLines.victory;

  return {
    result,
    resultDetail,
    bossNote,
    columns: [
      { kind: "good", label: format.good, stickies: cap(good, "We learned a lot") },
      { kind: "bad", label: format.bad, stickies: cap(bad, "Suspiciously little to report") },
      {
        kind: "actions",
        label: format.actions,
        stickies: cap(actions, "Do it again, but deliberately"),
      },
    ],
  };
}
