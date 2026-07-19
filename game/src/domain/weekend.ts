import { canRefactorCard } from "./shop";
import type { RunState } from "./models";

export type WeekendChoiceId = "rest" | "refactor" | "side-gig";

export const weekendRestAmount = 4;
export const weekendSideGigCredits = 80;
export const weekendSideGigMoraleCost = 2;

export interface WeekendChoiceState {
  disabledReason?: string;
  outcomes: readonly string[];
}

export function getWeekendChoiceState(
  choiceId: WeekendChoiceId,
  run: RunState,
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
  }
}
