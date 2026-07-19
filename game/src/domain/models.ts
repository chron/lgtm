export type DeveloperId =
  | "paul"
  | "odin"
  | "irene"
  | "madi"
  | "seb"
  | "toby"
  | "steph"
  | "elspeth"
  | "kirsten"
  | "matt"
  | "nick"
  | "levi";

export type CharacterMood = "idle" | "thinking" | "success";

type CharacterArtwork = Readonly<Record<CharacterMood, string>>;

export type Discipline = "frontend" | "backend" | "infra";
export type WorkKind = "verified" | "unverified";
export type EncounterTier = "early" | "mid" | "late" | "safe-incident";
export type EncounterShape = "balanced" | "tall" | "wide" | "crunch" | "verification" | "volatile";
export type ToolId =
  | "pairing-session"
  | "ci-runner"
  | "test-suite"
  | "error-budget"
  | "merge-queue"
  | "noise-cancelling-headphones"
  | "enterprise-ai-licence"
  | "cron-upgrade"
  | "cat-tax"
  | "reef-shark"
  | "platypus"
  | "pangolin"
  | "timezone-wrangler";
type CardKind = "work" | "review" | "tactic" | "status";
export type CardTag =
  | "ai-assisted"
  | "automation"
  | "basic"
  | "character"
  | "defense"
  | "exhaust"
  | "flexible"
  | "generated"
  | "rare"
  | "review"
  | "reward"
  | "status"
  | "stun";

export interface Developer {
  id: DeveloperId;
  name: string;
  role: string;
  passiveName: string;
  passiveRules: string;
  startingCardId: string;
  accent: string;
  art: CharacterArtwork;
}

export interface CardDefinition {
  id: string;
  ownerId?: DeveloperId;
  name: string;
  cost: number;
  kind: CardKind;
  discipline?: Discipline | "flexible";
  amount: number;
  workKind?: WorkKind;
  block?: number;
  blockPerCardPlayed?: number;
  stun?: boolean;
  automation?: { kind: "install"; power: number; blockPower?: number } | { kind: "trigger" };
  exhaust?: boolean;
  generatedCards?: { cardId: string; count: number } | readonly { cardId: string; count: number }[];
  focusGained?: number;
  cardsDrawn?: number;
  nextDayCardsDrawn?: number;
  techDebtAdded?: number;
  queuedDistractions?: number;
  cycleWorkBonus?: { tag: CardTag; amount: number };
  dayWorkBonus?: { amount: number; excludedTags?: readonly CardTag[] };
  dayReviewStunFocusBonus?: number;
  discardedHandTags?: readonly CardTag[];
  bonusWorkIfTaskStunned?: number;
  reviewEveryTask?: boolean;
  cardsDrawnPerReviewStun?: number;
  retain?: boolean;
  maxTargetRemaining?: number;
  focusOnRequirementComplete?: number;
  spilloverVerifiedOnCompletion?: number;
  generateLastWorkCopy?: boolean;
  generateLastNonGeneratedCopy?: boolean;
  retrieveGeneratedFromExhaust?: boolean;
  exhaustHandTarget?: boolean;
  retainHandTarget?: boolean;
  targetCostReduction?: number;
  exhaustHandTags?: readonly CardTag[];
  exhaustOtherHand?: boolean;
  drawEntireDrawPile?: boolean;
  returnDrawnToTop?: number;
  blockPerExhaustedThisDay?: number;
  workPerRetainedCard?: number;
  amountPerGeneratedCardPlayed?: number;
  focusPerGeneratedCardsPlayed?: number;
  additionalChain?: number;
  drawIfContinuesChain?: number;
  blockPerChain?: number;
  generatedCardsPerChain?: { cardId: string; divisor: number };
  doubleChain?: boolean;
  transferChainThisDay?: boolean;
  completeRequirementsAtMost?: number;
  scriptPowerPerIncompleteRequirement?: number;
  triggerTargetScriptAfterWork?: boolean;
  fullStackAdded?: number;
  spawnSideQuest?: boolean;
  frontendSpreadToOtherTasks?: number;
  frontendWorkToEveryTask?: number;
  extraSharedComponentsOnCompletion?: number;
  workPerOtherIncompleteFrontendTask?: number;
  frontendSpreadIfTaskClean?: number;
  scriptPowerOnEveryIncompleteFrontend?: number;
  triggerInstalledScripts?: boolean;
  cardsDrawnOnRequirementComplete?: number;
  blockPerFinishingTouchesReview?: number;
  focusIfTaskFullyVerified?: number;
  cardsDrawnIfTaskFullyVerified?: number;
  blockPerCompletedRequirement?: number;
  finishingTouchesEveryTask?: boolean;
  cardsDrawnPerTaskCleaned?: number;
  display?: { value: string; label: string; rules?: string };
  rarity?: "normal" | "rare";
  rules: string;
  tags: readonly CardTag[];
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
  dynamicDefinition?: CardDefinition;
  temporary?: boolean;
  generated?: boolean;
  generatedBy?: {
    sourceCardId: string;
    sourceInstanceId: string;
    day: number;
  };
  exhausted?: {
    day: number;
    cause: "played" | "effect";
    sourceCardId?: string;
  };
  retained?: boolean;
  costReduction?: number;
}

export interface ToolDefinition {
  id: ToolId;
  name: string;
  symbol: string;
  rules: string;
}

interface RequirementDefinition {
  discipline: Discipline;
  target: number;
}

export type IntentDefinition =
  | { kind: "ai-assist"; discipline: Discipline; amount: number }
  | { kind: "scope"; discipline: Discipline; amount: number }
  | { kind: "regression"; discipline: Discipline; amount: number }
  | { kind: "blocked"; discipline: Discipline }
  | { kind: "interruption" }
  | { kind: "crunch"; moraleLoss: number }
  | { kind: "spawn"; taskId: string; taskName: string };

export interface TaskDefinition {
  id: string;
  name: string;
  role?: "primary" | "complication";
  requirements: readonly RequirementDefinition[];
  intents: readonly (IntentDefinition | null)[];
}

export interface CycleDefinition {
  id: string;
  name: string;
  kind?: "incident";
  tier?: EncounterTier;
  shape?: EncounterShape;
  primaryTaskId?: string;
  maxDays: number;
  tasks: readonly TaskDefinition[];
}

export interface RequirementState {
  discipline: Discipline;
  target: number;
  verified: number;
  unverified: number;
  scriptPower: number;
  scriptBlock: number;
}

export interface TaskState {
  taskId: string;
  name?: string;
  role?: "primary" | "complication" | "side-quest" | "bounty";
  status: "open" | "ready" | "shipped";
  stunned: boolean;
  spawnedDay: number;
  prototypeReward?: number;
  bountyReward?: EventBountyReward;
  requirements: RequirementState[];
}

export interface CycleState {
  nodeId: string;
  cycleId: string;
  startingMorale: number;
  day: number;
  focus: number;
  block: number;
  tasks: TaskState[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  blockedDisciplines: Discipline[];
  triggeredPassiveIds: DeveloperId[];
  resolvedIntents: string[];
  temporaryCardCounter: number;
  sideQuestCounter: number;
  cardsPlayedThisDay: number;
  cardsPlayedThisCycle: number;
  generatedCardsPlayedThisDay: number;
  generatedCardsPlayedThisCycle: number;
  cardsExhaustedThisDay: number;
  cardsExhaustedThisCycle: number;
  lastPlayedCard?: {
    cardId: string;
    instanceId: string;
    generated: boolean;
  };
  lastNonGeneratedCard?: {
    definition: CardDefinition;
    sourceInstanceId: string;
  };
  lastTargetedTaskId?: string;
  chain: {
    taskId?: string;
    count: number;
    transfersBetweenTasks: boolean;
  };
  peakChain: number;
  pendingCardChoice?: {
    kind: "return-to-draw";
    remaining: number;
    selected: CardInstance[];
  };
  prototypePower: number;
  fullStackPower: number;
  cardTagWorkBonuses: Partial<Record<CardTag, number>>;
  dayWorkBonuses: readonly { amount: number; excludedTags: readonly CardTag[] }[];
  reviewStunFocusBonus: number;
  polishBudgetPower: number;
  lastWorkCard?: {
    cardId: string;
    discipline: Discipline | "flexible";
    amount: number;
  };
  lastWorkDiscipline?: Discipline;
  queuedDistractions: number;
  queuedCardsDrawn: number;
  intentProtections: Partial<Record<IntentDefinition["kind"], number>>;
  defects: number;
  techDebtAdded: number;
  boss?: BossEncounterState;
}

export type BossPhase = "build" | "stakeholder-review" | "launch-window";

export type BossEffectTarget =
  | { kind: "task"; taskId: string; discipline?: Discipline }
  | {
      kind: "open-requirement";
      order: "most-remaining" | "least-remaining" | "most-progress";
      discipline?: Discipline;
    }
  | { kind: "all-open-tasks"; discipline?: Discipline };

export type BossEffect =
  | {
      kind: "spawn-task";
      task: TaskDefinition;
      requiredForLaunch: boolean;
    }
  | { kind: "scope"; target: BossEffectTarget; amount: number }
  | {
      kind: "work";
      target: BossEffectTarget;
      amount: number;
      workKind: WorkKind;
    }
  | { kind: "regression"; target: BossEffectTarget; amount: number }
  | { kind: "crunch"; moraleLoss: number };

interface QueuedBossEffect {
  id: string;
  phase: BossPhase;
  effect: BossEffect;
}

interface BossTransitionNotice {
  from: BossPhase;
  to: BossPhase;
  title: string;
  summary: string;
  resolvedEffects: readonly string[];
}

export interface BossEncounterState {
  bossId: string;
  phase: BossPhase;
  effectQueue: QueuedBossEffect[];
  requiredSpawnedTaskIds: string[];
  nextEffectId: number;
  transitionNotice?: BossTransitionNotice;
}

interface CardRewardState {
  sourceNodeId: string;
  cardIds: readonly string[];
}

interface ToolRewardState {
  sourceNodeId: string;
  toolIds: readonly ToolId[];
}

export type EventNextCycleModifier =
  | { kind: "opening-focus"; amount: number }
  | { kind: "opening-draw"; amount: number }
  | { kind: "queued-status"; cardId: string; count: number }
  | { kind: "intent-protection"; intentKind: IntentDefinition["kind"]; count: number }
  | { kind: "temporary-guest"; cardId: string };

type EventBountyReward =
  | { kind: "credits"; amount: number }
  | { kind: "tool-offer" }
  | { kind: "rare-card-offer" }
  | { kind: "credits-and-rare-card-offer"; amount: number };

export interface EventBountyTask {
  id: string;
  name: string;
  requirements: readonly RequirementDefinition[];
  reward: EventBountyReward;
}

export interface EventRewardModifier {
  choiceCount?: number;
  guaranteedRarity?: "rare";
  tagsAny?: readonly CardTag[];
  disciplines?: readonly (Discipline | "flexible")[];
}

export type EventMapModifier =
  | { kind: "reveal"; nodeIds: readonly string[] }
  | { kind: "connection"; edge: MapEdge };

type RunHistoryEvent =
  | {
      kind: "cycle-finished";
      nodeId: string;
      outcome: CycleReport["outcome"];
      day: number;
    }
  | {
      kind: "task-shipped";
      nodeId: string;
      taskId: string;
      unverifiedWork?: number;
      defects: number;
      moraleLoss: number;
      techDebtAdded: number;
      focusGained: number;
    }
  | { kind: "card-added"; cardId: string; sourceNodeId: string }
  | {
      kind: "card-played";
      nodeId: string;
      day: number;
      cardId: string;
      taskId?: string;
      discipline?: Discipline;
      label: string;
      generated: boolean;
      generatedByCardId?: string;
      exhausted: boolean;
      cardsPlayedThisDay: number;
      chain?: { taskId: string; count: number };
    }
  | { kind: "card-skipped"; sourceNodeId: string }
  | { kind: "tool-added"; toolId: ToolId; sourceNodeId: string }
  | {
      kind: "event-resolved";
      nodeId: string;
      eventId: string;
      choiceId: string;
      outcome: readonly string[];
    }
  | {
      kind: "weekend-resolved";
      nodeId: string;
      choiceId: "rest" | "refactor" | "side-gig";
      outcome: readonly string[];
    }
  | { kind: "boss-selected"; bossId: string }
  | {
      kind: "boss-phase-changed";
      bossId: string;
      from: BossPhase;
      to: BossPhase;
      day: number;
    }
  | {
      kind: "boss-effect-resolved";
      bossId: string;
      phase: BossPhase;
      effectId: string;
      day: number;
      label: string;
    }
  | {
      kind: "final-release-launched";
      bossId: string;
      day: number;
      unverifiedWork: number;
      defects: number;
      moraleLoss: number;
      outcome: "clean" | "known-issues" | "technically-shipped" | "burned-out";
    };

export interface RunState {
  seed: number;
  rngState: number;
  squad: DeveloperId[];
  deck: CardInstance[];
  nextCardInstanceId: number;
  tools: ToolId[];
  morale: number;
  maxMorale: number;
  techDebt: number;
  credits: number;
  currentNodeId: string | null;
  completedNodeIds: string[];
  cycle: CycleState | null;
  pendingCardReward: CardRewardState | null;
  pendingToolReward: ToolRewardState | null;
  nextCycleModifiers: EventNextCycleModifier[];
  pendingBounties: EventBountyTask[];
  nextRewardModifiers: EventRewardModifier[];
  mapModifiers: EventMapModifier[];
  queuedBountyToolOffers: number;
  history: RunHistoryEvent[];
  selectedBossId: string;
}

interface TaskReport {
  taskId: string;
  name: string;
  completed: boolean;
  cleared: boolean;
  verifiedWork: number;
  unverifiedWork: number;
}

export interface CycleReport {
  nodeId: string;
  cycleName: string;
  outcome: "shipped" | "missed";
  day: number;
  tasks: TaskReport[];
  shippedProgress: number;
  unverifiedProgress: number;
  defects: number;
  moraleDelta: number;
  creditsGained: number;
  techDebtAdded: number;
  toolReward: boolean;
  resolvedIntents: string[];
  cardsPlayed: number;
  generatedCardsPlayed: number;
  cardsExhausted: number;
  peakChain: number;
}

type MapNodeKind = "cycle" | "incident" | "boss" | "event" | "shop" | "weekend" | "retro";

type EncounterLineupSlot =
  | "opener"
  | "early"
  | "tall"
  | "wide"
  | "mid"
  | "late"
  | "safe-incident-1"
  | "safe-incident-2";

interface MapPosition {
  x: number;
  y: number;
}

export interface MapNode {
  id: string;
  kind: MapNodeKind;
  title: string;
  cycleId?: string;
  encounterSlot?: EncounterLineupSlot;
  position: MapPosition;
}

export interface MapEdge {
  fromNodeId: string;
  toNodeId: string;
}
