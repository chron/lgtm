import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { DispatchProps } from "../app/types";
import titleMergeConflict from "../assets/title/title-merge-conflict-v1.webp";
import titleShipIt from "../assets/title/title-ship-it-v1.webp";
import titleSquadCutIn from "../assets/title/title-squad-cut-in-v1.webp";
import { formatLgtmExpansion, getLgtmExpansion, lgtmExpansions } from "../brand";
import { createRequestedRunSeed } from "../game/random";
import { restartCombatTutorial } from "../tutorial/combatTutorialState";

interface TitleScreenProps extends DispatchProps {
  onOpenAchievements: () => void;
}

const titleHeroOptions = {
  "cut-in": { label: "Squad Cut-In", src: titleSquadCutIn },
  merge: { label: "Merge Conflict", src: titleMergeConflict },
  ship: { label: "Ship It", src: titleShipIt },
} as const;

type TitleHeroKey = keyof typeof titleHeroOptions;

const titleHeroKeys = Object.keys(titleHeroOptions) as TitleHeroKey[];

function getRequestedTitleHero(): TitleHeroKey {
  const requested = new URLSearchParams(window.location.search).get("hero");
  return requested && requested in titleHeroOptions ? (requested as TitleHeroKey) : "cut-in";
}

export function TitleScreen({ dispatch, onOpenAchievements }: TitleScreenProps) {
  const [expansionIndex, setExpansionIndex] = useState(() =>
    Math.floor(Math.random() * lgtmExpansions.length),
  );
  const [titleHeroKey, setTitleHeroKey] = useState(getRequestedTitleHero);
  const expansion = getLgtmExpansion(expansionIndex);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => setExpansionIndex((current) => current + 1), 3600);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setTitleHeroKey((current) => {
        const currentIndex = titleHeroKeys.indexOf(current);
        return titleHeroKeys[(currentIndex + 1) % titleHeroKeys.length];
      });
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [titleHeroKey]);

  const startRun = () =>
    dispatch({ type: "START_RUN", seed: createRequestedRunSeed(window.location.search) });

  const selectTitleHero = (heroKey: TitleHeroKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set("hero", heroKey);
    window.history.replaceState(null, "", url);
    setTitleHeroKey(heroKey);
  };

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
      <div className={`title-screen__canvas title-screen__canvas--${titleHeroKey}`}>
        <div className="canvas-note canvas-note--one" aria-hidden="true">
          LOOKS GOOD*
        </div>
        <div className="canvas-note canvas-note--two" aria-hidden="true">
          *TO ME
        </div>
        {titleHeroKeys.map((heroKey) => (
          <img
            className={`title-screen__art ${heroKey === titleHeroKey ? "is-active" : ""}`}
            src={titleHeroOptions[heroKey].src}
            alt=""
            key={heroKey}
          />
        ))}
        {import.meta.env.DEV && (
          <fieldset className="title-art-picker">
            <legend className="sr-only">Preview title artwork</legend>
            {titleHeroKeys.map((heroKey) => (
              <button
                type="button"
                key={heroKey}
                aria-pressed={heroKey === titleHeroKey}
                onClick={() => selectTitleHero(heroKey)}
              >
                {titleHeroOptions[heroKey].label}
              </button>
            ))}
          </fieldset>
        )}
      </div>
    </section>
  );
}
