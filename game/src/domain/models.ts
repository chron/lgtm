export type DeveloperId = "paul" | "odin" | "irene" | "madi";

export type CharacterMood = "idle" | "thinking" | "success";

type CharacterArtwork = Readonly<Record<CharacterMood, string>>;

export type Discipline = "frontend" | "backend" | "infra";
export type WorkKind = "verified" | "unverified";
type CardKind = "work" | "review" | "status";
type CardTag =
  | "ai-assisted"
  | "automation"
  | "basic"
  | "character"
  | "flexible"
  | "review"
  | "status";

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
  rules: string;
  tags: readonly CardTag[];
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
  temporary?: boolean;
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
  | { kind: "crunch"; moraleLoss: number };

interface TaskDefinition {
  id: string;
  name: string;
  requirements: readonly RequirementDefinition[];
  intents: readonly IntentDefinition[];
}

export interface CycleDefinition {
  id: string;
  name: string;
  maxDays: number;
  tasks: readonly TaskDefinition[];
}

export interface RequirementState {
  discipline: Discipline;
  target: number;
  verified: number;
  unverified: number;
}

export interface TaskState {
  taskId: string;
  requirements: RequirementState[];
}

export interface CycleState {
  nodeId: string;
  cycleId: string;
  startingMorale: number;
  day: number;
  focus: number;
  tasks: TaskState[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  blockedDisciplines: Discipline[];
  triggeredPassiveIds: DeveloperId[];
  resolvedIntents: string[];
  temporaryCardCounter: number;
}

export interface RunState {
  squad: DeveloperId[];
  deck: CardInstance[];
  tools: string[];
  morale: number;
  credits: number;
  completedNodeIds: string[];
  cycle: CycleState | null;
}

interface TaskReport {
  taskId: string;
  name: string;
  completed: boolean;
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
  techDebtAdded: boolean;
  resolvedIntents: string[];
}

export type MapNodeKind = "cycle" | "event" | "shop" | "retro";

export interface MapNode {
  id: string;
  kind: MapNodeKind;
  title: string;
  cycleId?: string;
  predecessorNodeIds: readonly string[];
}
