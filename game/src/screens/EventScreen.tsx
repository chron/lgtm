import type { DispatchProps } from "../app/types";

export function EventScreen({ dispatch }: DispatchProps) {
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
        <button className="choice" type="button" onClick={() => dispatch({ type: "LEAVE_NODE" })}>
          Push Back
        </button>
        <button className="choice" type="button" onClick={() => dispatch({ type: "LEAVE_NODE" })}>
          Sure, Easy
        </button>
      </div>
    </section>
  );
}
