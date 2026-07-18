import { getDeveloper } from "../domain/content";
import type { DeveloperId } from "../domain/models";
import { CharacterPortrait } from "./CharacterPortrait";

interface CharacterTokenProps {
  developerId: DeveloperId;
  compact?: boolean;
  decorative?: boolean;
}

export function CharacterToken({ developerId, compact, decorative }: CharacterTokenProps) {
  const developer = getDeveloper(developerId);

  return (
    <span
      className={`character-token${compact ? " character-token--compact" : ""}`}
      style={{ "--character-accent": developer.accent } as React.CSSProperties}
      aria-label={decorative ? undefined : developer.name}
      aria-hidden={decorative || undefined}
    >
      <CharacterPortrait developerId={developerId} mode="token" decorative />
    </span>
  );
}
