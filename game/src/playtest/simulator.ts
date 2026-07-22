import {
  getCard,
  getCardForInstance,
  getActMap,
  getTool,
  isMapNodeAvailable,
} from "../domain/content";
import { getEvent } from "../domain/events";
import { getEncounterCycleDefinition } from "../domain/bosses";
import type {
  CardDefinition,
  CardInstance,
  CardTag,
  DeveloperId,
  Discipline,
  MapNode,
  RunState,
  ToolId,
} from "../domain/models";
import { canDuplicateCard, canRefactorCard, shopServicePrices } from "../domain/shop";
import { getWeekendChoiceState, getWeekendSquadDraftCardIds } from "../domain/weekend";
import {
  gameReducer,
  initialGameState,
  type GameAction,
  type GameState,
} from "../game/gameReducer";
import { effectiveMapEdges } from "../game/eventResolution";
import {
  effectiveCardCost,
  incomingMorale,
  isTaskReady,
  resolveCardTarget,
  taskShippingPreview,
  type CardTarget,
} from "../game/rules";

// Deliberately exported as data: the CLI and regression tests use the same
// scenarios, and adding a build should be one small catalogue change.
export interface PlaytestScenario {
  id: string;
  name: string;
  squad: readonly [DeveloperId, DeveloperId, DeveloperId];
  bonusCardIds: readonly string[];
  preferredTags: readonly CardTag[];
  expectedSignal: "general" | "cards" | "automation" | "completion" | "block" | "debt" | "chain";
}

export const playtestScenarios: readonly PlaytestScenario[] = [
  {
    id: "research-squad",
    name: "Research Squad",
    squad: ["paul", "odin", "madi"],
    bonusCardIds: [
      "spike-it",
      "new-model-dropped",
      "agentic-loop",
      "parallel-agents",
      "approved-with-comments",
      "manual-mode",
    ],
    preferredTags: ["ai-assisted", "review"],
    expectedSignal: "debt",
  },
  {
    id: "platform-squad",
    name: "Platform Squad",
    squad: ["seb", "toby", "steph"],
    bonusCardIds: [
      "design-tokens",
      "used-everywhere",
      "on-call",
      "useful-alerting",
      "hot-reload",
      "golden-path",
    ],
    preferredTags: ["automation", "defense"],
    expectedSignal: "automation",
  },
  {
    id: "panel-squad",
    name: "Panel Squad",
    squad: ["elspeth", "matt", "kirsten"],
    bonusCardIds: [
      "check-in",
      "it-all-adds-up",
      "on-a-roll",
      "room-to-breathe",
      "microinteraction",
      "no-rough-edges",
    ],
    preferredTags: ["generated", "defense", "flexible"],
    expectedSignal: "cards",
  },
  {
    id: "card-storm",
    name: "Card Storm",
    squad: ["kirsten", "nick", "levi"],
    bonusCardIds: [
      "it-all-adds-up",
      "on-a-roll",
      "deep-work",
      "no-meetings",
      "tiny-commit",
      "context-loaded",
    ],
    preferredTags: ["generated", "exhaust"],
    expectedSignal: "cards",
  },
  {
    id: "automation",
    name: "Automation",
    squad: ["madi", "steph", "toby"],
    bonusCardIds: [
      "custom-toolchain",
      "agentic-loop",
      "automate-this-bit",
      "hot-reload",
      "useful-alerting",
      "keep-it-humming",
    ],
    preferredTags: ["automation", "defense"],
    expectedSignal: "automation",
  },
  {
    id: "completion-cascade",
    name: "Completion Cascade",
    squad: ["seb", "irene", "matt"],
    bonusCardIds: [
      "design-tokens",
      "used-everywhere",
      "last-10-percent",
      "no-fuss",
      "one-more-pass",
      "microinteraction",
    ],
    preferredTags: ["review", "flexible"],
    expectedSignal: "completion",
  },
  {
    id: "block-engine",
    name: "Block Engine",
    squad: ["elspeth", "toby", "steph"],
    bonusCardIds: [
      "psychological-safety",
      "room-to-breathe",
      "on-call",
      "useful-alerting",
      "guardrails-not-gatekeepers",
      "healthy-guardrails",
    ],
    preferredTags: ["defense", "automation"],
    expectedSignal: "block",
  },
  {
    id: "ship-fast",
    name: "Ship Fast, Clean Later",
    squad: ["paul", "madi", "odin"],
    bonusCardIds: [
      "spike-it",
      "new-model-dropped",
      "agentic-loop",
      "parallel-agents",
      "approved-with-comments",
      "manual-mode",
    ],
    preferredTags: ["ai-assisted", "review"],
    expectedSignal: "debt",
  },
  {
    id: "planned-burst",
    name: "Planned Burst",
    squad: ["nick", "odin", "levi"],
    bonusCardIds: [
      "put-a-pin-in-it",
      "deep-work",
      "one-more-diagram",
      "strong-opinions-loosely-held",
      "keep-the-thread",
      "flow-state",
    ],
    preferredTags: ["review", "exhaust"],
    expectedSignal: "chain",
  },
] as const;

// A balanced incomplete roster matrix: every developer appears exactly three
// times, while none of the authored workplace squads appear intact.
export const mixedPlaytestScenarios: readonly PlaytestScenario[] = [
  {
    id: "mixed-paul-seb-nick",
    name: "Paul / Seb / Nick",
    squad: ["paul", "seb", "nick"],
    bonusCardIds: [],
    preferredTags: ["exhaust", "flexible"],
    expectedSignal: "general",
  },
  {
    id: "mixed-odin-toby-levi",
    name: "Odin / Toby / Levi",
    squad: ["odin", "toby", "levi"],
    bonusCardIds: [],
    preferredTags: ["review", "defense"],
    expectedSignal: "general",
  },
  {
    id: "mixed-irene-steph-kirsten",
    name: "Irene / Steph / Kirsten",
    squad: ["irene", "steph", "kirsten"],
    bonusCardIds: [],
    preferredTags: ["automation", "generated", "flexible"],
    expectedSignal: "general",
  },
  {
    id: "mixed-madi-elspeth-matt",
    name: "Madi / Elspeth / Matt",
    squad: ["madi", "elspeth", "matt"],
    bonusCardIds: [],
    preferredTags: ["automation", "defense", "review"],
    expectedSignal: "general",
  },
  {
    id: "mixed-paul-toby-kirsten",
    name: "Paul / Toby / Kirsten",
    squad: ["paul", "toby", "kirsten"],
    bonusCardIds: [],
    preferredTags: ["generated", "defense", "flexible"],
    expectedSignal: "general",
  },
  {
    id: "mixed-odin-steph-matt",
    name: "Odin / Steph / Matt",
    squad: ["odin", "steph", "matt"],
    bonusCardIds: [],
    preferredTags: ["review", "automation"],
    expectedSignal: "general",
  },
  {
    id: "mixed-irene-elspeth-nick",
    name: "Irene / Elspeth / Nick",
    squad: ["irene", "elspeth", "nick"],
    bonusCardIds: [],
    preferredTags: ["flexible", "defense", "exhaust"],
    expectedSignal: "general",
  },
  {
    id: "mixed-madi-seb-levi",
    name: "Madi / Seb / Levi",
    squad: ["madi", "seb", "levi"],
    bonusCardIds: [],
    preferredTags: ["automation", "ai-assisted"],
    expectedSignal: "general",
  },
  {
    id: "mixed-paul-steph-levi",
    name: "Paul / Steph / Levi",
    squad: ["paul", "steph", "levi"],
    bonusCardIds: [],
    preferredTags: ["automation", "flexible"],
    expectedSignal: "general",
  },
  {
    id: "mixed-odin-elspeth-kirsten",
    name: "Odin / Elspeth / Kirsten",
    squad: ["odin", "elspeth", "kirsten"],
    bonusCardIds: [],
    preferredTags: ["review", "defense", "generated"],
    expectedSignal: "general",
  },
  {
    id: "mixed-irene-seb-matt",
    name: "Irene / Seb / Matt",
    squad: ["irene", "seb", "matt"],
    bonusCardIds: [],
    preferredTags: ["review", "flexible"],
    expectedSignal: "general",
  },
  {
    id: "mixed-madi-toby-nick",
    name: "Madi / Toby / Nick",
    squad: ["madi", "toby", "nick"],
    bonusCardIds: [],
    preferredTags: ["automation", "defense", "exhaust"],
    expectedSignal: "general",
  },
] as const;

export type PlaytestPolicy = "balanced" | "velocity" | "careful";
type PlaytestPilot = PlaytestPolicy | "human";
export type PlaytestDeckMode = "starter" | "showcase";

export interface PlaytestDeckCard {
  cardId: string;
  copies: number;
}

export interface PlaytestRunResult {
  schemaVersion: 1;
  scenarioId: string;
  scenarioName: string;
  policy: PlaytestPilot;
  deckMode: PlaytestDeckMode;
  sourceId?: string;
  durationMs?: number;
  seed: number;
  squad: readonly DeveloperId[];
  bossId: string;
  outcome: "victory" | "defeat" | "stalled" | "incomplete";
  cause?: string;
  reachedFinalRelease: boolean;
  launchedFinalRelease: boolean;
  encounters: number;
  cyclesShipped: number;
  cyclesMissed: number;
  days: number;
  actions: number;
  cardsPlayed: number;
  generatedCardsPlayed: number;
  cardsExhausted: number;
  maxCardsInDay: number;
  focusGained: number;
  blockGained: number;
  blockPrevented: number;
  moraleLost: number;
  endingMorale: number;
  endingTechDebt: number;
  maxTechDebt: number;
  defects: number;
  scheduleBonusCredits: number;
  tasksShipped: number;
  requirementsCompleted: number;
  automationInstalled: number;
  guardsInstalled: number;
  peakChain: number;
  deadHands: number;
  loopGuardTrips: number;
  tools: readonly string[];
  deckSize: number;
  finalDeck: readonly PlaytestDeckCard[];
}

export function summarizePlaytestDeck(deck: readonly CardInstance[]): PlaytestDeckCard[] {
  const copiesByCardId = new Map<string, number>();
  for (const instance of deck) {
    const cardId = getCardForInstance(instance).id;
    copiesByCardId.set(cardId, (copiesByCardId.get(cardId) ?? 0) + 1);
  }
  return [...copiesByCardId]
    .map(([cardId, copies]) => ({ cardId, copies }))
    .sort((left, right) => left.cardId.localeCompare(right.cardId));
}

export interface PlaytestMetrics {
  actions: number;
  reachedFinalRelease: boolean;
  launchedFinalRelease: boolean;
  encounters: number;
  cyclesShipped: number;
  cyclesMissed: number;
  days: number;
  cardsPlayed: number;
  generatedCardsPlayed: number;
  cardsExhausted: number;
  maxCardsInDay: number;
  focusGained: number;
  blockGained: number;
  blockPrevented: number;
  moraleLost: number;
  maxTechDebt: number;
  defects: number;
  scheduleBonusCredits: number;
  tasksShipped: number;
  requirementsCompleted: number;
  automationInstalled: number;
  guardsInstalled: number;
  peakChain: number;
  deadHands: number;
  loopGuardTrips: number;
}

interface CandidateAction {
  action: GameAction;
  state: GameState;
  score: number;
}

interface PolicyProfile {
  survival: number;
  quality: number;
  debt: number;
  urgency: number;
}

interface PlannedTurn {
  state: GameState;
  actions: readonly GameAction[];
  score: number;
}

const disciplines = ["frontend", "backend", "infra"] as const satisfies readonly Discipline[];
const maxRunActions = 5_000;
const maxCardPlaysPerDay = 120;
const turnSearchDepth = 5;
const turnSearchWidth = 8;
const turnCandidateLimit = 14;

const policyProfiles: Readonly<Record<PlaytestPolicy, PolicyProfile>> = {
  balanced: { survival: 1, quality: 1, debt: 1, urgency: 1 },
  velocity: { survival: 0.85, quality: 0.55, debt: 0.45, urgency: 1.35 },
  careful: { survival: 1.25, quality: 1.4, debt: 1.45, urgency: 0.8 },
};

export function createPlaytestMetrics(): PlaytestMetrics {
  return {
    actions: 0,
    reachedFinalRelease: false,
    launchedFinalRelease: false,
    encounters: 0,
    cyclesShipped: 0,
    cyclesMissed: 0,
    days: 0,
    cardsPlayed: 0,
    generatedCardsPlayed: 0,
    cardsExhausted: 0,
    maxCardsInDay: 0,
    focusGained: 0,
    blockGained: 0,
    blockPrevented: 0,
    moraleLost: 0,
    maxTechDebt: 0,
    defects: 0,
    scheduleBonusCredits: 0,
    tasksShipped: 0,
    requirementsCompleted: 0,
    automationInstalled: 0,
    guardsInstalled: 0,
    peakChain: 0,
    deadHands: 0,
    loopGuardTrips: 0,
  };
}

function totalWork(run: RunState | null): number {
  return (
    run?.cycle?.tasks.reduce(
      (sum, task) =>
        sum +
        task.requirements.reduce(
          (taskSum, requirement) =>
            taskSum + Math.min(requirement.target, requirement.verified + requirement.unverified),
          0,
        ),
      0,
    ) ?? 0
  );
}

function remainingWork(run: RunState | null): number {
  return (
    run?.cycle?.tasks.reduce(
      (sum, task) =>
        task.status === "shipped"
          ? sum
          : sum +
            task.requirements.reduce(
              (taskSum, requirement) =>
                taskSum +
                Math.max(0, requirement.target - requirement.verified - requirement.unverified),
              0,
            ),
      0,
    ) ?? 0
  );
}

function unverifiedWork(run: RunState | null): number {
  return (
    run?.cycle?.tasks.reduce(
      (sum, task) =>
        task.status === "shipped"
          ? sum
          : sum +
            task.requirements.reduce((taskSum, requirement) => taskSum + requirement.unverified, 0),
      0,
    ) ?? 0
  );
}

function verifiedWork(run: RunState | null): number {
  return (
    run?.cycle?.tasks.reduce(
      (sum, task) =>
        sum +
        task.requirements.reduce(
          (taskSum, requirement) => taskSum + Math.min(requirement.target, requirement.verified),
          0,
        ),
      0,
    ) ?? 0
  );
}

function completedRequirements(run: RunState | null): number {
  return (
    run?.cycle?.tasks.reduce(
      (sum, task) =>
        sum +
        task.requirements.filter(
          (requirement) => requirement.verified + requirement.unverified >= requirement.target,
        ).length,
      0,
    ) ?? 0
  );
}

function automationMeters(run: RunState | null): { scripts: number; guards: number } {
  const requirements = run?.cycle?.tasks.flatMap((task) => task.requirements) ?? [];
  return {
    scripts: requirements.reduce((sum, requirement) => sum + requirement.scriptPower, 0),
    guards: run?.cycle?.guardPower ?? 0,
  };
}

function readyTasks(run: RunState | null): number {
  return run?.cycle?.tasks.filter(isTaskReady).length ?? 0;
}

function stunnedTasks(run: RunState | null): number {
  return run?.cycle?.tasks.filter((task) => task.stunned).length ?? 0;
}

function candidateScore(
  before: GameState,
  after: GameState,
  card: CardDefinition,
  policy: PlaytestPolicy,
): number {
  const progress = totalWork(after.run) - totalWork(before.run);
  const verified = verifiedWork(after.run) - verifiedWork(before.run);
  const completions = completedRequirements(after.run) - completedRequirements(before.run);
  const ready = readyTasks(after.run) - readyTasks(before.run);
  const automationBefore = automationMeters(before.run);
  const automationAfter = automationMeters(after.run);
  const scripts = automationAfter.scripts - automationBefore.scripts;
  const guards = automationAfter.guards - automationBefore.guards;
  const incoming = before.run?.cycle ? incomingMorale(before.run, before.run.cycle) : 0;
  const usefulBlockBefore = Math.min(before.run?.cycle?.block ?? 0, incoming);
  const usefulBlockAfter = Math.min(after.run?.cycle?.block ?? 0, incoming);
  const block = usefulBlockAfter - usefulBlockBefore;
  const hand = (after.run?.cycle?.hand.length ?? 0) - (before.run?.cycle?.hand.length ?? 0);
  const debt = (after.run?.techDebt ?? 0) - (before.run?.techDebt ?? 0);
  const stuns = stunnedTasks(after.run) - stunnedTasks(before.run);
  const qualityWeight = policy === "careful" ? 4 : policy === "velocity" ? 1 : 2.5;
  const blockWeight = policy === "careful" ? 3 : policy === "velocity" ? 0.8 : 1.8;
  const debtWeight = policy === "careful" ? 5 : policy === "velocity" ? 0.5 : 2;
  const setup =
    (card.generatedCards ? 2 : 0) +
    (card.cardsDrawn ?? 0) * 1.5 +
    (card.nextDayCardsDrawn ?? 0) +
    (card.focusGained ?? 0) * 2 +
    (card.retainHandTarget ? 1.5 : 0) +
    (card.cycleWorkBonus || card.dayWorkBonus ? 2 : 0);

  return (
    progress * 8 +
    verified * qualityWeight +
    completions * 10 +
    ready * 12 +
    scripts * 5 +
    guards * 3 +
    Math.max(0, block) * blockWeight +
    Math.max(0, hand) * 1.5 +
    stuns * 5 -
    debt * debtWeight +
    setup +
    0.01
  );
}

function actionKey(action: GameAction): string {
  return JSON.stringify(action);
}

function cycleStateValue(
  state: GameState,
  scenario: PlaytestScenario,
  policy: PlaytestPolicy,
): number {
  const run = state.run;
  if (!run) return Number.NEGATIVE_INFINITY;
  const profile = policyProfiles[policy];
  const base =
    run.morale * 70 * profile.survival -
    run.techDebt * 20 * profile.debt +
    run.credits * 0.08 +
    run.tools.length * 14;

  if (state.screen.name === "retro") {
    if (state.screen.outcome === "victory") return 100_000 + base;
    if (state.screen.cause === "technically-shipped") return 72_000 + base;
    return -100_000 + base;
  }
  if (state.screen.name === "report") return 22_000 + base;
  if (state.screen.name !== "cycle" || !run.cycle) return base;

  const cycle = run.cycle;
  const definition = getEncounterCycleDefinition(cycle);
  const daysRemaining = Math.max(1, definition.maxDays - cycle.day + 1);
  const incoming = incomingMorale(run, cycle);
  const usefulBlock = Math.min(cycle.block, incoming);
  const carriedBlock = run.tools.includes("error-budget") ? Math.max(0, cycle.block - incoming) : 0;
  const automation = automationMeters(run);
  const openTasks = cycle.tasks.filter((task) => task.status !== "shipped");
  const shipped = cycle.tasks.length - openTasks.length;
  const ready = openTasks.filter(isTaskReady).length;
  const work = totalWork(run);
  const verified = verifiedWork(run);
  const unverified = unverifiedWork(run);
  const remaining = remainingWork(run);
  const urgencyMultiplier = 1 + profile.urgency * (1 / daysRemaining);
  const signalBonus =
    scenario.expectedSignal === "cards"
      ? cycle.cardsPlayedThisDay * 5 + cycle.generatedCardsPlayedThisDay * 10
      : scenario.expectedSignal === "automation"
        ? (automation.scripts + automation.guards) * 12
        : scenario.expectedSignal === "completion"
          ? completedRequirements(run) * 16
          : scenario.expectedSignal === "block"
            ? usefulBlock * 10
            : scenario.expectedSignal === "debt"
              ? Math.min(run.techDebt, 8) * 2
              : scenario.expectedSignal === "chain"
                ? cycle.chain.count * 8
                : 0;

  return (
    base +
    shipped * 900 +
    ready * 260 +
    completedRequirements(run) * 120 +
    work * 18 +
    verified * 8 * profile.quality -
    unverified * 10 * profile.quality -
    remaining * 11 * urgencyMultiplier +
    cycle.focus * 8 +
    usefulBlock * 32 * profile.survival +
    carriedBlock * 8 +
    cycle.tasks.filter((task) => task.stunned && task.status !== "shipped").length * 70 +
    automation.scripts * daysRemaining * 15 +
    automation.guards * daysRemaining * 8 +
    signalBonus
  );
}

function cardTargets(state: GameState, instance: CardInstance): CardTarget[] {
  const cycle = state.run?.cycle;
  if (!cycle) return [];
  const targets: CardTarget[] = [{ kind: "squad" }];
  for (const discipline of disciplines) targets.push({ kind: "discipline", discipline });
  for (const task of cycle.tasks) {
    if (task.status === "shipped") continue;
    targets.push({ kind: "task", taskId: task.taskId });
    for (const requirement of task.requirements) {
      targets.push({ kind: "task", taskId: task.taskId, discipline: requirement.discipline });
    }
  }
  for (const other of cycle.hand) {
    if (other.instanceId !== instance.instanceId) {
      targets.push({ kind: "hand-card", instanceId: other.instanceId });
    }
  }
  for (const exhausted of cycle.exhaustPile) {
    targets.push({ kind: "exhaust-card", instanceId: exhausted.instanceId });
  }
  return targets;
}

function playableCandidates(state: GameState, policy: PlaytestPolicy): CandidateAction[] {
  const cycle = state.run?.cycle;
  if (state.screen.name !== "cycle" || !state.run || !cycle || cycle.pendingCardChoice) return [];
  const candidates: CandidateAction[] = [];
  for (const instance of cycle.hand) {
    const card = getCardForInstance(instance);
    for (const target of cardTargets(state, instance)) {
      if (!resolveCardTarget(state.run, instance, target).legal) continue;
      const action = { type: "PLAY_CARD", instanceId: instance.instanceId, target } as const;
      const next = gameReducer(state, action);
      if (next === state) continue;
      candidates.push({ action, state: next, score: candidateScore(state, next, card, policy) });
    }
  }
  return candidates.sort((left, right) => right.score - left.score);
}

export function hasPlayableCard(state: GameState): boolean {
  return playableCandidates(state, "balanced").length > 0;
}

function turnActions(state: GameState, policy: PlaytestPolicy): CandidateAction[] {
  if (state.screen.name !== "cycle" || !state.run?.cycle) return [];
  const candidates: CandidateAction[] = [];
  const candidatesPerCard = new Map<string, number>();
  for (const candidate of playableCandidates(state, policy)) {
    if (candidate.action.type !== "PLAY_CARD") continue;
    const count = candidatesPerCard.get(candidate.action.instanceId) ?? 0;
    if (count >= 2) continue;
    candidates.push(candidate);
    candidatesPerCard.set(candidate.action.instanceId, count + 1);
    if (candidates.length >= turnCandidateLimit) break;
  }
  for (const task of state.run.cycle.tasks) {
    if (task.status !== "ready") continue;
    const action = { type: "SHIP_TASK", taskId: task.taskId } as const;
    const next = gameReducer(state, action);
    if (next !== state) candidates.push({ action, state: next, score: 0 });
  }
  const launchAction = { type: "LAUNCH_FINAL_RELEASE" } as const;
  const launched = gameReducer(state, launchAction);
  if (launched !== state) candidates.push({ action: launchAction, state: launched, score: 0 });
  const endDayAction = { type: "END_DAY" } as const;
  const ended = gameReducer(state, endDayAction);
  if (ended !== state) candidates.push({ action: endDayAction, state: ended, score: 0 });
  return candidates;
}

function choosePlannedCycleAction(
  state: GameState,
  policy: PlaytestPolicy,
  scenario: PlaytestScenario,
): GameAction | undefined {
  if (state.screen.name !== "cycle" || !state.run?.cycle) return undefined;
  const startingDay = state.run.cycle.day;
  let frontier: PlannedTurn[] = [
    { state, actions: [], score: cycleStateValue(state, scenario, policy) },
  ];
  const terminals: PlannedTurn[] = [];

  for (let depth = 0; depth < turnSearchDepth && frontier.length > 0; depth += 1) {
    const expanded: PlannedTurn[] = [];
    for (const plan of frontier) {
      const seen = new Set<string>();
      for (const candidate of turnActions(plan.state, policy)) {
        const key = actionKey(candidate.action);
        if (seen.has(key)) continue;
        seen.add(key);
        const actions = [...plan.actions, candidate.action];
        const score = cycleStateValue(candidate.state, scenario, policy) - actions.length * 0.05;
        const next: PlannedTurn = { state: candidate.state, actions, score };
        const nextCycle = candidate.state.run?.cycle;
        const turnEnded =
          candidate.action.type === "END_DAY" ||
          candidate.state.screen.name !== "cycle" ||
          !nextCycle ||
          nextCycle.day !== startingDay ||
          Boolean(nextCycle.pendingCardChoice || nextCycle.boss?.transitionNotice);
        if (turnEnded) terminals.push(next);
        else expanded.push(next);
      }
    }
    frontier = expanded.sort((left, right) => right.score - left.score).slice(0, turnSearchWidth);
  }

  for (const plan of frontier) {
    const action = { type: "END_DAY" } as const;
    const ended = gameReducer(plan.state, action);
    if (ended === plan.state) continue;
    const actions = [...plan.actions, action];
    terminals.push({
      state: ended,
      actions,
      score: cycleStateValue(ended, scenario, policy) - actions.length * 0.05,
    });
  }

  return terminals.sort(
    (left, right) =>
      right.score - left.score ||
      actionKey(left.actions[0]!).localeCompare(actionKey(right.actions[0]!)),
  )[0]?.actions[0];
}

function generatedCardCount(card: CardDefinition): number {
  if (!card.generatedCards) return 0;
  return "count" in card.generatedCards
    ? card.generatedCards.count
    : card.generatedCards.reduce((sum, generated) => sum + generated.count, 0);
}

function cardRewardScore(cardId: string, scenario: PlaytestScenario, run?: RunState): number {
  const card = getCard(cardId);
  if (card.id === "tech-debt" || card.id === "distraction") return -40;
  const copies = run?.deck.filter((instance) => instance.cardId === cardId).length ?? 0;
  const automation = card.automation?.kind === "install" ? card.automation.power * 9 : 0;
  const utility =
    (card.block ?? 0) * 2 +
    (card.focusGained ?? 0) * 6 +
    (card.cardsDrawn ?? 0) * 4 +
    (card.nextDayCardsDrawn ?? 0) * 3 +
    generatedCardCount(card) * 5 +
    (card.copyNextCardEffect ? 16 : 0) +
    (card.verifiedWorkPerOpenTask ?? 0) * 4 +
    (card.triggerEveryAutomation ? (scenario.preferredTags.includes("automation") ? 24 : 12) : 0) +
    (card.reviewAllUnverified ? (scenario.preferredTags.includes("review") ? 24 : 14) : 0) +
    (card.blockWorkPowerThisDay ?? 0) * 10 +
    (card.exhaustAllTechDebtCards
      ? (run?.deck.filter((instance) => instance.cardId === "tech-debt").length ?? 0) * 8
      : 0) +
    (card.stun || card.stunIntent ? 9 : 0) +
    (card.exhaust ? 2 : 0) +
    automation;
  const output =
    (card.amount + (card.workPerTechDebt ?? 0) * (run?.techDebt ?? 0)) *
      (card.workKind === "unverified" ? 2 : 3) +
    (card.kind === "review" ? card.amount * 2 : 0);
  return (
    output +
    utility +
    (card.ownerId && scenario.squad.includes(card.ownerId) ? 4 : 0) +
    (card.rarity === "rare" ? 5 : 0) +
    scenario.preferredTags.filter((tag) => card.tags.includes(tag)).length * 4 +
    (card.tags.includes("reward") ? 1 : 0) +
    (card.tags.includes("status") ? -12 : 0) -
    card.cost * 4 -
    copies * 4 -
    Math.max(0, (run?.deck.length ?? 12) - 14) * 0.35
  );
}

function toolScore(toolId: ToolId, run: RunState, scenario: PlaytestScenario): number {
  const preferred = new Set(scenario.preferredTags);
  const base = getTool(toolId).rules.length > 0 ? 10 : 0;
  switch (toolId) {
    case "ci-runner":
    case "cron-upgrade":
    case "platypus":
      return base + (preferred.has("automation") ? 28 : 10);
    case "test-suite":
      return base + (preferred.has("review") ? 24 : 10);
    case "error-budget":
    case "pangolin":
      return base + (preferred.has("defense") ? 24 : 8);
    case "merge-queue":
    case "reef-shark":
      return base + (scenario.expectedSignal === "completion" ? 24 : 12);
    case "enterprise-ai-licence":
      return base + (preferred.has("ai-assisted") ? 22 : -4) - run.techDebt * 1.5;
    case "pairing-session":
      return base + (preferred.has("flexible") || preferred.has("review") ? 10 : 8);
    case "cat-tax":
      return (
        base + (run.deck.some((card) => getCardForInstance(card).tags.includes("status")) ? 16 : 2)
      );
    case "timezone-wrangler":
      return base + (scenario.expectedSignal === "chain" ? 20 : 8);
    case "noise-cancelling-headphones":
      return base + 12;
    case "garbage-collector":
      return base + (preferred.has("exhaust") || preferred.has("generated") ? 24 : 8);
    case "institutional-knowledge":
      return base + run.deck.filter((card) => card.cardId === "tech-debt").length * 6;
    case "definition-of-done":
      return base + (scenario.expectedSignal === "completion" ? 22 : 12);
    case "pomodoro-timer":
      return base + (scenario.expectedSignal === "chain" ? 26 : 6);
    case "t-shaped-team":
      return base + (preferred.has("flexible") ? 24 : 7);
    case "venture-debt":
      return base + Math.min(run.techDebt * 2, 18) + (run.credits < 100 ? 8 : 2);
    case "healthy-runway":
      return base + Math.floor(run.credits / 50) * 8;
    case "boilerplate-generator":
      return base + (preferred.has("generated") ? 26 : 8);
  }
}

function routeScore(node: MapNode, run: RunState, policy: PlaytestPolicy): number {
  switch (node.kind) {
    case "retro":
    case "boss":
      return 100;
    case "weekend":
      return 90;
    case "shop":
      return 80;
    case "event":
      return 70;
    case "cycle":
      return node.id.includes("safe") ? 65 : 55;
    case "incident": {
      const threshold = policy === "careful" ? 12 : policy === "velocity" ? 8 : 11;
      const completedIncidents = run.completedNodeIds.filter((nodeId) =>
        nodeId.startsWith("incident-"),
      ).length;
      const incidentBudget = policy === "velocity" ? 2 : 1;
      return run.morale >= threshold && completedIncidents < incidentBudget ? 76 : 28;
    }
  }
}

function stateValue(
  state: GameState,
  scenario: PlaytestScenario,
  policy: PlaytestPolicy = "balanced",
): number {
  const run = state.run;
  if (!run) return Number.NEGATIVE_INFINITY;
  const profile = policyProfiles[policy];
  return (
    run.morale * 16 * profile.survival -
    run.techDebt * 7 * profile.debt +
    run.credits * 0.05 +
    run.tools.reduce((sum, toolId) => sum + toolScore(toolId, run, scenario), 0) +
    run.deck.reduce((sum, card) => sum + cardRewardScore(card.cardId, scenario, run) * 0.18, 0)
  );
}

function weakestRefactorTarget(
  run: RunState,
  scenario: PlaytestScenario,
): CardInstance | undefined {
  return run.deck
    .filter((instance) => canRefactorCard(run, instance))
    .sort(
      (left, right) =>
        cardRewardScore(left.cardId, scenario, run) - cardRewardScore(right.cardId, scenario, run),
    )[0];
}

function createBonusDeck(state: GameState, scenario: PlaytestScenario): GameState {
  if (!state.run) return state;
  const start = state.run.nextCardInstanceId;
  const bonusCards = scenario.bonusCardIds.map((cardId, index) => ({
    cardId,
    instanceId: `playtest-${start + index}`,
  }));
  return {
    ...state,
    run: {
      ...state.run,
      deck: [...state.run.deck, ...bonusCards],
      nextCardInstanceId: start + bonusCards.length,
    },
  };
}

export function updatePlaytestMetrics(
  metrics: PlaytestMetrics,
  before: GameState,
  action: GameAction,
  after: GameState,
): void {
  metrics.actions += 1;
  metrics.maxTechDebt = Math.max(metrics.maxTechDebt, after.run?.techDebt ?? 0);
  metrics.peakChain = Math.max(metrics.peakChain, after.run?.cycle?.peakChain ?? 0);

  if (action.type === "VISIT_NODE" && after.screen.name === "cycle") {
    metrics.encounters += 1;
    if (action.nodeId === "final-release") metrics.reachedFinalRelease = true;
  }

  if (action.type === "PLAY_CARD" && before.run?.cycle && after.run?.cycle) {
    const instance = before.run.cycle.hand.find((card) => card.instanceId === action.instanceId);
    if (instance) {
      const definition = getCardForInstance(instance);
      const cost = effectiveCardCost(definition, before.run.cycle, before.run.squad, instance);
      metrics.cardsPlayed += 1;
      if (instance.generated || instance.temporary) metrics.generatedCardsPlayed += 1;
      metrics.focusGained += Math.max(0, after.run.cycle.focus - (before.run.cycle.focus - cost));
      metrics.blockGained += Math.max(0, after.run.cycle.block - before.run.cycle.block);
      metrics.maxCardsInDay = Math.max(metrics.maxCardsInDay, after.run.cycle.cardsPlayedThisDay);
      const beforeAutomation = automationMeters(before.run);
      const afterAutomation = automationMeters(after.run);
      metrics.automationInstalled += Math.max(
        0,
        afterAutomation.scripts - beforeAutomation.scripts,
      );
      metrics.guardsInstalled += Math.max(0, afterAutomation.guards - beforeAutomation.guards);
      metrics.requirementsCompleted += Math.max(
        0,
        completedRequirements(after.run) - completedRequirements(before.run),
      );
    }
  }

  if (action.type === "SHIP_TASK" && before.run?.cycle) {
    const task = before.run.cycle.tasks.find((candidate) => candidate.taskId === action.taskId);
    if (task) {
      const preview = taskShippingPreview(task);
      metrics.blockPrevented += Math.min(before.run.cycle.block, preview.moraleLoss);
      metrics.tasksShipped += 1;
      metrics.defects += preview.defects;
    }
  }

  if (action.type === "END_DAY" && before.run?.cycle) {
    metrics.days += 1;
    metrics.blockPrevented += Math.min(
      before.run.cycle.block,
      incomingMorale(before.run, before.run.cycle),
    );
  }

  const moraleBefore = before.run?.morale ?? after.run?.morale ?? 0;
  const moraleAfter = after.run?.morale ?? moraleBefore;
  metrics.moraleLost += Math.max(0, moraleBefore - moraleAfter);

  if (before.screen.name === "cycle" && after.screen.name === "report") {
    metrics.scheduleBonusCredits += after.screen.report.scheduleBonusCredits ?? 0;
  }

  const newHistory = after.run?.history.slice(before.run?.history.length ?? 0) ?? [];
  for (const event of newHistory) {
    if (event.kind === "cycle-finished") {
      if (event.outcome === "shipped") metrics.cyclesShipped += 1;
      else metrics.cyclesMissed += 1;
    }
    if (event.kind === "card-played" && event.exhausted) metrics.cardsExhausted += 1;
    if (event.kind === "final-release-launched") metrics.launchedFinalRelease = true;
  }
}

function chooseBestTransition(
  state: GameState,
  actions: readonly GameAction[],
  scenario: PlaytestScenario,
  policy: PlaytestPolicy,
): GameAction | undefined {
  return actions
    .map((action) => ({ action, state: gameReducer(state, action) }))
    .filter((candidate) => candidate.state !== state)
    .sort(
      (left, right) =>
        stateValue(right.state, scenario, policy) - stateValue(left.state, scenario, policy),
    )[0]?.action;
}

function nextNonCycleAction(
  state: GameState,
  scenario: PlaytestScenario,
  policy: PlaytestPolicy,
): GameAction | undefined {
  if (!state.run) return undefined;
  switch (state.screen.name) {
    case "squad": {
      const missing = scenario.squad.find((developerId) => !state.run?.squad.includes(developerId));
      return missing
        ? { type: "TOGGLE_DEVELOPER", developerId: missing }
        : { type: "CONFIRM_SQUAD" };
    }
    case "map": {
      const available = getActMap(state.run.seed)
        .nodes.filter((node) =>
          isMapNodeAvailable(
            node,
            state.run!.currentNodeId,
            state.run!.completedNodeIds,
            effectiveMapEdges(state.run!),
          ),
        )
        .sort(
          (left, right) =>
            routeScore(right, state.run!, policy) - routeScore(left, state.run!, policy),
        );
      return available[0] ? { type: "VISIT_NODE", nodeId: available[0].id } : undefined;
    }
    case "report":
      return { type: "CONTINUE_REPORT" };
    case "reward": {
      const cardId = [...(state.run.pendingCardReward?.cardIds ?? [])].sort(
        (left, right) =>
          cardRewardScore(right, scenario, state.run!) -
          cardRewardScore(left, scenario, state.run!),
      )[0];
      return cardId && cardRewardScore(cardId, scenario, state.run) >= 8
        ? { type: "CHOOSE_CARD_REWARD", cardId }
        : { type: "SKIP_CARD_REWARD" };
    }
    case "tool-reward": {
      const toolId = [...(state.run.pendingToolReward?.toolIds ?? [])].sort(
        (left, right) =>
          toolScore(right, state.run!, scenario) - toolScore(left, state.run!, scenario),
      )[0];
      return toolId ? { type: "CHOOSE_TOOL_REWARD", toolId } : undefined;
    }
    case "event": {
      if (state.screen.resolution) {
        return chooseBestTransition(
          state,
          state.screen.resolution.pending.options.map((option) => ({
            type: "CHOOSE_EVENT_OPTION" as const,
            optionId: option.id,
          })),
          scenario,
          policy,
        );
      }
      return chooseBestTransition(
        state,
        getEvent(state.screen.eventId).choices.map((choice) => ({
          type: "CHOOSE_EVENT" as const,
          choiceId: choice.id,
        })),
        scenario,
        policy,
      );
    }
    case "shop": {
      const shopScreen = state.screen;
      const run = state.run;
      if (run.techDebt >= 3 && run.credits >= shopServicePrices["debt-cleanup"]) {
        return { type: "BUY_SHOP_SERVICE", serviceId: "debt-cleanup" };
      }
      const unboughtTool = [...shopScreen.inventory.toolOffers]
        .filter(
          (offer) =>
            !shopScreen.inventory.purchasedOfferIds.includes(offer.id) &&
            !run.tools.includes(offer.toolId) &&
            run.credits >= offer.price,
        )
        .sort(
          (left, right) =>
            toolScore(right.toolId, run, scenario) - toolScore(left.toolId, run, scenario),
        )[0];
      if (unboughtTool && toolScore(unboughtTool.toolId, run, scenario) >= 20) {
        return { type: "BUY_SHOP_TOOL", offerId: unboughtTool.id };
      }
      const weakest = weakestRefactorTarget(run, scenario);
      if (
        weakest &&
        !shopScreen.inventory.usedServiceIds.includes("refactor") &&
        run.credits >= shopServicePrices.refactor &&
        cardRewardScore(weakest.cardId, scenario, run) < 2
      ) {
        return {
          type: "BUY_SHOP_SERVICE",
          serviceId: "refactor",
          instanceId: weakest.instanceId,
        };
      }
      const unboughtCard = [...shopScreen.inventory.cardOffers]
        .filter(
          (offer) =>
            !shopScreen.inventory.purchasedOfferIds.includes(offer.id) &&
            run.credits >= offer.price,
        )
        .sort(
          (left, right) =>
            cardRewardScore(right.cardId, scenario, run) -
            cardRewardScore(left.cardId, scenario, run),
        )[0];
      if (unboughtCard && cardRewardScore(unboughtCard.cardId, scenario, run) >= 12) {
        return { type: "BUY_SHOP_CARD", offerId: unboughtCard.id };
      }
      const duplicate = run.deck
        .filter(canDuplicateCard)
        .sort(
          (left, right) =>
            cardRewardScore(right.cardId, scenario, run) -
            cardRewardScore(left.cardId, scenario, run),
        )[0];
      if (
        duplicate &&
        !shopScreen.inventory.usedServiceIds.includes("duplicate") &&
        run.credits >= shopServicePrices.duplicate &&
        cardRewardScore(duplicate.cardId, scenario, run) >= 20
      ) {
        return {
          type: "BUY_SHOP_SERVICE",
          serviceId: "duplicate",
          instanceId: duplicate.instanceId,
        };
      }
      return { type: "LEAVE_NODE" };
    }
    case "weekend": {
      const weakest = weakestRefactorTarget(state.run, scenario);
      if (weakest?.cardId === "tech-debt") {
        return { type: "CHOOSE_WEEKEND", choiceId: "refactor", instanceId: weakest.instanceId };
      }
      if (
        state.run.morale <= state.run.maxMorale - 3 &&
        !getWeekendChoiceState("rest", state.run).disabledReason
      ) {
        return { type: "CHOOSE_WEEKEND", choiceId: "rest" };
      }
      if (weakest && cardRewardScore(weakest.cardId, scenario, state.run) < 2) {
        return {
          type: "CHOOSE_WEEKEND",
          choiceId: "refactor",
          instanceId: weakest.instanceId,
        };
      }
      const draftCardId = [...getWeekendSquadDraftCardIds(state.run, state.screen.nodeId)].sort(
        (left, right) =>
          cardRewardScore(right, scenario, state.run!) -
          cardRewardScore(left, scenario, state.run!),
      )[0];
      if (
        draftCardId &&
        !getWeekendChoiceState("squad-draft", state.run, state.screen.nodeId).disabledReason
      ) {
        return { type: "CHOOSE_WEEKEND", choiceId: "squad-draft", cardId: draftCardId };
      }
      return !getWeekendChoiceState("side-gig", state.run).disabledReason
        ? { type: "CHOOSE_WEEKEND", choiceId: "side-gig" }
        : undefined;
    }
    case "title":
      return { type: "START_RUN", seed: state.run.seed };
    case "retro":
    case "cycle":
      return undefined;
  }
}

function nextCycleAction(
  state: GameState,
  policy: PlaytestPolicy,
  metrics: PlaytestMetrics,
  scenario: PlaytestScenario,
): GameAction | undefined {
  const cycle = state.run?.cycle;
  if (state.screen.name !== "cycle" || !state.run || !cycle) return undefined;
  if (cycle.boss?.transitionNotice) return { type: "ACKNOWLEDGE_BOSS_TRANSITION" };
  if (cycle.pendingCardChoice) {
    const instance = [...cycle.hand].sort(
      (left, right) =>
        cardRewardScore(right.cardId, scenario, state.run!) -
        cardRewardScore(left.cardId, scenario, state.run!),
    )[0];
    return instance ? { type: "CHOOSE_CYCLE_CARD", instanceId: instance.instanceId } : undefined;
  }

  if (cycle.cardsPlayedThisDay >= maxCardPlaysPerDay) {
    metrics.loopGuardTrips += 1;
    return { type: "END_DAY" };
  }
  const planned = choosePlannedCycleAction(state, policy, scenario);
  if (planned?.type === "END_DAY" && cycle.hand.length > 0 && cycle.focus > 0) {
    metrics.deadHands += 1;
  }
  return planned;
}

export function simulatePlaytestRun(
  scenario: PlaytestScenario,
  seed: number,
  policy: PlaytestPolicy = "balanced",
  deckMode: PlaytestDeckMode = "starter",
): PlaytestRunResult {
  const metrics = createPlaytestMetrics();
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of scenario.squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (deckMode === "showcase") state = createBonusDeck(state, scenario);

  while (state.screen.name !== "retro" && metrics.actions < maxRunActions) {
    const action =
      state.screen.name === "cycle"
        ? nextCycleAction(state, policy, metrics, scenario)
        : nextNonCycleAction(state, scenario, policy);
    if (!action) break;
    const next = gameReducer(state, action);
    if (next === state) break;
    updatePlaytestMetrics(metrics, state, action, next);
    state = next;
  }

  const stalled = state.screen.name !== "retro";
  const terminalScreen = state.screen.name === "retro" ? state.screen : undefined;
  if (metrics.actions >= maxRunActions) metrics.loopGuardTrips += 1;
  return {
    schemaVersion: 1,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    policy,
    deckMode,
    seed,
    squad: [...scenario.squad],
    bossId: state.run?.selectedBossId ?? "unknown",
    outcome: stalled ? "stalled" : (terminalScreen?.outcome ?? "stalled"),
    cause: stalled ? `stalled-on-${state.screen.name}` : terminalScreen?.cause,
    ...metrics,
    endingMorale: state.run?.morale ?? 0,
    endingTechDebt: state.run?.techDebt ?? 0,
    tools: state.run?.tools ?? [],
    deckSize: state.run?.deck.length ?? 0,
    finalDeck: summarizePlaytestDeck(state.run?.deck ?? []),
  };
}

export function runPlaytestBatch(options: {
  runsPerScenario: number;
  seed: number;
  policy?: PlaytestPolicy;
  deckMode?: PlaytestDeckMode;
  scenarioIds?: readonly string[];
  scenarios?: readonly PlaytestScenario[];
}): PlaytestRunResult[] {
  const catalogue = options.scenarios ?? playtestScenarios;
  const scenarios = options.scenarioIds?.length
    ? catalogue.filter((scenario) => options.scenarioIds?.includes(scenario.id))
    : catalogue;
  return scenarios.flatMap((scenario, scenarioIndex) =>
    Array.from({ length: options.runsPerScenario }, (_, runIndex) =>
      simulatePlaytestRun(
        scenario,
        options.seed + scenarioIndex * 10_000 + runIndex,
        options.policy ?? "balanced",
        options.deckMode ?? "starter",
      ),
    ),
  );
}
