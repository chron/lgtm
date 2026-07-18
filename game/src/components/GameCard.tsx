import { disciplineLabel, getCard, getDeveloper } from "../domain/content";
import type { CardInstance } from "../domain/models";

interface GameCardProps {
  instance: CardInstance;
  effectiveCost: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function GameCard({ instance, effectiveCost, selected, disabled, onSelect }: GameCardProps) {
  const card = getCard(instance.cardId);
  const owner = card.ownerId ? getDeveloper(card.ownerId) : undefined;
  const cardAccent = owner?.accent ?? disciplineAccent(card.discipline);
  const typeLabel =
    card.kind === "review"
      ? "Verify"
      : card.discipline === "flexible"
        ? "Any"
        : card.discipline
          ? disciplineLabel(card.discipline)
          : "Status";

  return (
    <button
      className={`game-card game-card--${card.kind}${selected ? " is-selected" : ""}`}
      style={{ "--card-accent": cardAccent } as React.CSSProperties}
      type="button"
      disabled={disabled || card.kind === "status"}
      aria-pressed={selected}
      onClick={onSelect}
      aria-label={`${selected ? "Selected: " : ""}${card.name}, costs ${effectiveCost} Focus. ${card.rules}`}
    >
      <span className="game-card__cost" aria-label={`${effectiveCost} Focus`}>
        {effectiveCost}
      </span>
      <span className="game-card__owner">{owner?.name ?? "Basic"}</span>
      <strong>{card.name}</strong>
      <span className="game-card__output" aria-hidden="true">
        <b>{card.amount || "×"}</b>
        <small>{typeLabel}</small>
      </span>
      <span className="game-card__rules">{card.rules}</span>
      {card.workKind === "unverified" && <span className="game-card__risk">Unverified</span>}
    </button>
  );
}

function disciplineAccent(discipline: ReturnType<typeof getCard>["discipline"]): string {
  switch (discipline) {
    case "frontend":
      return "var(--frontend)";
    case "backend":
      return "var(--backend)";
    case "infra":
      return "var(--infra)";
    case "flexible":
      return "var(--flexible)";
    default:
      return "var(--pink)";
  }
}
