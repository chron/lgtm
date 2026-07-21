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
import { getActMap } from "./actMap";
import { authoredCycleCatalogue, selectEncounterLineup } from "./encounters";
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
    rules: "Mismatched Work contributes 1 Verified instead of 1 Unverified.",
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
    id: "garbage-collector",
    name: "Garbage Collector",
    symbol: "♻",
    rules: "Whenever a card Exhausts, draw 1 card.",
  },
  {
    id: "institutional-knowledge",
    name: "Institutional Knowledge",
    symbol: "IK",
    rules: "Whenever you draw Tech Debt, gain 1 Focus.",
  },
  {
    id: "definition-of-done",
    name: "Definition of Done",
    symbol: "✓!",
    rules: "Whenever Verified Work completes a requirement, gain 2 Block.",
  },
  {
    id: "pomodoro-timer",
    name: "Pomodoro Timer",
    symbol: "25",
    rules: "Whenever Chain reaches a multiple of 3, draw 1 card.",
  },
  {
    id: "t-shaped-team",
    name: "T-Shaped Team",
    symbol: "T",
    rules: "Flexible Work cards add 1 additional Work.",
  },
  {
    id: "venture-debt",
    name: "Venture Debt",
    symbol: "$↗",
    rules: "Whenever you gain Tech Debt, gain $10 for each point.",
  },
  {
    id: "healthy-runway",
    name: "Healthy Runway",
    symbol: "$$",
    rules: "Start each Cycle with 1 additional Focus for every $50 held.",
  },
  {
    id: "boilerplate-generator",
    name: "Boilerplate Generator",
    symbol: "{…}",
    rules: "Whenever a card generates cards, also generate a Snippet.",
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
    id: "snippet",
    name: "Snippet",
    cost: 0,
    kind: "work",
    discipline: "flexible",
    amount: 1,
    workKind: "verified",
    exhaust: true,
    rules: "Any 1. Verified. Exhaust.",
    tags: ["exhaust", "flexible", "generated"],
  },
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
    id: "checklist",
    name: "Checklist",
    cost: 0,
    kind: "tactic",
    amount: 0,
    block: 1,
    exhaust: true,
    rules: "Gain 1 Block. Exhaust.",
    tags: ["defense", "exhaust", "generated"],
  },
  {
    id: "comment",
    name: "Comment",
    cost: 0,
    kind: "review",
    amount: 1,
    exhaust: true,
    rules: "Verify 1. Exhaust.",
    tags: ["exhaust", "generated", "review"],
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
    id: "ui-polish",
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
    amount: 2,
    workKind: "verified",
    automation: { kind: "install", power: 1 },
    rules: "Infra 2. Install Script 1.",
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
    automation: { kind: "install", power: 3 },
    rules: "Install Script 3.",
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
    rules: "Gain 3 Block. Cancel one Task's End Day effect.",
    tags: ["defense", "stun", "reward"],
  },
  {
    id: "not-reproducible",
    name: "Not Reproducible",
    cost: 1,
    kind: "tactic",
    amount: 0,
    stun: true,
    rules: "Cancel one Task's End Day effect.",
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
    id: "copy-paste",
    name: "Copy/Paste",
    cost: 2,
    kind: "tactic",
    amount: 0,
    copyNextCardEffect: true,
    exhaust: true,
    display: { value: "×2", label: "Next", rules: "The next card's direct effect happens twice." },
    rarity: "rare",
    rules: "The next card's direct effect happens twice. Exhaust.",
    tags: ["exhaust", "rare", "reward"],
  },
  {
    id: "all-hands",
    name: "All Hands",
    cost: 2,
    kind: "tactic",
    amount: 0,
    verifiedWorkPerOpenTask: 4,
    exhaust: true,
    display: { value: "4", label: "Each", rules: "Add 4 Verified Work to every open Task." },
    rarity: "rare",
    rules: "Add 4 Verified Work to every open Task's smallest requirement. Exhaust.",
    tags: ["exhaust", "rare", "reward"],
  },
  {
    id: "deploy-train",
    name: "Deploy Train",
    cost: 2,
    kind: "tactic",
    amount: 0,
    triggerEveryAutomation: true,
    exhaust: true,
    display: {
      value: "▶",
      label: "All",
      rules: "Trigger every Script and the squad's Guard once.",
    },
    rarity: "rare",
    rules: "Trigger every Script and the squad's Guard once. Exhaust.",
    tags: ["automation", "exhaust", "rare", "reward"],
  },
  {
    id: "review-blitz",
    name: "Review Blitz",
    cost: 2,
    kind: "review",
    amount: 0,
    reviewEveryTask: true,
    reviewAllUnverified: true,
    exhaust: true,
    display: {
      value: "ALL",
      label: "Verify",
      rules: "Verify all Unverified Work on every open Task.",
    },
    rarity: "rare",
    rules: "Verify all Unverified Work on every open Task. Exhaust.",
    tags: ["exhaust", "rare", "review", "reward"],
  },
  {
    id: "open-source-it",
    name: "Open Source It",
    cost: 2,
    kind: "tactic",
    amount: 0,
    generatedCards: [
      { cardId: "snippet", count: 1 },
      { cardId: "quick-fix", count: 1 },
      { cardId: "checklist", count: 1 },
      { cardId: "comment", count: 1 },
    ],
    exhaust: true,
    display: { value: "4", label: "Generate", rules: "Generate one of every shared card." },
    rarity: "rare",
    rules: "Generate a Snippet, Quick Fix, Checklist, and Comment. Exhaust.",
    tags: ["exhaust", "rare", "reward"],
  },
  {
    id: "known-shortcut",
    name: "Known Shortcut",
    cost: 2,
    kind: "work",
    discipline: "flexible",
    amount: 3,
    workPerTechDebt: 1,
    workKind: "unverified",
    display: {
      value: "3+",
      label: "Debt",
      rules: "Any 3 plus your current Tech Debt. Unverified.",
    },
    rarity: "rare",
    rules: "Any 3 plus your current Tech Debt. Unverified.",
    tags: ["flexible", "rare", "reward"],
  },
  {
    id: "protected-time",
    name: "Protected Time",
    cost: 2,
    kind: "tactic",
    amount: 0,
    block: 8,
    blockWorkPowerThisDay: 1,
    exhaust: true,
    display: {
      value: "8",
      label: "Block",
      rules: "Gain 8 Block. Block gained later this Day adds Work.",
    },
    rarity: "rare",
    rules: "Gain 8 Block. This Day, whenever you gain Block, add 1 Verified Work. Exhaust.",
    tags: ["defense", "exhaust", "rare", "reward"],
  },
  {
    id: "declare-bankruptcy",
    name: "Declare Bankruptcy",
    cost: 3,
    kind: "tactic",
    amount: 0,
    exhaustAllTechDebtCards: true,
    exhaust: true,
    display: {
      value: "ALL",
      label: "Debt",
      rules: "Exhaust every Tech Debt card this Cycle. Gain 1 Focus each.",
    },
    rarity: "rare",
    rules: "Exhaust every Tech Debt card in your piles this Cycle. Gain 1 Focus for each. Exhaust.",
    tags: ["exhaust", "rare", "reward"],
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
  ...authoredCycleCatalogue,
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
          { discipline: "backend", target: 10 },
          { discipline: "infra", target: 10 },
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
        requirements: [{ discipline: "infra", target: 6 }],
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
        requirements: [{ discipline: "frontend", target: 6 }],
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
          { discipline: "frontend", target: 6 },
          { discipline: "backend", target: 11 },
          { discipline: "infra", target: 11 },
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
        requirements: [{ discipline: "infra", target: 8 }],
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
          { discipline: "backend", target: 7 },
          { discipline: "infra", target: 5 },
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

export { getActMap } from "./actMap";

const defaultActMap = getActMap(0x5eed1234);
export const mapNodes: readonly MapNode[] = defaultActMap.nodes;

export function getMapNodeCycleId(node: MapNode, seed: number): string | undefined {
  if (!node.encounterSlot) return node.cycleId;

  const lineup = selectEncounterLineup(seed);
  if (node.encounterSlot === "safe-incident-1") return lineup.safeIncidents[0];
  if (node.encounterSlot === "safe-incident-2") return lineup.safeIncidents[1];
  return lineup[node.encounterSlot];
}

export function isMapNodeAvailable(
  node: MapNode,
  currentNodeId: string | null,
  completedNodeIds: readonly string[],
  edges: readonly MapEdge[] = defaultActMap.edges,
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
    case "ai-assist":
      return `AI Assist · ${disciplineLabel(intent.discipline)} +${intent.amount} Unverified`;
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
      case "ai-assist":
        return `Adds ${intent.amount} Unverified ${disciplineLabel(intent.discipline)} Work to this Task.`;
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

  return `${consequence} This happens if the Task is still open when you End Day. Shipping or cancelling the Task stops it.`;
}
