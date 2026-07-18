import type { DispatchProps, RunProps } from "../app/types";

type EventScreenProps = DispatchProps & RunProps;

export function EventScreen({ dispatch, run }: EventScreenProps) {
  const moraleGain = Math.min(2, Math.max(0, 10 - (run?.morale ?? 10)));

  return (
    <section className="screen event-screen" aria-labelledby="event-heading">
      <div className="screen-heading">
        <h1 id="event-heading" className="display-title">
          SCOPE CREEP
        </h1>
      </div>
      <div className="event-art" aria-hidden="true">
        + ONE TINY THING
      </div>
      <div className="choice-stack">
        <button
          className="choice choice--push-back"
          type="button"
          onClick={() => dispatch({ type: "CHOOSE_EVENT", choice: "push-back" })}
        >
          <strong>Push Back</strong>
          <span>{moraleGain > 0 ? `+${moraleGain} Morale` : "Morale Full"}</span>
        </button>
        <button
          className="choice choice--sure-easy"
          type="button"
          onClick={() => dispatch({ type: "CHOOSE_EVENT", choice: "sure-easy" })}
        >
          <strong>Sure, Easy</strong>
          <span>+35 Credits · +1 Tech Debt</span>
        </button>
      </div>
    </section>
  );
}
