import type {
  CardDefinition,
  CardInstance,
  CycleDefinition,
  Developer,
  Discipline,
  IntentDefinition,
  MapEdge,
  MapNode,
  ToolDefinition,
} from "./models";
import {
  characterGeneratedCards,
  characterRewardCards,
  characterStartingCards,
  developers,
} from "./characters";

export { developers } from "./characters";

export const tools: readonly ToolDefinition[] = [
  {
    id: "pairing-session",
    name: "Pairing Session",
    symbol: "<>⃝",
    rules: "All Pitch In Work is Verified.",
  },
  {
    id: "ci-runner",
    name: "CI Runner",
    symbol: "▶",
    rules: "Scripts run immediately when installed.",
  },
  {
    id: "test-suite",
    name: "Test Suite",
    symbol: "✓✓",
    rules: "Whenever you Review Work, gain that much Block.",
  },
  {
    id: "error-budget",
    name: "Error Budget",
    symbol: "∞",
    rules: "Unspent Block carries between Days.",
  },
  {
    id: "merge-queue",
    name: "Merge Queue",
    symbol: "⇉",
    rules: "Whenever you ship a Task, draw 2 cards and gain 1 Focus.",
  },
  {
    id: "noise-cancelling-headphones",
    name: "Noise-Cancelling Headphones",
    symbol: "◖◗",
    rules: "Every Distraction drawn is discarded and replaced.",
  },
  {
    id: "enterprise-ai-licence",
    name: "Enterprise AI Licence",
    symbol: "AI+",
    rules: "AI Assisted cards add 2 extra Work and 1 Tech Debt.",
  },
  {
    id: "cron-upgrade",
    name: "Cron Upgrade",
    symbol: "×2",
    rules: "Scripts run twice.",
  },
  {
    id: "cat-tax",
    name: "Cat Tax",
    symbol: "=^•⟩•^=",
    rules: "Whenever a Status card is drawn, draw 1 additional card.",
  },
  {
    id: "reef-shark",
    name: "Reef Shark",
    symbol: "▲",
    rules: "Whenever a non-final Task ships, draw 1 card.",
  },
  {
    id: "platypus",
    name: "Platypus",
    symbol: "≋",
    rules: "Script and Guard triggers produce 1 additional Work or Block.",
  },
  {
    id: "pangolin",
    name: "Pangolin",
    symbol: "◉",
    rules: "Whenever a card grants Block, gain 2 additional Block.",
  },
  {
    id: "timezone-wrangler",
    name: "Timezone Wrangler",
    symbol: "UTC",
    rules: "Unspent Focus carries into the next Day.",
  },
] as const;

const toolIds = tools.map((tool) => tool.id);

const eventExclusiveToolIds = [
  "cat-tax",
  "reef-shark",
  "platypus",
  "pangolin",
  "timezone-wrangler",
] as const satisfies readonly ToolDefinition["id"][];

export const standardToolIds = toolIds.filter(
  (toolId) => !eventExclusiveToolIds.some((eventToolId) => eventToolId === toolId),
);

export function getTool(id: ToolDefinition["id"]): ToolDefinition {
  const tool = tools.find((candidate) => candidate.id === id);
  if (!tool) throw new Error(`Unknown Tool: ${id}`);
  return tool;
}

const sharedStarterCards: readonly CardDefinition[] = [
  {
    id: "frontend-3",
    name: "Frontend",
    cost: 1,
    kind: "work",
    discipline: "frontend",
    amount: 3,
    workKind: "unverified",
    rules: "Frontend 3. Unverified.",
    tags: ["basic"],
  },
  {
    id: "backend-3",
    name: "Backend",
    cost: 1,
    kind: "work",
    discipline: "backend",
    amount: 3,
    workKind: "unverified",
    rules: "Backend 3. Unverified.",
    tags: ["basic"],
  },
  {
    id: "infra-3",
    name: "Infra",
    cost: 1,
    kind: "work",
    discipline: "infra",
    amount: 3,
    workKind: "unverified",
    rules: "Infra 3. Unverified.",
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
    id: "standup-cover",
    name: "Standup Cover",
    cost: 1,
    kind: "tactic",
    amount: 0,
    block: 4,
    rules: "Gain 4 Block.",
    tags: ["basic", "defense"],
  },
];

const sharedCards: readonly CardDefinition[] = [
  {
    id: "quick-fix",
    name: "Quick Fix",
    cost: 0,
    kind: "work",
    discipline: "flexible",
    amount: 2,
    workKind: "unverified",
    exhaust: true,
    rules: "Any 2. Unverified. Exhaust.",
    tags: ["ai-assisted", "exhaust", "flexible", "generated"],
  },
  {
    id: "pair-programming",
    name: "Pair Programming",
    cost: 1,
    kind: "work",
    discipline: "flexible",
    amount: 3,
    workKind: "verified",
    rules: "Any 3. Verified.",
    tags: ["flexible", "reward"],
  },
  {
    id: "pixel-perfect",
    name: "UI Polish",
    cost: 1,
    kind: "work",
    discipline: "frontend",
    amount: 5,
    workKind: "verified",
    rules: "Frontend 5.",
    tags: ["reward"],
  },
  {
    id: "boring-api",
    name: "Boring API",
    cost: 1,
    kind: "work",
    discipline: "backend",
    amount: 5,
    workKind: "verified",
    rules: "Backend 5.",
    tags: ["reward"],
  },
  {
    id: "green-build",
    name: "Green Build",
    cost: 1,
    kind: "work",
    discipline: "infra",
    amount: 1,
    workKind: "verified",
    automation: { kind: "install", power: 1 },
    rules: "Infra 1. Install Script 1.",
    tags: ["automation", "reward"],
  },
  {
    id: "quick-script",
    name: "Quick Script",
    cost: 1,
    kind: "work",
    discipline: "flexible",
    amount: 1,
    workKind: "verified",
    automation: { kind: "install", power: 1 },
    rules: "Any 1. Install Script 1.",
    tags: ["automation", "flexible", "reward"],
  },
  {
    id: "cron-job",
    name: "Cron Job",
    cost: 2,
    kind: "work",
    discipline: "flexible",
    amount: 0,
    workKind: "verified",
    automation: { kind: "install", power: 2 },
    rules: "Install Script 2.",
    tags: ["automation", "flexible", "reward"],
  },
  {
    id: "run-it-now",
    name: "Run It Now",
    cost: 1,
    kind: "work",
    discipline: "flexible",
    amount: 0,
    workKind: "verified",
    automation: { kind: "trigger" },
    rules: "Trigger one Script now.",
    tags: ["automation", "flexible", "reward"],
  },
  {
    id: "second-pair-of-eyes",
    name: "Second Pair of Eyes",
    cost: 1,
    kind: "review",
    amount: 5,
    rules: "Verify 5 on one Task.",
    tags: ["review", "reward"],
  },
  {
    id: "protect-the-branch",
    name: "Protect the Branch",
    cost: 1,
    kind: "tactic",
    amount: 0,
    block: 6,
    rules: "Gain 6 Block.",
    tags: ["defense", "reward"],
  },
  {
    id: "error-budget",
    name: "Error Budget",
    cost: 1,
    kind: "tactic",
    amount: 0,
    block: 4,
    rules: "Gain 4 Block.",
    tags: ["defense", "reward"],
  },
  {
    id: "feature-flag",
    name: "Feature Flag",
    cost: 1,
    kind: "tactic",
    amount: 0,
    block: 3,
    stun: true,
    rules: "Gain 3 Block. Stun one intent.",
    tags: ["defense", "stun", "reward"],
  },
  {
    id: "not-reproducible",
    name: "Not Reproducible",
    cost: 1,
    kind: "tactic",
    amount: 0,
    stun: true,
    rules: "Stun one intent.",
    tags: ["stun", "reward"],
  },
  {
    id: "health-check",
    name: "Health Check",
    cost: 1,
    kind: "work",
    discipline: "infra",
    amount: 1,
    workKind: "verified",
    block: 1,
    automation: { kind: "install", power: 0, blockPower: 2 },
    rules: "Infra 1. Gain 1 Block. Install Guard 2.",
    tags: ["automation", "defense", "reward"],
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

export const cards: readonly CardDefinition[] = [
  ...sharedStarterCards,
  ...characterStartingCards,
  ...characterRewardCards,
  ...characterGeneratedCards,
  ...sharedCards,
];

export const squadRewardCardIds = cards
  .filter((card) => card.tags.includes("reward") && card.ownerId)
  .map((card) => card.id);

export const teamRewardCardIds = cards
  .filter((card) => card.tags.includes("reward") && !card.ownerId)
  .map((card) => card.id);

export function eligibleRewardCardIds(squad: readonly Developer["id"][]): string[] {
  return cards
    .filter(
      (card) => card.tags.includes("reward") && (!card.ownerId || squad.includes(card.ownerId)),
    )
    .map((card) => card.id);
}

export const starterBasicCardIds = [
  "standup-cover",
  "flexible-2",
  "frontend-3",
  "backend-3",
  "infra-3",
  "flexible-2",
  "review-3",
] as const;

const cycles: readonly CycleDefinition[] = [
  {
    id: "quick-win",
    name: "Status Refresh",
    maxDays: 5,
    tasks: [
      {
        id: "status-composer",
        name: "Status Composer",
        requirements: [
          { discipline: "frontend", target: 5 },
          { discipline: "backend", target: 3 },
        ],
        intents: [
          { kind: "crunch", moraleLoss: 2 },
          { kind: "scope", discipline: "frontend", amount: 3 },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "regression", discipline: "backend", amount: 2 },
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
    ],
  },
  {
    id: "presence-upgrade",
    name: "Presence Upgrade",
    maxDays: 5,
    tasks: [
      {
        id: "status-composer",
        name: "Status Composer",
        requirements: [
          { discipline: "frontend", target: 5 },
          { discipline: "backend", target: 3 },
        ],
        intents: [
          { kind: "crunch", moraleLoss: 2 },
          { kind: "scope", discipline: "frontend", amount: 4 },
          { kind: "regression", discipline: "backend", amount: 2 },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "scope", discipline: "backend", amount: 3 },
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
          { kind: "crunch", moraleLoss: 2 },
          { kind: "blocked", discipline: "backend" },
          { kind: "scope", discipline: "infra", amount: 3 },
          { kind: "crunch", moraleLoss: 3 },
        ],
      },
    ],
  },
  {
    id: "growth-spurt",
    name: "Growth Spurt",
    maxDays: 5,
    tasks: [
      {
        id: "billing-webhook",
        name: "Billing Webhook",
        requirements: [
          { discipline: "backend", target: 5 },
          { discipline: "infra", target: 4 },
        ],
        intents: [
          { kind: "crunch", moraleLoss: 2 },
          { kind: "regression", discipline: "backend", amount: 3 },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "scope", discipline: "backend", amount: 4 },
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
      {
        id: "onboarding-polish",
        name: "Onboarding Polish",
        requirements: [
          { discipline: "frontend", target: 6 },
          { discipline: "backend", target: 3 },
        ],
        intents: [
          { kind: "interruption" },
          { kind: "scope", discipline: "frontend", amount: 4 },
          { kind: "crunch", moraleLoss: 2 },
          { kind: "regression", discipline: "frontend", amount: 3 },
          { kind: "crunch", moraleLoss: 3 },
        ],
      },
      {
        id: "deploy-pipeline",
        name: "Deploy Pipeline",
        requirements: [{ discipline: "infra", target: 6 }],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "crunch", moraleLoss: 2 },
          { kind: "scope", discipline: "infra", amount: 4 },
          { kind: "interruption" },
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
    ],
  },
  {
    id: "production-incident",
    name: "Production Incident",
    kind: "incident",
    primaryTaskId: "restore-service",
    maxDays: 4,
    tasks: [
      {
        id: "restore-service",
        name: "Restore Service",
        role: "primary",
        requirements: [
          { discipline: "backend", target: 7 },
          { discipline: "infra", target: 7 },
        ],
        intents: [
          { kind: "spawn", taskId: "pager-storm", taskName: "Pager Storm" },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "spawn", taskId: "status-page", taskName: "Status Page" },
          { kind: "crunch", moraleLoss: 5 },
        ],
      },
      {
        id: "pager-storm",
        name: "Pager Storm",
        role: "complication",
        requirements: [{ discipline: "infra", target: 4 }],
        intents: [
          { kind: "interruption" },
          { kind: "interruption" },
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "status-page",
        name: "Status Page",
        role: "complication",
        requirements: [{ discipline: "frontend", target: 4 }],
        intents: [
          { kind: "crunch", moraleLoss: 2 },
          { kind: "scope", discipline: "frontend", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "cascade-incident",
    name: "Cascade Failure",
    kind: "incident",
    primaryTaskId: "stabilise-platform",
    maxDays: 4,
    tasks: [
      {
        id: "stabilise-platform",
        name: "Stabilise Platform",
        role: "primary",
        requirements: [
          { discipline: "frontend", target: 4 },
          { discipline: "backend", target: 8 },
          { discipline: "infra", target: 8 },
        ],
        intents: [
          { kind: "spawn", taskId: "memory-leak", taskName: "Mystery Memory Leak" },
          { kind: "crunch", moraleLoss: 4 },
          { kind: "spawn", taskId: "rollback-needed", taskName: "Rollback Needed" },
          { kind: "crunch", moraleLoss: 6 },
        ],
      },
      {
        id: "memory-leak",
        name: "Mystery Memory Leak",
        role: "complication",
        requirements: [{ discipline: "infra", target: 5 }],
        intents: [
          { kind: "scope", discipline: "infra", amount: 3 },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "scope", discipline: "infra", amount: 3 },
        ],
      },
      {
        id: "rollback-needed",
        name: "Rollback Needed",
        role: "complication",
        requirements: [
          { discipline: "backend", target: 4 },
          { discipline: "infra", target: 3 },
        ],
        intents: [
          { kind: "blocked", discipline: "backend" },
          { kind: "crunch", moraleLoss: 3 },
        ],
      },
    ],
  },
  {
    id: "final-release",
    name: "Final Release",
    maxDays: 5,
    tasks: [
      {
        id: "final-release",
        name: "Final Release",
        requirements: [
          { discipline: "frontend", target: 10 },
          { discipline: "backend", target: 10 },
          { discipline: "infra", target: 10 },
        ],
        intents: [
          { kind: "crunch", moraleLoss: 3 },
          { kind: "scope", discipline: "backend", amount: 5 },
          { kind: "crunch", moraleLoss: 4 },
          { kind: "scope", discipline: "infra", amount: 5 },
          { kind: "crunch", moraleLoss: 6 },
        ],
      },
    ],
  },
] as const;

export const mapNodes: readonly MapNode[] = [
  {
    id: "cycle-1",
    kind: "cycle",
    title: "Status Refresh",
    cycleId: "quick-win",
    position: { x: 50, y: 4 },
  },
  {
    id: "event-1",
    kind: "event",
    title: "Scope Creep",
    position: { x: 26, y: 12 },
  },
  {
    id: "cycle-optional-1",
    kind: "cycle",
    title: "Quick Detour",
    cycleId: "quick-win",
    position: { x: 74, y: 12 },
  },
  {
    id: "cycle-2",
    kind: "cycle",
    title: "Release Candidate",
    cycleId: "presence-upgrade",
    position: { x: 50, y: 20 },
  },
  {
    id: "incident-1",
    kind: "incident",
    title: "Production Incident",
    cycleId: "production-incident",
    position: { x: 50, y: 28 },
  },
  {
    id: "shop-1",
    kind: "shop",
    title: "Tool Budget",
    position: { x: 26, y: 36 },
  },
  {
    id: "event-2",
    kind: "event",
    title: "One Tiny Thing",
    position: { x: 74, y: 36 },
  },
  {
    id: "cycle-3",
    kind: "cycle",
    title: "Growth Spurt",
    cycleId: "growth-spurt",
    position: { x: 50, y: 45 },
  },
  {
    id: "event-3",
    kind: "event",
    title: "Can We Sneak This In?",
    position: { x: 26, y: 54 },
  },
  {
    id: "cycle-optional-2",
    kind: "cycle",
    title: "Stretch Goal",
    cycleId: "growth-spurt",
    position: { x: 74, y: 54 },
  },
  {
    id: "cycle-4",
    kind: "cycle",
    title: "Hardening Pass",
    cycleId: "growth-spurt",
    position: { x: 50, y: 63 },
  },
  {
    id: "incident-2",
    kind: "incident",
    title: "Everything Is Fine",
    cycleId: "cascade-incident",
    position: { x: 50, y: 72 },
  },
  {
    id: "shop-2",
    kind: "shop",
    title: "Emergency Budget",
    position: { x: 26, y: 81 },
  },
  {
    id: "event-4",
    kind: "event",
    title: "Ship It Friday",
    position: { x: 74, y: 81 },
  },
  {
    id: "final-release",
    kind: "boss",
    title: "Final Release",
    cycleId: "final-release",
    position: { x: 50, y: 89 },
  },
  {
    id: "retro-1",
    kind: "retro",
    title: "Release",
    position: { x: 50, y: 97 },
  },
] as const;

export const mapEdges: readonly MapEdge[] = [
  { fromNodeId: "cycle-1", toNodeId: "event-1" },
  { fromNodeId: "cycle-1", toNodeId: "cycle-optional-1" },
  { fromNodeId: "event-1", toNodeId: "cycle-2" },
  { fromNodeId: "cycle-optional-1", toNodeId: "cycle-2" },
  { fromNodeId: "cycle-2", toNodeId: "incident-1" },
  { fromNodeId: "incident-1", toNodeId: "shop-1" },
  { fromNodeId: "incident-1", toNodeId: "event-2" },
  { fromNodeId: "shop-1", toNodeId: "cycle-3" },
  { fromNodeId: "event-2", toNodeId: "cycle-3" },
  { fromNodeId: "cycle-3", toNodeId: "event-3" },
  { fromNodeId: "cycle-3", toNodeId: "cycle-optional-2" },
  { fromNodeId: "event-3", toNodeId: "cycle-4" },
  { fromNodeId: "cycle-optional-2", toNodeId: "cycle-4" },
  { fromNodeId: "cycle-4", toNodeId: "incident-2" },
  { fromNodeId: "incident-2", toNodeId: "shop-2" },
  { fromNodeId: "incident-2", toNodeId: "event-4" },
  { fromNodeId: "shop-2", toNodeId: "final-release" },
  { fromNodeId: "event-4", toNodeId: "final-release" },
  { fromNodeId: "final-release", toNodeId: "retro-1" },
] as const;

export function isMapNodeAvailable(
  node: MapNode,
  currentNodeId: string | null,
  completedNodeIds: readonly string[],
  edges: readonly MapEdge[] = mapEdges,
): boolean {
  if (completedNodeIds.includes(node.id)) return false;
  if (!currentNodeId) {
    return !edges.some((edge) => edge.toNodeId === node.id);
  }
  return edges.some((edge) => edge.fromNodeId === currentNodeId && edge.toNodeId === node.id);
}

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

export function getCardForInstance(instance: CardInstance): CardDefinition {
  return instance.dynamicDefinition ?? getCard(instance.cardId);
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
      return "+1 Distraction";
    case "crunch":
      return `Crunch · −${intent.moraleLoss} Morale`;
    case "spawn":
      return `Spawn · ${intent.taskName}`;
  }
}

export function describeIntent(intent: IntentDefinition): string {
  const consequence = (() => {
    switch (intent.kind) {
      case "scope":
        return `Adds ${intent.amount} ${disciplineLabel(intent.discipline)} Work to this Task.`;
      case "regression":
        return `Removes up to ${intent.amount} ${disciplineLabel(intent.discipline)} Work from this Task.`;
      case "blocked":
        return `${disciplineLabel(intent.discipline)} cards cost 1 extra Focus next Day.`;
      case "interruption":
        return "Adds 1 Distraction to tomorrow's draw.";
      case "crunch":
        return `Deals ${intent.moraleLoss} Morale damage. Block absorbs it first.`;
      case "spawn":
        return `Adds ${intent.taskName} as a new Complication Task.`;
    }
  })();

  return `${consequence} Ship this Task or Stun its intent before End Day to stop it.`;
}
