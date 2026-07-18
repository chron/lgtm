import { Trophy } from "lucide-react";
import type { DispatchProps } from "../app/types";
import { createRunSeed } from "../game/random";
import { restartCombatTutorial } from "../tutorial/combatTutorialState";

interface TitleScreenProps extends DispatchProps {
  onOpenAchievements: () => void;
}

export function TitleScreen({ dispatch, onOpenAchievements }: TitleScreenProps) {
  return (
    <section className="screen title-screen" aria-labelledby="title-heading">
      <div className="title-screen__copy">
        <h1 id="title-heading" className="mega-title">
          BACK
          <br />
          LOG!
        </h1>
        <p>Ship fast. Fix it live.</p>
        <div className="title-screen__actions">
          <button
            className="button button--primary"
            type="button"
            onClick={() => dispatch({ type: "START_RUN", seed: createRunSeed() })}
          >
            New Run
          </button>
          <button
            className="button button--text title-achievements-button"
            type="button"
            onClick={onOpenAchievements}
          >
            <Trophy aria-hidden="true" />
            Achievements
          </button>
          <button
            className="button button--text"
            type="button"
            onClick={() => {
              restartCombatTutorial();
              dispatch({ type: "START_RUN", seed: createRunSeed() });
            }}
          >
            Tutorial Run
          </button>
        </div>
      </div>
      <div className="title-screen__canvas" aria-hidden="true">
        <div className="canvas-note canvas-note--one">LGTM-ish</div>
        <div className="canvas-note canvas-note--two">SHIP?</div>
        <div className="canvas-cursor">Paul ↗</div>
      </div>
    </section>
  );
}
