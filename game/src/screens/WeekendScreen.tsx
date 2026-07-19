import { Briefcase, Coffee, GitPullRequest } from "lucide-react";
import { useState } from "react";
import panelMascot from "../assets/mascots/panel.svg";
import platformMascot from "../assets/mascots/platform.svg";
import researchMascot from "../assets/mascots/research.svg";
import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionBrowser, CardCollectionEntry } from "../components/CardCollectionBrowser";
import { canRefactorCard } from "../domain/shop";
import { getWeekendChoiceState, type WeekendChoiceId } from "../domain/weekend";

type WeekendScreenProps = DispatchProps &
  RunProps & {
    onInspectDeck: () => void;
  };

const weekendChoices = [
  {
    id: "rest",
    label: "Rest",
    note: "Actually log off.",
    icon: Coffee,
    mascot: panelMascot,
  },
  {
    id: "refactor",
    label: "Refactor",
    note: "Tidy one loose end.",
    icon: GitPullRequest,
    mascot: platformMascot,
  },
  {
    id: "side-gig",
    label: "Side Gig",
    note: "Relax with different work.",
    icon: Briefcase,
    mascot: researchMascot,
  },
] as const;

export function WeekendScreen({ dispatch, run, onInspectDeck }: WeekendScreenProps) {
  const [refactoring, setRefactoring] = useState(false);
  if (!run) return null;

  function choose(choiceId: WeekendChoiceId) {
    if (choiceId === "refactor") {
      setRefactoring(true);
      return;
    }
    dispatch({ type: "CHOOSE_WEEKEND", choiceId });
  }

  return (
    <section className="screen weekend-screen" aria-labelledby="weekend-heading">
      <header className="weekend-heading">
        <div>
          <span>Out of office</span>
          <h1 id="weekend-heading">WEEKEND</h1>
        </div>
        <CardCollectionEntry count={run.deck.length} onOpen={onInspectDeck} />
      </header>

      <div className="weekend-calendar" aria-hidden="true">
        <span>Sat</span>
        <b>Do</b>
        <strong>Nothing?</strong>
        <i>Sun</i>
      </div>

      <div className="weekend-choice-grid" aria-label="Weekend plans">
        {weekendChoices.map((choice, index) => {
          const state = getWeekendChoiceState(choice.id, run);
          const Icon = choice.icon;
          return (
            <button
              className={`weekend-choice weekend-choice--${choice.id}`}
              type="button"
              key={choice.id}
              disabled={Boolean(state.disabledReason)}
              onClick={() => choose(choice.id)}
            >
              <span className="weekend-choice__number">0{index + 1}</span>
              <Icon className="weekend-choice__icon" aria-hidden="true" strokeWidth={3} />
              <span className="weekend-choice__copy">
                <strong>{choice.label}</strong>
                <small>{state.disabledReason ?? choice.note}</small>
              </span>
              <span className="weekend-choice__outcomes">
                {state.outcomes.map((outcome) => (
                  <b key={outcome}>{outcome}</b>
                ))}
              </span>
              <img src={choice.mascot} alt="" draggable={false} />
            </button>
          );
        })}
      </div>

      {refactoring && (
        <CardCollectionBrowser
          cards={run.deck}
          title="Weekend Refactor"
          mode="choose-one"
          confirmLabel="Remove"
          canChoose={(instance) => canRefactorCard(run, instance)}
          onChoose={(instanceId) =>
            dispatch({ type: "CHOOSE_WEEKEND", choiceId: "refactor", instanceId })
          }
          onClose={() => setRefactoring(false)}
        />
      )}
    </section>
  );
}
