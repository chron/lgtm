import type {
  CardTag,
  Discipline,
  EventBountyTask,
  EventNextCycleModifier,
  EventRewardModifier,
  MapEdge,
  RunState,
  ToolId,
} from "./models";

type EventArtTreatment = "scope" | "karaoke" | "call-grid" | "pull-request";
type EventChoiceTone = "steady" | "build" | "risk";
type EventOutcomeTone = "good" | "neutral" | "risk";
type EventLedgerResource = "credits" | "morale" | "max-morale" | "tech-debt";

export interface EventOutcomeChip {
  text: string;
  tone: EventOutcomeTone;
}

export interface EventCardFilter {
  label?: string;
  cardIds?: readonly string[];
  tagsAny?: readonly CardTag[];
  tagsAll?: readonly CardTag[];
  excludedTags?: readonly CardTag[];
  disciplines?: readonly (Discipline | "flexible")[];
  rarities?: readonly ("normal" | "rare")[];
  owner?: "squad" | "non-squad";
  startersOnly?: boolean;
  anyOf?: readonly EventCardFilter[];
}

export type EventDeckSurgeryEffect =
  | { kind: "deck-surgery"; operation: "add"; cardId: string }
  | {
      kind: "deck-surgery";
      operation: "remove" | "duplicate";
      filter: EventCardFilter;
    }
  | {
      kind: "deck-surgery";
      operation: "transform";
      filter: EventCardFilter;
      transform: { kind: "verify" } | { kind: "replace"; cardId: string };
    };

export type EventEffect =
  | {
      kind: "ledger";
      resource: EventLedgerResource;
      amount: number;
    }
  | EventDeckSurgeryEffect
  | {
      kind: "filtered-draft";
      count: number;
      filter: EventCardFilter;
    }
  | {
      kind: "tool-offer";
      count: number;
      toolIds?: readonly ToolId[];
    }
  | {
      kind: "next-cycle-modifier";
      modifier: EventNextCycleModifier;
    }
  | {
      kind: "temporary-guest-card";
      count: number;
      cardIds?: readonly string[];
    }
  | {
      kind: "bounty-task";
      bounty: EventBountyTask;
    }
  | {
      kind: "reward-modifier";
      modifier: EventRewardModifier;
    }
  | {
      kind: "map-modifier";
      modifier: { kind: "reveal-upcoming"; count: number } | { kind: "connection"; edge: MapEdge };
    };

interface EventRequirement {
  kind: "credits-at-least";
  amount: number;
  reason: string;
}

export interface EventChoiceDefinition {
  id: string;
  label: string;
  tone: EventChoiceTone;
  effects: readonly EventEffect[];
  requirements?: readonly EventRequirement[];
}

export interface EventDefinition {
  id: string;
  title: string;
  setup: string;
  artLabel: string;
  artTreatment: EventArtTreatment;
  eligibility: (run: RunState) => boolean;
  weight: (run: RunState) => number;
  choices: readonly EventChoiceDefinition[];
}

const alwaysEligible = () => true;
const ordinaryWeight = () => 1;
const removableCards = [
  "frontend-3",
  "backend-3",
  "infra-3",
  "flexible-2",
  "review-3",
  "standup-cover",
  "tech-debt",
] as const;

export const eventDefinitions: readonly EventDefinition[] = [
  {
    id: "quarterly-connect",
    title: "Quarterly Connect",
    setup: "The whole team briefly remembers what everyone else actually works on.",
    artLabel: "YOU'RE ON MUTE",
    artTreatment: "call-grid",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "demo",
        label: "Demo",
        tone: "build",
        effects: [
          {
            kind: "filtered-draft",
            count: 3,
            filter: {
              label: "Squad",
              owner: "squad",
              rarities: ["normal"],
              tagsAny: ["reward"],
            },
          },
        ],
      },
      {
        id: "cross-pollinate",
        label: "Cross-Pollinate",
        tone: "build",
        effects: [{ kind: "temporary-guest-card", count: 3 }],
      },
      {
        id: "retro",
        label: "Retro",
        tone: "steady",
        effects: [
          { kind: "ledger", resource: "morale", amount: 3 },
          { kind: "ledger", resource: "tech-debt", amount: -2 },
        ],
      },
    ],
  },
  {
    id: "level-up-day",
    title: "Level-Up Day",
    setup: "No roadmap work. Allegedly.",
    artLabel: "LEARNING MODE",
    artTreatment: "pull-request",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "learn",
        label: "Learn",
        tone: "build",
        effects: [
          {
            kind: "filtered-draft",
            count: 3,
            filter: { label: "Automation", tagsAny: ["automation"], tagsAll: ["reward"] },
          },
        ],
      },
      {
        id: "refactor",
        label: "Refactor",
        tone: "steady",
        effects: [
          { kind: "deck-surgery", operation: "remove", filter: { cardIds: removableCards } },
        ],
      },
      {
        id: "tinker",
        label: "Tinker",
        tone: "risk",
        effects: [
          { kind: "tool-offer", count: 3 },
          { kind: "ledger", resource: "tech-debt", amount: 2 },
        ],
      },
    ],
  },
  {
    id: "quiet-hours",
    title: "Quiet Hours",
    setup: "The NZ morning begins. Australia is still offline. Slack is beautiful.",
    artLabel: "NO NEW MESSAGES",
    artTreatment: "call-grid",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "deep-work",
        label: "Deep Work",
        tone: "build",
        effects: [{ kind: "next-cycle-modifier", modifier: { kind: "opening-focus", amount: 2 } }],
      },
      {
        id: "clean-up",
        label: "Clean Up",
        tone: "steady",
        effects: [
          { kind: "deck-surgery", operation: "remove", filter: { cardIds: removableCards } },
        ],
      },
      {
        id: "plan-async",
        label: "Plan Async",
        tone: "build",
        effects: [{ kind: "next-cycle-modifier", modifier: { kind: "opening-draw", amount: 2 } }],
      },
    ],
  },
  {
    id: "karaoke-night",
    title: "Karaoke Night",
    setup: "Someone has selected a song with a dangerously long instrumental intro.",
    artLabel: "♪ YOUR CUE ♪",
    artTreatment: "karaoke",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "solo",
        label: "Solo",
        tone: "steady",
        effects: [{ kind: "ledger", resource: "morale", amount: 4 }],
      },
      {
        id: "duet",
        label: "Duet",
        tone: "build",
        requirements: [{ kind: "credits-at-least", amount: 15, reason: "Need 15 Credits" }],
        effects: [
          { kind: "ledger", resource: "credits", amount: -15 },
          {
            kind: "deck-surgery",
            operation: "duplicate",
            filter: { rarities: ["normal"] },
          },
        ],
      },
      {
        id: "power-ballad",
        label: "Power Ballad",
        tone: "risk",
        effects: [
          { kind: "ledger", resource: "max-morale", amount: 2 },
          {
            kind: "next-cycle-modifier",
            modifier: { kind: "queued-status", cardId: "distraction", count: 1 },
          },
        ],
      },
    ],
  },
  {
    id: "coffee-summit",
    title: "Coffee Summit",
    setup: "NZ and Melbourne agree to settle this properly. They do not agree on proper.",
    artLabel: "FINAL FINAL CUP",
    artTreatment: "scope",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "nz-cup",
        label: "NZ Cup",
        tone: "build",
        effects: [{ kind: "next-cycle-modifier", modifier: { kind: "opening-focus", amount: 2 } }],
      },
      {
        id: "melbourne-flat-white",
        label: "Melbourne Flat White",
        tone: "build",
        effects: [{ kind: "next-cycle-modifier", modifier: { kind: "opening-draw", amount: 2 } }],
      },
      {
        id: "order-for-everyone",
        label: "Order for Everyone",
        tone: "risk",
        requirements: [{ kind: "credits-at-least", amount: 10, reason: "Need 10 Credits" }],
        effects: [
          { kind: "ledger", resource: "credits", amount: -10 },
          { kind: "ledger", resource: "morale", amount: 3 },
          { kind: "next-cycle-modifier", modifier: { kind: "opening-focus", amount: 1 } },
          { kind: "next-cycle-modifier", modifier: { kind: "opening-draw", amount: 1 } },
        ],
      },
    ],
  },
  {
    id: "cat-tax",
    title: "Cat Tax",
    setup: "Bread, Toast, Mila, or Angus has entered the call and immediately improved it.",
    artLabel: "CAT HAS JOINED",
    artTreatment: "call-grid",
    eligibility: alwaysEligible,
    weight: (run) =>
      run.squad.some((developerId) => ["paul", "odin"].includes(developerId)) ? 3 : 1,
    choices: [
      {
        id: "wave-hello",
        label: "Wave Hello",
        tone: "steady",
        effects: [{ kind: "ledger", resource: "morale", amount: 3 }],
      },
      {
        id: "keyboard-review",
        label: "Keyboard Review",
        tone: "build",
        effects: [{ kind: "ledger", resource: "tech-debt", amount: -2 }],
      },
      {
        id: "make-them-mascot",
        label: "Make Them Mascot",
        tone: "risk",
        requirements: [{ kind: "credits-at-least", amount: 15, reason: "Need 15 Credits" }],
        effects: [
          { kind: "ledger", resource: "credits", amount: -15 },
          { kind: "tool-offer", count: 1, toolIds: ["cat-tax"] },
        ],
      },
    ],
  },
  {
    id: "mascot-council",
    title: "Mascot Council",
    setup: "The Reef Shark, Platypus, and Pangolin convene. Governance has happened.",
    artLabel: "MASCOTS ASSEMBLE",
    artTreatment: "call-grid",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "choose-a-mascot",
        label: "Choose a Mascot",
        tone: "build",
        effects: [
          {
            kind: "tool-offer",
            count: 3,
            toolIds: ["reef-shark", "platypus", "pangolin"],
          },
        ],
      },
    ],
  },
  {
    id: "founder-hackathon",
    title: "Founder Hackathon",
    setup: "Nick has a board, Tristan a spreadsheet, and Mateja half a new product.",
    artLabel: "SHIP BY LUNCH",
    artTreatment: "pull-request",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "let-mateja-cook",
        label: "Let Mateja Cook",
        tone: "risk",
        effects: [
          {
            kind: "filtered-draft",
            count: 3,
            filter: {
              label: "Rare AI Assisted",
              tagsAll: ["ai-assisted"],
              rarities: ["rare"],
            },
          },
          { kind: "ledger", resource: "tech-debt", amount: 3 },
        ],
      },
      {
        id: "ask-tristan-for-numbers",
        label: "Ask Tristan for Numbers",
        tone: "build",
        effects: [
          {
            kind: "filtered-draft",
            count: 3,
            filter: {
              label: "Backend / Review",
              tagsAny: ["reward"],
              anyOf: [{ disciplines: ["backend"] }, { tagsAny: ["review"] }],
            },
          },
        ],
      },
      {
        id: "nick-makes-a-board",
        label: "Nick Makes a Board",
        tone: "steady",
        effects: [
          { kind: "map-modifier", modifier: { kind: "reveal-upcoming", count: 3 } },
          { kind: "reward-modifier", modifier: { choiceCount: 4 } },
        ],
      },
    ],
  },
  {
    id: "customer-feedback-flood",
    title: "Customer Feedback Flood",
    setup: "Several thoughtful customers have written several actionable paragraphs.",
    artLabel: "37 NEW REPLIES",
    artTreatment: "scope",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "synthesize",
        label: "Synthesize",
        tone: "build",
        effects: [
          {
            kind: "filtered-draft",
            count: 3,
            filter: {
              label: "Flexible / Review",
              anyOf: [{ disciplines: ["flexible"] }, { tagsAny: ["review"] }],
            },
          },
        ],
      },
      {
        id: "fix-the-top-pain",
        label: "Fix the Top Pain",
        tone: "risk",
        effects: [
          {
            kind: "bounty-task",
            bounty: {
              id: "customer-top-pain",
              name: "Fix the Top Pain",
              requirements: [
                { discipline: "frontend", target: 3 },
                { discipline: "backend", target: 2 },
              ],
              reward: { kind: "tool-offer" },
            },
          },
        ],
      },
      {
        id: "share-the-praise",
        label: "Share the Praise",
        tone: "steady",
        effects: [
          { kind: "ledger", resource: "morale", amount: 3 },
          { kind: "reward-modifier", modifier: { choiceCount: 4 } },
        ],
      },
    ],
  },
  {
    id: "enterprise-request",
    title: "Enterprise Request",
    setup: "It is genuinely important. It is also needed rather soon.",
    artLabel: "QUICK QUESTION",
    artTreatment: "scope",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "commit",
        label: "Commit",
        tone: "risk",
        effects: [
          {
            kind: "bounty-task",
            bounty: {
              id: "enterprise-commitment",
              name: "Enterprise Commitment",
              requirements: [
                { discipline: "frontend", target: 6 },
                { discipline: "backend", target: 8 },
                { discipline: "infra", target: 5 },
              ],
              reward: { kind: "credits-and-rare-card-offer", amount: 30 },
            },
          },
        ],
      },
      {
        id: "negotiate",
        label: "Negotiate",
        tone: "steady",
        effects: [
          { kind: "ledger", resource: "credits", amount: 15 },
          {
            kind: "next-cycle-modifier",
            modifier: { kind: "intent-protection", intentKind: "scope", count: 1 },
          },
        ],
      },
      {
        id: "prototype",
        label: "Prototype",
        tone: "risk",
        effects: [
          {
            kind: "filtered-draft",
            count: 3,
            filter: { label: "AI Assisted", tagsAll: ["ai-assisted"] },
          },
          { kind: "ledger", resource: "tech-debt", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "design-opened-a-pr",
    title: "Design Opened a PR",
    setup: "The designers and PMs are coding now. Reactions are mixed but fascinated.",
    artLabel: "PR OPENED",
    artTreatment: "pull-request",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "pair-up",
        label: "Pair Up",
        tone: "build",
        effects: [{ kind: "deck-surgery", operation: "add", cardId: "pair-programming" }],
      },
      {
        id: "review-together",
        label: "Review Together",
        tone: "steady",
        effects: [
          {
            kind: "deck-surgery",
            operation: "transform",
            filter: {
              tagsAll: ["basic"],
              disciplines: ["frontend", "backend", "infra"],
            },
            transform: { kind: "verify" },
          },
        ],
      },
      {
        id: "merge-it",
        label: "Merge It",
        tone: "risk",
        effects: [
          { kind: "ledger", resource: "credits", amount: 20 },
          { kind: "ledger", resource: "tech-debt", amount: 2 },
        ],
      },
    ],
  },
  {
    id: "daylight-saving-incident",
    title: "Daylight Saving Incident",
    setup: "The calendar says nine. Queensland says absolutely not.",
    artLabel: "WHAT TIME IS IT",
    artTreatment: "call-grid",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "go-async",
        label: "Go Async",
        tone: "build",
        effects: [{ kind: "next-cycle-modifier", modifier: { kind: "opening-draw", amount: 2 } }],
      },
      {
        id: "move-standup",
        label: "Move Standup",
        tone: "steady",
        effects: [
          { kind: "ledger", resource: "morale", amount: 3 },
          {
            kind: "next-cycle-modifier",
            modifier: { kind: "intent-protection", intentKind: "interruption", count: 1 },
          },
        ],
      },
      {
        id: "automate-calendar",
        label: "Automate Calendar",
        tone: "build",
        effects: [{ kind: "tool-offer", count: 1, toolIds: ["timezone-wrangler"] }],
      },
    ],
  },
];

export function getEvent(eventId: string): EventDefinition {
  const event = eventDefinitions.find((candidate) => candidate.id === eventId);
  if (!event) throw new Error(`Unknown Event: ${eventId}`);
  return event;
}

export function resolveEventRequirement(
  requirement: EventRequirement,
  run: RunState,
): string | undefined {
  switch (requirement.kind) {
    case "credits-at-least":
      return run.credits < requirement.amount ? requirement.reason : undefined;
  }
}
