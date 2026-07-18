import type { DispatchProps } from "../app/types";

export function TitleScreen({ dispatch }: DispatchProps) {
  return (
    <section className="screen title-screen" aria-labelledby="title-heading">
      <div className="title-screen__copy">
        <h1 id="title-heading" className="mega-title">
          BACK
          <br />
          LOG!
        </h1>
        <p>Ship fast. Fix it live.</p>
        <button
          className="button button--primary"
          type="button"
          onClick={() => dispatch({ type: "START_RUN" })}
        >
          New Run
        </button>
      </div>
      <div className="title-screen__canvas" aria-hidden="true">
        <div className="canvas-note canvas-note--one">LGTM-ish</div>
        <div className="canvas-note canvas-note--two">SHIP?</div>
        <div className="canvas-cursor">Paul ↗</div>
      </div>
    </section>
  );
}
