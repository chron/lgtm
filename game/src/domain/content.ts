import type {
  CardDefinition,
  CycleDefinition,
  Developer,
  Discipline,
  IntentDefinition,
  MapNode,
} from "./models";

export const developers: readonly Developer[] = [
  {
    id: "paul",
    name: "Paul",
    role: "Prototyper",
    passiveName: "Move Fast",
    passiveRules: "The first card each Day costs 1 less.",
    startingCardId: "vibe-code",
    accent: "oklch(0.68 0.19 31)",
  },
  {
    id: "odin",
    name: "Odin",
    role: "Architect",
    passiveName: "I Have Concerns",
    passiveRules: "The first Review each Day verifies 1 extra Work.",
    startingCardId: "design-review",
    accent: "oklch(0.55 0.19 292)",
  },
  {
    id: "irene",
    name: "Irene",
    role: "Quiet Assassin",
    passiveName: "Heads Down",
    passiveRules: "The first Verified Work card each Day adds 1 extra Work.",
    startingCardId: "already-fixed",
    accent: "oklch(0.61 0.14 167)",
  },
  {
    id: "madi",
    name: "Madi",
    role: "Tinkerer",
    passiveName: "Custom Setup",
    passiveRules: "The first AI-assisted Work card each Day adds 1 extra Work.",
    startingCardId: "agent-swarm",
    accent: "oklch(0.64 0.2 343)",
  },
] as const;

const cards: readonly CardDefinition[] = [
  {
    id: "frontend-3",
    name: "Frontend",
    cost: 1,
    kind: "work",
    discipline: "frontend",
    amount: 3,
    workKind: "verified",
    rules: "Frontend 3",
    tags: ["basic"],
  },
  {
    id: "backend-3",
    name: "Backend",
    cost: 1,
    kind: "work",
    discipline: "backend",
    amount: 3,
    workKind: "verified",
    rules: "Backend 3",
    tags: ["basic"],
  },
  {
    id: "infra-3",
    name: "Infra",
    cost: 1,
    kind: "work",
    discipline: "infra",
    amount: 3,
    workKind: "verified",
    rules: "Infra 3",
    tags: ["basic"],
  },
  {
    id: "flexible-2",
    name: "Flexible",
    cost: 1,
    kind: "work",
    discipline: "flexible",
    amount: 2,
    workKind: "verified",
    rules: "Any 2",
    tags: ["basic", "flexible"],
  },
  {
    id: "review-3",
    name: "Review",
    cost: 1,
    kind: "review",
    amount: 3,
    rules: "Verify 3 on one Task.",
    tags: ["basic", "review"],
  },
  {
    id: "vibe-code",
    ownerId: "paul",
    name: "Vibe Code",
    cost: 1,
    kind: "work",
    discipline: "flexible",
    amount: 4,
    workKind: "unverified",
    rules: "Any 4. Unverified.",
    tags: ["character", "ai-assisted", "flexible"],
  },
  {
    id: "design-review",
    ownerId: "odin",
    name: "Design Review",
    cost: 1,
    kind: "review",
    amount: 5,
    rules: "Verify 5 on one Task.",
    tags: ["character", "review"],
  },
  {
    id: "already-fixed",
    ownerId: "irene",
    name: "Already Fixed",
    cost: 1,
    kind: "work",
    discipline: "flexible",
    amount: 3,
    workKind: "verified",
    rules: "Any 3. Verified.",
    tags: ["character", "automation", "flexible"],
  },
  {
    id: "agent-swarm",
    ownerId: "madi",
    name: "Agent Swarm",
    cost: 1,
    kind: "work",
    discipline: "backend",
    amount: 5,
    workKind: "unverified",
    rules: "Backend 5. Unverified.",
    tags: ["character", "ai-assisted"],
  },
  {
    id: "tech-debt",
    name: "Tech Debt",
    cost: 0,
    kind: "status",
    amount: 0,
    rules: "Unplayable.",
    tags: ["status"],
  },
  {
    id: "distraction",
    name: "Distraction",
    cost: 0,
    kind: "status",
    amount: 0,
    rules: "Unplayable. Gone tomorrow.",
    tags: ["status"],
  },
] as const;

export const starterBasicCardIds = [
  "frontend-3",
  "frontend-3",
  "backend-3",
  "backend-3",
  "infra-3",
  "infra-3",
  "flexible-2",
  "flexible-2",
  "review-3",
] as const;

const cycles: readonly CycleDefinition[] = [
  {
    id: "presence-upgrade",
    name: "Presence Upgrade",
    maxDays: 3,
    tasks: [
      {
        id: "status-composer",
        name: "Status Composer",
        requirements: [
          { discipline: "frontend", target: 5 },
          { discipline: "backend", target: 3 },
        ],
        intents: [
          { kind: "crunch", moraleLoss: 1 },
          { kind: "scope", discipline: "frontend", amount: 2 },
          { kind: "regression", discipline: "backend", amount: 2 },
        ],
      },
      {
        id: "reconnect-logic",
        name: "Reconnect Logic",
        requirements: [
          { discipline: "backend", target: 4 },
          { discipline: "infra", target: 4 },
        ],
        intents: [
          { kind: "interruption" },
          { kind: "blocked", discipline: "backend" },
          { kind: "crunch", moraleLoss: 1 },
        ],
      },
    ],
  },
] as const;

export const mapNodes: readonly MapNode[] = [
  {
    id: "cycle-1",
    kind: "cycle",
    title: "Presence Upgrade",
    cycleId: "presence-upgrade",
  },
  { id: "event-1", kind: "event", title: "Scope Creep" },
  { id: "shop-1", kind: "shop", title: "Tool Budget" },
  { id: "retro-1", kind: "retro", title: "Release" },
] as const;

export function getDeveloper(id: Developer["id"]): Developer {
  const developer = developers.find((candidate) => candidate.id === id);
  if (!developer) throw new Error(`Unknown developer: ${id}`);
  return developer;
}

export function getCard(id: string): CardDefinition {
  const card = cards.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}

export function getCycle(id: string): CycleDefinition {
  const cycle = cycles.find((candidate) => candidate.id === id);
  if (!cycle) throw new Error(`Unknown cycle: ${id}`);
  return cycle;
}

export function disciplineLabel(discipline: Discipline): string {
  return discipline === "infra"
    ? "Infra"
    : `${discipline.slice(0, 1).toUpperCase()}${discipline.slice(1)}`;
}

export function formatIntent(intent: IntentDefinition): string {
  switch (intent.kind) {
    case "scope":
      return `Scope · ${disciplineLabel(intent.discipline)} +${intent.amount}`;
    case "regression":
      return `Regression · ${disciplineLabel(intent.discipline)} −${intent.amount}`;
    case "blocked":
      return `Blocked · ${disciplineLabel(intent.discipline)}`;
    case "interruption":
      return "Interruption · +1 Distraction";
    case "crunch":
      return `Crunch · −${intent.moraleLoss} Morale`;
  }
}
