import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionEntry } from "../components/CardCollectionBrowser";
import { GameCard } from "../components/GameCard";
import { getCard, getCardForInstance } from "../domain/content";
import type { CardInstance } from "../domain/models";
import { getEvent } from "../domain/events";
import {
  resolveEventChoice,
  skipEventSelectionId,
  type EventPendingSelection,
} from "../game/eventResolution";

type EventScreenProps = DispatchProps &
  RunProps & {
    eventId: string;
    resolution?: {
      outcome: readonly string[];
      pending: EventPendingSelection;
    };
    onInspectDeck: () => void;
  };

export function EventScreen({
  dispatch,
  run,
  eventId,
  resolution,
  onInspectDeck,
}: EventScreenProps) {
  if (!run) return null;
  const event = getEvent(eventId);
  const pendingUsesCards =
    resolution?.pending.kind === "card" ||
    resolution?.pending.kind === "draft" ||
    resolution?.pending.kind === "guest";

  return (
    <section
      className={`screen event-screen event-screen--${event.artTreatment}${resolution ? " has-selection" : ""}`}
      aria-labelledby="event-heading"
    >
      <div className="screen-heading">
        <h1 id="event-heading" className="display-title">
          {event.title}
        </h1>
        <CardCollectionEntry count={run.deck.length} onOpen={onInspectDeck} />
      </div>
      <div className="event-art" data-event-art={event.artTreatment} aria-hidden="true">
        {event.artLabel}
      </div>
      <p className="event-setup">{event.setup}</p>
      {resolution ? (
        <div className="event-selection" aria-label={resolution.pending.prompt}>
          <h2>{resolution.pending.prompt}</h2>
          {resolution.outcome.length > 0 && (
            <div className="event-selection__applied" aria-label="Already applied">
              {resolution.outcome.map((outcome) => (
                <span key={outcome}>{outcome}</span>
              ))}
            </div>
          )}
          <div className={`event-selection__options${pendingUsesCards ? " is-card-options" : ""}`}>
            {resolution.pending.options.map((option) => {
              const eventCard = pendingUsesCards
                ? eventSelectionCard(run.deck, option.id, option.cardId)
                : undefined;
              if (eventCard) {
                const card = getCardForInstance(eventCard);
                return (
                  <div className="event-card-option" key={option.id}>
                    <GameCard
                      instance={eventCard}
                      effectiveCost={card.cost}
                      selected={false}
                      onSelect={() =>
                        dispatch({ type: "CHOOSE_EVENT_OPTION", optionId: option.id })
                      }
                    />
                  </div>
                );
              }
              return (
                <button
                  className={`event-option event-option--${resolution.pending.kind}`}
                  type="button"
                  key={option.id}
                  onClick={() => dispatch({ type: "CHOOSE_EVENT_OPTION", optionId: option.id })}
                >
                  <strong>{option.label}</strong>
                  {option.rules && <span>{option.rules}</span>}
                  <small>Choose</small>
                </button>
              );
            })}
          </div>
          {resolution.pending.kind !== "card" && (
            <button
              className="button button--text event-selection__skip"
              type="button"
              onClick={() =>
                dispatch({ type: "CHOOSE_EVENT_OPTION", optionId: skipEventSelectionId })
              }
            >
              {resolution.pending.kind === "tool" ? "Skip Tool" : "Skip Card"}
            </button>
          )}
        </div>
      ) : (
        <div className="choice-stack">
          {event.choices.map((choice) => {
            const resolved = resolveEventChoice(choice, run);
            const rewardCardId = choice.effects.find(
              (effect) => effect.kind === "deck-surgery" && effect.operation === "add",
            )?.cardId;
            const rewardCard = rewardCardId ? getCard(rewardCardId) : undefined;
            const rewardHelpId = rewardCard ? `event-choice-card-${choice.id}` : undefined;
            return (
              <div
                className={`choice-preview-wrap${rewardCard ? " has-card-preview" : ""}`}
                key={choice.id}
              >
                <button
                  className={`choice choice--${choice.tone}`}
                  type="button"
                  disabled={Boolean(resolved.disabledReason)}
                  aria-describedby={rewardHelpId}
                  onClick={() => dispatch({ type: "CHOOSE_EVENT", choiceId: choice.id })}
                >
                  <strong>{choice.label}</strong>
                  <span className="choice__outcomes">
                    {resolved.outcome.map((outcome) => (
                      <span className={`choice__outcome is-${outcome.tone}`} key={outcome.text}>
                        {outcome.text}
                      </span>
                    ))}
                  </span>
                  {resolved.disabledReason && (
                    <span className="choice__reason">{resolved.disabledReason}</span>
                  )}
                </button>
                {rewardCard && rewardCardId && (
                  <>
                    <span className="sr-only" id={rewardHelpId}>
                      Card reward: {rewardCard.name}. {rewardCard.rules}
                    </span>
                    <div className="choice-card-preview" aria-hidden="true">
                      <GameCard
                        instance={{
                          cardId: rewardCardId,
                          instanceId: `event-preview-${choice.id}`,
                        }}
                        effectiveCost={rewardCard.cost}
                        selected={false}
                        presentationOnly
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function eventSelectionCard(
  deck: readonly CardInstance[],
  optionId: string,
  cardId?: string,
): CardInstance | undefined {
  if (!cardId) return undefined;
  return (
    deck.find((instance) => instance.instanceId === optionId) ?? {
      cardId,
      instanceId: `event-${optionId}`,
    }
  );
}
