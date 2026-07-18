import { getDeveloper } from "../domain/content";
import type { CharacterMood, DeveloperId } from "../domain/models";

type CharacterPortraitMode = "card" | "cutin" | "dock" | "selection" | "token";

interface CharacterPortraitProps {
  developerId: DeveloperId;
  mood?: CharacterMood;
  mode: CharacterPortraitMode;
  decorative?: boolean;
  eager?: boolean;
}

export function CharacterPortrait({
  developerId,
  mood = "idle",
  mode,
  decorative,
  eager,
}: CharacterPortraitProps) {
  const developer = getDeveloper(developerId);

  return (
    <span
      className={`character-portrait character-portrait--${mode}`}
      style={{ "--character-accent": developer.accent } as React.CSSProperties}
      aria-hidden={decorative || undefined}
    >
      <img
        src={developer.art[mood] ?? developer.art.idle}
        alt={decorative ? "" : developer.name}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
    </span>
  );
}
