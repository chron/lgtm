import { disciplineLabel, getCard, getDeveloper } from "../domain/content";
import type { CardInstance } from "../domain/models";
import type { PointerEventHandler } from "react";
import { CharacterPortrait } from "./CharacterPortrait";

interface GameCardProps {
  instance: CardInstance;
  effectiveCost: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onPointerMove?: PointerEventHandler<HTMLButtonElement>;
  onPointerUp?: PointerEventHandler<HTMLButtonElement>;
  onPointerCancel?: PointerEventHandler<HTMLButtonElement>;
}

export function GameCard({
  instance,
  effectiveCost,
  selected,
  disabled,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: GameCardProps) {
  const card = getCard(instance.cardId);
  const owner = card.ownerId ? getDeveloper(card.ownerId) : undefined;
  const unplayable = card.kind === "status";
  const cardAccent = owner?.accent ?? disciplineAccent(card.discipline);
  const outputLabel =
    card.kind === "review"
      ? "Verify"
      : card.discipline === "flexible"
        ? "Any"
        : card.kind === "work"
          ? "Work"
          : "Status";
  const disciplineTag =
    card.kind === "work" && card.discipline && card.discipline !== "flexible"
      ? disciplineLabel(card.discipline)
      : undefined;

  return (
    <button
      className={`game-card game-card--${card.kind}${owner ? " has-owner" : ""}${selected ? " is-selected" : ""}`}
      style={{ "--card-accent": cardAccent } as React.CSSProperties}
      type="button"
      disabled={disabled || unplayable}
      aria-pressed={unplayable ? undefined : selected}
      onClick={unplayable ? undefined : onSelect}
      onPointerDown={unplayable ? undefined : onPointerDown}
      onPointerMove={unplayable ? undefined : onPointerMove}
      onPointerUp={unplayable ? undefined : onPointerUp}
      onPointerCancel={unplayable ? undefined : onPointerCancel}
      aria-label={
        unplayable
          ? `${card.name}. ${card.rules}`
          : `${selected ? "Selected: " : ""}${card.name}, costs ${effectiveCost} Focus. ${card.rules}`
      }
    >
      {!unplayable && (
        <span className="game-card__cost" aria-label={`${effectiveCost} Focus`}>
          {effectiveCost}
        </span>
      )}
      <span className="game-card__owner">{owner?.name ?? "Basic"}</span>
      <strong>{card.name}</strong>
      <span className="game-card__output" aria-hidden="true">
        <b>{card.amount || "×"}</b>
        <small>{outputLabel}</small>
      </span>
      {card.kind === "status" && <span className="game-card__rules">{card.rules}</span>}
      {disciplineTag && <span className="game-card__discipline">{disciplineTag}</span>}
      {card.kind === "work" && card.workKind === "verified" && (
        <span className="game-card__quality">Verified</span>
      )}
      {card.workKind === "unverified" && <span className="game-card__risk">Unverified</span>}
      {owner && (
        <CharacterPortrait
          developerId={owner.id}
          mood={selected ? "thinking" : "idle"}
          mode="card"
          decorative
          eager
        />
      )}
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
