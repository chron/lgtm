import { useId } from "react";
import { getDeveloper } from "../domain/content";
import type { CharacterMood, DeveloperId } from "../domain/models";
import { CharacterPortrait } from "./CharacterPortrait";

interface PassiveChipProps {
  developerId: DeveloperId;
  mood?: CharacterMood;
  reacting?: boolean;
}

export function PassiveChip({ developerId, mood = "idle", reacting }: PassiveChipProps) {
  const tooltipId = useId();
  const developer = getDeveloper(developerId);

  return (
    <button
      className={`passive-chip${reacting ? " is-reacting" : ""}`}
      style={{ "--character-accent": developer.accent } as React.CSSProperties}
      type="button"
      aria-label={`${developer.name}, ${developer.passiveName}`}
      aria-describedby={tooltipId}
    >
      <CharacterPortrait developerId={developerId} mood={mood} mode="dock" decorative eager />
      <span className="game-tooltip" id={tooltipId} role="tooltip">
        <strong>
          {developer.name} · {developer.passiveName}
        </strong>
        <span>{developer.passiveRules}</span>
        <b>Always on</b>
      </span>
    </button>
  );
}
