import type { CardDefinition } from "./models";

export interface CardGlossaryEntry {
  id: string;
  term: string;
  description: string;
}

interface GlossaryDefinition extends CardGlossaryEntry {
  appliesTo: (card: CardDefinition) => boolean;
}

const glossary: readonly GlossaryDefinition[] = [
  {
    id: "prototype",
    term: "Prototype",
    description: "Each stack adds +1 Work to every Work card for the rest of this Cycle.",
    appliesTo: (card) => Boolean(card.spawnSideQuest),
  },
  {
    id: "side-quest",
    term: "Side Quest",
    description: "A required 3-Work Task with no Intent. Ship it to gain Prototype.",
    appliesTo: (card) => Boolean(card.spawnSideQuest),
  },
  {
    id: "verify",
    term: "Verify",
    description: "Converts Unverified Work into safe Verified Work on one Task.",
    appliesTo: (card) => card.kind === "review",
  },
  {
    id: "retain",
    term: "Retain",
    description: "If unplayed, this card stays in hand when the next Day begins.",
    appliesTo: (card) => Boolean(card.retain),
  },
  {
    id: "review-stun",
    term: "Review Stun",
    description: "Triggers only when Review newly Stuns an active Intent.",
    appliesTo: (card) => Boolean(card.dayReviewStunFocusBonus || card.cardsDrawnPerReviewStun),
  },
  {
    id: "day-bonus",
    term: "Day Bonus",
    description: "Lasts until the next Day begins. Additional copies stack.",
    appliesTo: (card) => Boolean(card.dayWorkBonus || card.dayReviewStunFocusBonus),
  },
  {
    id: "stunned-task",
    term: "Stunned Task",
    description: "A Task whose Intent has been cancelled for the current Day.",
    appliesTo: (card) => Boolean(card.bonusWorkIfTaskStunned),
  },
  {
    id: "hand-discard",
    term: "Discard",
    description: "Moves matching cards currently in hand to the discard pile.",
    appliesTo: (card) => Boolean(card.discardedHandTags),
  },
  {
    id: "every-task",
    term: "Every Task",
    description: "Affects each unshipped Task that has eligible Unverified Work.",
    appliesTo: (card) => Boolean(card.reviewEveryTask),
  },
  {
    id: "distraction",
    term: "Distraction",
    description: "An unplayable card that clogs a hand for one Day, then disappears.",
    appliesTo: (card) => card.id === "distraction" || Boolean(card.queuedDistractions),
  },
  {
    id: "next-draw",
    term: "Next Draw",
    description: "Adds to the ordinary five-card draw at the start of the next Day.",
    appliesTo: (card) => Boolean(card.nextDayCardsDrawn),
  },
  {
    id: "stun",
    term: "Stun",
    description: "Cancels one Task's Intent for this Day.",
    appliesTo: (card) => Boolean(card.stun),
  },
  {
    id: "block",
    term: "Block",
    description: "Prevents that much incoming Morale loss until the Day ends.",
    appliesTo: (card) => Boolean(card.block || card.blockPerCardPlayed),
  },
  {
    id: "script",
    term: "Script",
    description: "Adds Verified Work to its requirement at the start of every Day.",
    appliesTo: (card) =>
      Boolean(
        card.automation ||
        card.scriptPowerPerIncompleteRequirement ||
        card.triggerTargetScriptAfterWork,
      ),
  },
  {
    id: "trigger",
    term: "Trigger",
    description: "Runs the target requirement's full Script immediately.",
    appliesTo: (card) =>
      card.automation?.kind === "trigger" || Boolean(card.triggerTargetScriptAfterWork),
  },
  {
    id: "guard",
    term: "Guard",
    description: "Creates Block at the start of every Day.",
    appliesTo: (card) => card.automation?.kind === "install" && Boolean(card.automation.blockPower),
  },
  {
    id: "tech-debt",
    term: "Tech Debt",
    description: "Persists for the run. Every 3 adds an unplayable Tech Debt card to your deck.",
    appliesTo: (card) => card.id === "tech-debt" || Boolean(card.techDebtAdded),
  },
  {
    id: "ai-assisted",
    term: "AI Assisted",
    description: "A card tag used by AI synergies and Madi's Custom Setup.",
    appliesTo: (card) =>
      Boolean(
        card.tags.includes("ai-assisted") ||
        card.cycleWorkBonus?.tag === "ai-assisted" ||
        card.dayWorkBonus?.excludedTags?.includes("ai-assisted") ||
        card.discardedHandTags?.includes("ai-assisted"),
      ),
  },
  {
    id: "cycle-work-bonus",
    term: "Cycle Bonus",
    description: "Lasts for this Cycle. Playing another copy adds another stack.",
    appliesTo: (card) => Boolean(card.cycleWorkBonus),
  },
  {
    id: "unverified",
    term: "Unverified",
    description: "Counts as Work, but creates Defects and Tech Debt if shipped before Verify.",
    appliesTo: (card) => card.workKind === "unverified",
  },
  {
    id: "generated",
    term: "Generated",
    description: "Created during a Cycle. It disappears when the Cycle ends.",
    appliesTo: (card) => card.tags.includes("generated") || Boolean(card.generatedCards),
  },
  {
    id: "exhaust",
    term: "Exhaust",
    description: "Removed for the rest of this Cycle after it is played.",
    appliesTo: (card) => Boolean(card.exhaust),
  },
  {
    id: "any",
    term: "Any",
    description: "Can target Frontend, Backend, or Infra at full value.",
    appliesTo: (card) => card.kind === "work" && card.discipline === "flexible",
  },
];

export function getCardGlossaryEntries(card: CardDefinition): readonly CardGlossaryEntry[] {
  return glossary
    .filter((entry) => entry.appliesTo(card))
    .map(({ id, term, description }) => ({ id, term, description }));
}
