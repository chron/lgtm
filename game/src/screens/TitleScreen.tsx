import { useEffect, useState } from "react";
import { LibraryBig, Trophy } from "lucide-react";
import type { DispatchProps } from "../app/types";
import titleLeviSolo from "../assets/title/title-levi-solo-v1.webp";
import titleMergeConflict from "../assets/title/title-merge-conflict-v1.webp";
import titleNickSharkimedes from "../assets/title/title-nick-sharkimedes-v1.webp";
import titlePanel from "../assets/title/title-panel-v1.webp";
import titlePlatform from "../assets/title/title-platform-v1.webp";
import titleShipIt from "../assets/title/title-ship-it-v1.webp";
import titleSquadCutIn from "../assets/title/title-squad-cut-in-v2.webp";
import { formatLgtmExpansion, getLgtmExpansion, lgtmExpansions } from "../brand";
import { createRequestedRunSeed } from "../game/random";

interface TitleScreenProps extends DispatchProps {
  onOpenAchievements: () => void;
  onOpenCodex: () => void;
}

const titleHeroOptions = {
  "cut-in": titleSquadCutIn,
  platform: titlePlatform,
  merge: titleMergeConflict,
  panel: titlePanel,
  ship: titleShipIt,
  levi: titleLeviSolo,
  "nick-sharkimedes": titleNickSharkimedes,
} as const;

type TitleHeroKey = keyof typeof titleHeroOptions;

const titleHeroKeys = Object.keys(titleHeroOptions) as TitleHeroKey[];

export function TitleScreen({ dispatch, onOpenAchievements, onOpenCodex }: TitleScreenProps) {
  const [expansionIndex, setExpansionIndex] = useState(() =>
    Math.floor(Math.random() * lgtmExpansions.length),
  );
  const [titleHeroKey, setTitleHeroKey] = useState<TitleHeroKey>("cut-in");
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
            className="button button--text title-menu-button title-achievements-button"
            type="button"
            onClick={onOpenAchievements}
          >
            <Trophy aria-hidden="true" />
            Achievements
          </button>
          <button
            className="button button--text title-menu-button title-codex-button"
            type="button"
            onClick={onOpenCodex}
          >
            <LibraryBig aria-hidden="true" />
            Codex
          </button>
        </div>
      </div>
      <figure className={`title-screen__canvas title-screen__canvas--${titleHeroKey}`}>
        <figcaption className="sr-only">LGTM team artwork</figcaption>
        <div className="canvas-note canvas-note--one" aria-hidden="true">
          LOOKS GOOD*
        </div>
        <div className="canvas-note canvas-note--two" aria-hidden="true">
          *TO ME
        </div>
        {titleHeroKeys.map((heroKey) => (
          <img
            className={`title-screen__art title-screen__art--${heroKey} ${heroKey === titleHeroKey ? "is-active" : ""}`}
            src={titleHeroOptions[heroKey]}
            alt=""
            key={heroKey}
          />
        ))}
      </figure>
    </section>
  );
}
