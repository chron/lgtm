import { disciplineLabel, getCard, getCardForInstance, getDeveloper } from "../domain/content";
import { getCardGlossaryEntries } from "../domain/cardGlossary";
import type { CardInstance } from "../domain/models";
import { useId, type PointerEventHandler } from "react";
import { CharacterPortrait } from "./CharacterPortrait";

interface GameCardProps {
  instance: CardInstance;
  effectiveCost: number;
  selected: boolean;
  disabled?: boolean;
  presentationOnly?: boolean;
  onSelect?: () => void;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onPointerMove?: PointerEventHandler<HTMLButtonElement>;
  onPointerUp?: PointerEventHandler<HTMLButtonElement>;
  onPointerCancel?: PointerEventHandler<HTMLButtonElement>;
  cardTarget?: { key: string; kind: "hand-card"; instanceId: string };
  aimed?: boolean;
}

export function GameCard({
  instance,
  effectiveCost,
  selected,
  disabled,
  presentationOnly,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  cardTarget,
  aimed,
}: GameCardProps) {
  const card = getCardForInstance(instance);
  const glossaryId = useId();
  const glossaryEntries = getCardGlossaryEntries(card);
  const owner = card.ownerId ? getDeveloper(card.ownerId) : undefined;
  const unplayable = card.kind === "status" && !card.cycleFlexibleBlockBonus;
  const rare = card.rarity === "rare" || card.tags.includes("rare");
  const harmfulStatus = card.id === "tech-debt";
  const cardAccent = owner?.accent ?? disciplineAccent(card.discipline);
  const familyTags = [
    rare ? "Rare" : undefined,
    card.tags.includes("ai-assisted") ? "AI Assisted" : undefined,
    card.tags.includes("automation") ? "Automation" : undefined,
    card.tags.includes("generated") ? "Generated" : undefined,
    card.tags.includes("exhaust") ? "Exhaust" : undefined,
    card.tags.includes("review") ? "Review" : undefined,
    card.tags.includes("defense") ? "Defense" : undefined,
    card.tags.includes("stun") ? "Cancel" : undefined,
    card.retain ? "Retain" : undefined,
  ].filter((tag): tag is string => Boolean(tag));
  const outputLabel =
    card.display?.label ??
    (card.kind === "tactic"
      ? card.stun
        ? "Cancel"
        : "Block"
      : card.automation?.kind === "install"
        ? (card.automation.blockPower ?? 0) > 0 && card.automation.power === 0
          ? "Guard"
          : "Script"
        : card.automation?.kind === "trigger"
          ? "Run"
          : card.kind === "review"
            ? "Verify"
            : card.discipline === "flexible"
              ? "Any"
              : card.kind === "work"
                ? "Work"
                : "Status");
  const disciplineTag =
    card.kind === "work" && card.discipline && card.discipline !== "flexible"
      ? disciplineLabel(card.discipline)
      : undefined;
  const longTitle = card.name.length >= 15;

  return (
    <button
      className={`game-card game-card--${card.kind}${rare ? " game-card--rare" : ""}${harmfulStatus ? " game-card--harmful-status" : ""}${owner ? " has-owner" : ""}${longTitle ? " game-card--long-title" : ""}${selected ? " is-selected" : ""}${cardTarget ? " is-hand-targetable" : ""}${aimed ? " is-aimed" : ""}`}
      style={{ "--card-accent": cardAccent } as React.CSSProperties}
      type="button"
      disabled={disabled || unplayable}
      tabIndex={presentationOnly ? -1 : undefined}
      aria-hidden={presentationOnly ? true : undefined}
      aria-describedby={glossaryEntries.length > 0 ? glossaryId : undefined}
      aria-pressed={unplayable || !onSelect ? undefined : selected}
      onClick={unplayable || presentationOnly ? undefined : onSelect}
      onPointerDown={unplayable || presentationOnly ? undefined : onPointerDown}
      onPointerMove={unplayable || presentationOnly ? undefined : onPointerMove}
      onPointerUp={unplayable || presentationOnly ? undefined : onPointerUp}
      onPointerCancel={unplayable || presentationOnly ? undefined : onPointerCancel}
      aria-label={
        unplayable
          ? `${card.name}. ${card.rules}`
          : `${selected ? "Selected: " : ""}${card.name}, costs ${effectiveCost} Focus. ${card.rules}`
      }
      data-card-target={cardTarget?.key}
      data-target-kind={cardTarget?.kind}
      data-target-instance-id={cardTarget?.instanceId}
    >
      {!unplayable && (
        <span className="game-card__cost" aria-label={`${effectiveCost} Focus`}>
          {effectiveCost}
        </span>
      )}
      <span className="game-card__owner">
        {owner?.name ??
          (card.kind === "status"
            ? "Status"
            : card.tags.includes("generated")
              ? "Generated"
              : card.tags.includes("basic")
                ? "Basic"
                : "Team")}
      </span>
      <strong className="game-card__title">{card.name}</strong>
      <span className="game-card__output" aria-hidden="true">
        <b>
          {card.display?.value ??
            (card.kind === "tactic"
              ? card.stun
                ? "!"
                : card.block
              : card.automation?.kind === "install"
                ? card.automation.power || card.automation.blockPower
                : card.automation?.kind === "trigger"
                  ? "▶"
                  : card.amount || "×")}
        </b>
        <small>{outputLabel}</small>
      </span>
      {(card.kind === "status" || card.display) && (
        <span className="game-card__rules">{card.display?.rules ?? card.rules}</span>
      )}
      {(disciplineTag || card.workKind || familyTags.length > 0) && (
        <span className="game-card__tags">
          {familyTags.map((tag) => (
            <span className="game-card__family" key={tag}>
              {tag}
            </span>
          ))}
          {disciplineTag && <span className="game-card__discipline">{disciplineTag}</span>}
          {card.kind === "work" && card.workKind === "verified" && (
            <span className="game-card__quality">Verified</span>
          )}
          {card.workKind === "unverified" && <span className="game-card__risk">Unverified</span>}
        </span>
      )}
      {owner && (
        <CharacterPortrait
          developerId={owner.id}
          mood={selected ? "thinking" : "idle"}
          mode="card"
          decorative
          eager
        />
      )}
      {glossaryEntries.length > 0 && (
        <>
          <span className="sr-only" id={glossaryId}>
            Keyword help.{" "}
            {glossaryEntries.map((entry) => entry.term + ": " + entry.description).join(" ")}
          </span>
          <span className="game-card__glossary" aria-hidden="true">
            {glossaryEntries.map((entry) => (
              <span className="game-card__glossary-entry" key={entry.id}>
                <strong>{entry.term}</strong>
                <small>{entry.description}</small>
              </span>
            ))}
          </span>
        </>
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
