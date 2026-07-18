import type { DispatchProps, RunProps } from "../app/types";
import { CharacterToken } from "../components/CharacterToken";
import { developers } from "../domain/content";

type SquadScreenProps = DispatchProps & RunProps;

export function SquadScreen({ dispatch, run }: SquadScreenProps) {
  const selected = run?.squad ?? [];

  return (
    <section className="screen" aria-labelledby="squad-heading">
      <div className="screen-heading">
        <h1 id="squad-heading" className="display-title">
          SQUAD
        </h1>
        <span>{selected.length}/3</span>
      </div>

      <div className="squad-grid">
        {developers.map((developer) => {
          const isSelected = selected.includes(developer.id);
          const isUnavailable = !isSelected && selected.length === 3;

          return (
            <button
              className="developer-pick"
              style={{ "--character-accent": developer.accent } as React.CSSProperties}
              type="button"
              key={developer.id}
              aria-pressed={isSelected}
              disabled={isUnavailable}
              onClick={() =>
                dispatch({
                  type: "TOGGLE_DEVELOPER",
                  developerId: developer.id,
                })
              }
            >
              <CharacterToken developerId={developer.id} decorative />
              <span>
                <strong>{developer.name}</strong>
                <small>{developer.role}</small>
              </span>
              <em>{isSelected ? "IN" : "+"}</em>
            </button>
          );
        })}
      </div>

      <div className="screen-actions">
        <button
          className="button button--primary"
          type="button"
          disabled={selected.length !== 3}
          onClick={() => dispatch({ type: "CONFIRM_SQUAD" })}
        >
          Lock In
        </button>
      </div>
    </section>
  );
}
