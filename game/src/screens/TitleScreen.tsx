import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { DispatchProps } from "../app/types";
import { formatLgtmExpansion, getLgtmExpansion, lgtmExpansions } from "../brand";
import { createRequestedRunSeed } from "../game/random";
import { restartCombatTutorial } from "../tutorial/combatTutorialState";

interface TitleScreenProps extends DispatchProps {
  onOpenAchievements: () => void;
}

export function TitleScreen({ dispatch, onOpenAchievements }: TitleScreenProps) {
  const [expansionIndex, setExpansionIndex] = useState(() =>
    Math.floor(Math.random() * lgtmExpansions.length),
  );
  const expansion = getLgtmExpansion(expansionIndex);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => setExpansionIndex((current) => current + 1), 3600);
    return () => window.clearInterval(interval);
  }, []);

  const startRun = () =>
    dispatch({ type: "START_RUN", seed: createRequestedRunSeed(window.location.search) });

  return (
    <section className="screen title-screen" aria-labelledby="title-heading">
      <div className="title-screen__copy">
        <h1 id="title-heading" className="mega-title" aria-label="LGTM!">
          LGTM!
        </h1>
        <p
          className="title-expansion"
          key={expansionIndex}
          aria-label={formatLgtmExpansion(expansion)}
        >
          {expansion.map((word, index) => (
            <span className="title-expansion__word" key={`${word}-${index}`} aria-hidden="true">
              <strong>{word[0]}</strong>
              {word.slice(1)}
            </span>
          ))}
        </p>
        <div className="title-screen__actions">
          <button className="button button--primary" type="button" onClick={startRun}>
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
              startRun();
            }}
          >
            Tutorial Run
          </button>
        </div>
      </div>
      <div className="title-screen__canvas" aria-hidden="true">
        <div className="canvas-note canvas-note--one">LOOKS GOOD*</div>
        <div className="canvas-note canvas-note--two">*TO ME</div>
        <div className="canvas-cursor">Paul ↗</div>
      </div>
    </section>
  );
}
