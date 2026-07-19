export type DeveloperId = "paul" | "odin" | "irene" | "madi";

export type CharacterMood = "idle" | "thinking" | "success";

type CharacterArtwork = Readonly<Record<CharacterMood, string>>;

export type Discipline = "frontend" | "backend" | "infra";
export type WorkKind = "verified" | "unverified";
export type ToolId =
  | "pairing-session"
  | "ci-runner"
  | "test-suite"
  | "error-budget"
  | "merge-queue"
  | "noise-cancelling-headphones"
  | "enterprise-ai-licence"
  | "cron-upgrade";
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
  generatedCards?: { cardId: string; count: number };
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
  scriptPowerPerIncompleteRequirement?: number;
  triggerTargetScriptAfterWork?: boolean;
  fullStackAdded?: number;
  spawnSideQuest?: boolean;
  display?: { value: string; label: string; rules?: string };
  rarity?: "normal" | "rare";
  rules: string;
  tags: readonly CardTag[];
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
  temporary?: boolean;
  generated?: boolean;
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
  intents: readonly IntentDefinition[];
}

export interface CycleDefinition {
  id: string;
  name: string;
  kind?: "incident";
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
  role?: "primary" | "complication" | "side-quest";
  status: "open" | "ready" | "shipped";
  stunned: boolean;
  spawnedDay: number;
  prototypeReward?: number;
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
  prototypePower: number;
  fullStackPower: number;
  cardTagWorkBonuses: Partial<Record<CardTag, number>>;
  dayWorkBonuses: readonly { amount: number; excludedTags: readonly CardTag[] }[];
  reviewStunFocusBonus: number;
  lastWorkDiscipline?: Discipline;
  queuedDistractions: number;
  queuedCardsDrawn: number;
  defects: number;
  techDebtAdded: number;
}

interface CardRewardState {
  sourceNodeId: string;
  cardIds: readonly [string, string, string];
}

interface ToolRewardState {
  sourceNodeId: string;
  toolIds: readonly ToolId[];
}

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
    }
  | { kind: "card-skipped"; sourceNodeId: string }
  | { kind: "tool-added"; toolId: ToolId; sourceNodeId: string };

export interface RunState {
  seed: number;
  rngState: number;
  squad: DeveloperId[];
  deck: CardInstance[];
  nextCardInstanceId: number;
  tools: ToolId[];
  morale: number;
  techDebt: number;
  credits: number;
  currentNodeId: string | null;
  completedNodeIds: string[];
  cycle: CycleState | null;
  pendingCardReward: CardRewardState | null;
  pendingToolReward: ToolRewardState | null;
  history: RunHistoryEvent[];
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
}

export type MapNodeKind = "cycle" | "incident" | "boss" | "event" | "shop" | "retro";

interface MapPosition {
  x: number;
  y: number;
}

export interface MapNode {
  id: string;
  kind: MapNodeKind;
  title: string;
  cycleId?: string;
  position: MapPosition;
}

export interface MapEdge {
  fromNodeId: string;
  toNodeId: string;
}
