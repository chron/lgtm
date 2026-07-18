import { useId } from "react";
import { getDeveloper } from "../domain/content";
import type { CharacterMood, DeveloperId } from "../domain/models";
import { CharacterPortrait } from "./CharacterPortrait";

interface PassiveChipProps {
  developerId: DeveloperId;
  spent: boolean;
  mood?: CharacterMood;
  reacting?: boolean;
}

export function PassiveChip({ developerId, spent, mood = "idle", reacting }: PassiveChipProps) {
  const tooltipId = useId();
  const developer = getDeveloper(developerId);

  return (
    <button
      className={`passive-chip${spent ? " is-spent" : ""}${reacting ? " is-reacting" : ""}`}
      style={{ "--character-accent": developer.accent } as React.CSSProperties}
      type="button"
      aria-label={`${developer.name}, ${developer.passiveName}, ${spent ? "used" : "ready"}`}
      aria-describedby={tooltipId}
    >
      <CharacterPortrait developerId={developerId} mood={mood} mode="dock" decorative eager />
      <span className="game-tooltip" id={tooltipId} role="tooltip">
        <strong>
          {developer.name} · {developer.passiveName}
        </strong>
        <span>{developer.passiveRules}</span>
        <b>{spent ? "Used" : "Ready"}</b>
      </span>
    </button>
  );
}
