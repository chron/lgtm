import type { DispatchProps } from "../app/types";
import { CharacterToken } from "../components/CharacterToken";
import { getBossDefinition } from "../domain/bosses";
import type { RunState } from "../domain/models";
import { buildRetroBoard, type RetroCause, type RetroOutcome } from "../domain/retro";
import { createRunSeed } from "../game/random";

interface RetroScreenProps extends DispatchProps {
  outcome: RetroOutcome;
  cause?: RetroCause;
  run: RunState | null;
}

export function RetroScreen({ dispatch, outcome, cause, run }: RetroScreenProps) {
  if (!run) return null;
  const board = buildRetroBoard(run, outcome, cause);
  const boss = getBossDefinition(run.selectedBossId);

  return (
    <section className="screen retro-screen" aria-labelledby="retro-heading">
      <header className="retro-heading">
        <div>
          <span>Release Retrospective</span>
          <h1 id="retro-heading">{board.result}</h1>
          <p>{board.resultDetail}</p>
        </div>
        <div className="squad-strip" aria-label="Final squad">
          {run.squad.map((developerId) => (
            <CharacterToken key={developerId} developerId={developerId} compact />
          ))}
        </div>
      </header>

      <div className="retro-board">
        {board.columns.map((column) => (
          <section
            className={`retro-column retro-column--${column.kind}`}
            aria-label={`${column.kind === "good" ? "Good" : column.kind === "bad" ? "Bad" : "Actions"}: ${column.label}`}
            key={column.kind}
          >
            <h2>{column.label}</h2>
            <div className="retro-stickies">
              {column.stickies.map((sticky) => (
                <div className="sticky" key={sticky}>
                  {sticky}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="retro-facilitator-note">
        <span>{boss.stakeholder} added</span>
        <blockquote>{board.bossNote}</blockquote>
      </aside>

      <div className="screen-actions">
        <button
          className="button button--primary"
          type="button"
          onClick={() => dispatch({ type: "START_RUN", seed: createRunSeed() })}
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
