import { getDeveloper } from "../domain/content";
import type { CharacterCue } from "../game/presentation";
import { CharacterPortrait } from "./CharacterPortrait";

interface CharacterReactionProps {
  cue: CharacterCue;
}

export function CharacterReaction({ cue }: CharacterReactionProps) {
  const developer = getDeveloper(cue.developerId);

  return (
    <output
      className={`character-reaction character-reaction--${cue.level}`}
      style={{ "--character-accent": developer.accent } as React.CSSProperties}
      aria-live={cue.level === "hero" ? "assertive" : "polite"}
    >
      <span className="character-reaction__wash" aria-hidden="true" />
      <CharacterPortrait
        developerId={cue.developerId}
        mood="success"
        mode="cutin"
        decorative
        eager
      />
      <span className="character-reaction__copy">
        <small>{developer.name}</small>
        <strong>{cue.title}</strong>
        <b>{cue.detail}</b>
      </span>
    </output>
  );
}
