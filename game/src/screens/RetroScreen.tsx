import type { DispatchProps } from "../app/types";

interface RetroScreenProps extends DispatchProps {
  outcome: "victory" | "defeat";
}

export function RetroScreen({ dispatch, outcome }: RetroScreenProps) {
  return (
    <section className="screen retro-screen" aria-labelledby="retro-heading">
      <div className="screen-heading">
        <h1 id="retro-heading" className="display-title">
          RETRO
        </h1>
        <span>{outcome === "victory" ? "SHIPPED" : "ROLL BACK"}</span>
      </div>

      <div className="retro-board">
        <section>
          <h2>WENT WELL</h2>
          <div className="sticky sticky--mint">Team remained mostly human</div>
        </section>
        <section>
          <h2>DIDN'T</h2>
          <div className="sticky sticky--pink">Tests were a future-Paul problem</div>
        </section>
        <section>
          <h2>ACTIONS</h2>
          <div className="sticky sticky--yellow">Do it again, but deliberately</div>
        </section>
      </div>

      <div className="screen-actions">
        <button
          className="button button--primary"
          type="button"
          onClick={() => dispatch({ type: "START_RUN" })}
        >
          Again
        </button>
        <button
          className="button button--text"
          type="button"
          onClick={() => dispatch({ type: "RETURN_TITLE" })}
        >
          Title
        </button>
      </div>
    </section>
  );
}
