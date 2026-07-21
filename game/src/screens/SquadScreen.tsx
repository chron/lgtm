import { Shuffle } from "lucide-react";
import type { DispatchProps, RunProps } from "../app/types";
import { CharacterPortrait } from "../components/CharacterPortrait";
import { developers } from "../domain/content";

type SquadScreenProps = DispatchProps & RunProps;

export function SquadScreen({ dispatch, run }: SquadScreenProps) {
  const selected = run?.squad ?? [];

  return (
    <section className="screen" aria-labelledby="squad-heading">
      <div className="screen-heading squad-heading">
        <h1 id="squad-heading" className="display-title">
          SQUAD
        </h1>
        <div className="squad-heading__actions">
          <span className="squad-heading__count" aria-live="polite">
            {selected.length}/3 squad members chosen
          </span>
          <div className="squad-heading__buttons">
            <button
              className="button button--secondary squad-randomize"
              type="button"
              onClick={() => dispatch({ type: "RANDOMIZE_SQUAD" })}
            >
              <Shuffle aria-hidden="true" strokeWidth={3} />
              Randomize
            </button>
            <button
              className="button button--primary"
              type="button"
              disabled={selected.length !== 3}
              onClick={() => dispatch({ type: "CONFIRM_SQUAD" })}
            >
              Lock In
            </button>
          </div>
        </div>
      </div>

      <div className="squad-grid">
        {developers.map((developer) => {
          const isSelected = selected.includes(developer.id);
          const isUnavailable = !isSelected && selected.length === 3;
          const selectedIndex = selected.indexOf(developer.id);

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
              <span className="developer-pick__stage" aria-hidden="true">
                <CharacterPortrait developerId={developer.id} mode="selection" decorative eager />
              </span>
              <span className="developer-pick__copy">
                <strong>{developer.name}</strong>
                <small>{developer.role}</small>
                <b>{developer.passiveName}</b>
                <span>{developer.passiveRules}</span>
              </span>
              <em aria-hidden="true">{isSelected ? selectedIndex + 1 : "+"}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
