import { canRefactorCard } from "./shop";
import { getCard, squadRewardCardIds } from "./content";
import type { RunState } from "./models";
import { normalizeSeed, sampleOne } from "../game/random";

export type WeekendChoiceId = "rest" | "refactor" | "side-gig" | "squad-draft";

export const weekendRestAmount = 6;
export const weekendSideGigCredits = 80;
export const weekendSideGigMoraleCost = 2;
export const weekendSquadDraftMoraleCost = 2;

export function isFinalWeekend(nodeId: string): boolean {
  return nodeId === "weekend-2";
}

function stringHash(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getWeekendSquadDraftCardIds(run: RunState, nodeId: string): readonly string[] {
  if (!isFinalWeekend(nodeId)) return [];

  return run.squad.flatMap((developerId, index) => {
    const pool = squadRewardCardIds.filter((cardId) => getCard(cardId).ownerId === developerId);
    if (pool.length === 0) return [];
    const rngState = normalizeSeed(
      run.seed ^ stringHash(`${nodeId}:${developerId}`) ^ Math.imul(index + 1, 0x45d9f3b),
    );
    return [sampleOne(pool, rngState).item];
  });
}

export interface WeekendChoiceState {
  disabledReason?: string;
  outcomes: readonly string[];
}

export function getWeekendChoiceState(
  choiceId: WeekendChoiceId,
  run: RunState,
  nodeId = run.currentNodeId ?? "",
): WeekendChoiceState {
  switch (choiceId) {
    case "rest": {
      const restored = Math.min(weekendRestAmount, run.maxMorale - run.morale);
      return {
        disabledReason: restored === 0 ? "Morale full" : undefined,
        outcomes: [restored > 0 ? `+${restored} Morale` : "Morale full"],
      };
    }
    case "refactor":
      return {
        disabledReason: run.deck.some((card) => canRefactorCard(run, card))
          ? undefined
          : "No removable cards",
        outcomes: ["Remove 1 card"],
      };
    case "side-gig":
      return {
        disabledReason:
          run.morale <= weekendSideGigMoraleCost
            ? `Need ${weekendSideGigMoraleCost + 1} Morale`
            : undefined,
        outcomes: [`+$${weekendSideGigCredits}`, `−${weekendSideGigMoraleCost} Morale`],
      };
    case "squad-draft":
      return {
        disabledReason: !isFinalWeekend(nodeId)
          ? "Final Weekend only"
          : run.morale <= weekendSquadDraftMoraleCost
            ? `Need ${weekendSquadDraftMoraleCost + 1} Morale`
            : getWeekendSquadDraftCardIds(run, nodeId).length !== run.squad.length
              ? "No Squad cards"
              : undefined,
        outcomes: ["Gain 1 Squad card", `−${weekendSquadDraftMoraleCost} Morale`],
      };
  }
}
