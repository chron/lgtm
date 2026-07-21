import { useEffect, useId, useRef, useState } from "react";
import { CharacterPortrait } from "./CharacterPortrait";
import { disciplineLabel, getCard, getCardForInstance, getDeveloper } from "../domain/content";
import type { CardInstance } from "../domain/models";

type CardCollectionMode = "inspect" | "choose-one";

interface CardCollectionBrowserBaseProps {
  cards: readonly CardInstance[];
  title: string;
  orderHidden?: boolean;
  onClose: () => void;
}

type CardCollectionBrowserProps = CardCollectionBrowserBaseProps &
  (
    | {
        mode?: "inspect";
      }
    | {
        mode: "choose-one";
        confirmLabel?: string;
        canChoose?: (instance: CardInstance) => boolean;
        onChoose: (instanceId: string) => void;
      }
  );

export interface CardCollectionGroup {
  cardId: string;
  count: number;
}

interface CardCollectionEntryProps {
  count: number;
  onOpen: () => void;
}

const focusableSelector = [
  "button:not(:disabled)",
  "[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function CardCollectionEntry({ count, onOpen }: CardCollectionEntryProps) {
  return (
    <button
      className="collection-entry"
      type="button"
      onClick={onOpen}
      aria-label={`Inspect Deck, ${count} cards`}
    >
      <small>Deck</small>
      <b>{count}</b>
    </button>
  );
}

export function CardCollectionBrowser(props: CardCollectionBrowserProps) {
  const { cards, title, orderHidden, onClose } = props;
  const mode = props.mode ?? "inspect";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const descriptionId = useId();
  const titleId = useId();
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const groups = groupCardCollection(cards);
  const canChoose = props.mode === "choose-one" ? props.canChoose : undefined;
  const chosenInstanceId =
    props.mode === "choose-one" && selectedCardId
      ? chooseCardInstanceId(cards, selectedCardId, canChoose)
      : undefined;

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, []);

  useEffect(() => {
    if (selectedCardId && !chooseCardInstanceId(cards, selectedCardId, canChoose)) {
      setSelectedCardId(undefined);
    }
  }, [canChoose, cards, selectedCardId]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (shouldCloseCardCollection(event.key)) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="collection-browser__backdrop">
      <dialog
        open
        className="collection-browser"
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
      >
        <header className="collection-browser__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>
              {cards.length} {cards.length === 1 ? "card" : "cards"}
              {orderHidden ? " · Order hidden" : ""}
            </p>
          </div>
          <button
            className="collection-browser__close"
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            ×
          </button>
        </header>

        <div className="collection-browser__grid" aria-label={`${title} cards`}>
          {groups.length === 0 ? (
            <p className="collection-browser__empty">EMPTY</p>
          ) : (
            groups.map((group) => {
              const selectable = Boolean(
                mode === "choose-one" && chooseCardInstanceId(cards, group.cardId, canChoose),
              );
              return (
                <CollectionCard
                  key={group.cardId}
                  cardId={group.cardId}
                  instance={cards.find((card) => card.cardId === group.cardId)}
                  count={group.count}
                  mode={mode}
                  selected={selectedCardId === group.cardId}
                  selectable={selectable}
                  onSelect={() =>
                    setSelectedCardId((current) =>
                      toggleCardSelection(current, group.cardId, selectable),
                    )
                  }
                />
              );
            })
          )}
        </div>

        {props.mode === "choose-one" && (
          <footer className="collection-browser__actions">
            <button className="button button--text" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="button button--primary"
              type="button"
              disabled={!chosenInstanceId}
              onClick={() => {
                if (chosenInstanceId) props.onChoose(chosenInstanceId);
              }}
            >
              {props.confirmLabel ?? "Choose"}
            </button>
          </footer>
        )}
      </dialog>
    </div>
  );
}

interface CollectionCardProps {
  cardId: string;
  instance?: CardInstance;
  count: number;
  mode: CardCollectionMode;
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
}

function CollectionCard({
  cardId,
  instance,
  count,
  mode,
  selected,
  selectable,
  onSelect,
}: CollectionCardProps) {
  const card = instance ? getCardForInstance(instance) : getCard(cardId);
  const owner = card.ownerId ? getDeveloper(card.ownerId) : undefined;
  const discipline =
    card.kind === "work" && card.discipline && card.discipline !== "flexible"
      ? disciplineLabel(card.discipline)
      : undefined;
  const output =
    card.display?.label ??
    (card.kind === "tactic"
      ? card.stun
        ? "Cancel"
        : card.automation?.kind === "install" && (card.automation.blockPower ?? 0) > 0
          ? "Guard"
          : "Block"
      : card.kind === "review"
        ? "Verify"
        : card.discipline === "flexible"
          ? "Any"
          : card.kind === "work"
            ? "Work"
            : "Status");
  const outputValue =
    card.display?.value ??
    (card.kind === "tactic"
      ? card.stun
        ? "!"
        : card.block ||
          (card.automation?.kind === "install"
            ? card.automation.blockPower || card.automation.power
            : undefined) ||
          "×"
      : card.amount || "×");
  const ownerLabel = owner
    ? owner.name
    : card.kind === "status"
      ? "Status"
      : card.tags.includes("generated")
        ? "Generated"
        : card.tags.includes("basic")
          ? "Basic"
          : "Team";
  const className = `collection-card${owner ? " has-owner" : ""}${selected ? " is-selected" : ""}`;
  const style = {
    "--collection-accent": owner?.accent ?? collectionAccent(card.discipline),
  } as React.CSSProperties;
  const content = (
    <>
      <span className="collection-card__count">×{count}</span>
      <span className="collection-card__owner">{ownerLabel}</span>
      <strong>{card.name}</strong>
      <span className="collection-card__output" aria-hidden="true">
        <b>{outputValue}</b>
        <small>{output}</small>
      </span>
      <span className="collection-card__tags">
        {(instance?.generated || instance?.generatedBy) && <span>Generated</span>}
        {instance?.exhausted && <span>Exhausted</span>}
        {discipline && <span>{discipline}</span>}
        {card.kind === "work" && card.workKind === "verified" && <span>Verified</span>}
        {card.workKind === "unverified" && <span className="is-risk">Unverified</span>}
        {card.kind === "status" && !card.cycleFlexibleBlockBonus && (
          <span className="is-risk">Unplayable</span>
        )}
      </span>
      {owner && <CharacterPortrait developerId={owner.id} mode="card" decorative eager />}
    </>
  );

  if (mode === "choose-one") {
    return (
      <button
        className={className}
        style={style}
        type="button"
        disabled={!selectable}
        aria-pressed={selected}
        aria-label={`${selected ? "Selected: " : ""}${card.name}, ${count} ${count === 1 ? "copy" : "copies"}`}
        onClick={onSelect}
      >
        {content}
      </button>
    );
  }

  return (
    <article
      className={className}
      style={style}
      aria-label={`${card.name}, ${count} ${count === 1 ? "copy" : "copies"}${instance?.generatedBy ? `, generated by ${instance.generatedBy.sourceCardId} on Day ${instance.generatedBy.day}` : ""}${instance?.exhausted ? `, exhausted on Day ${instance.exhausted.day}` : ""}`}
    >
      {content}
    </article>
  );
}

export function groupCardCollection(cards: readonly CardInstance[]): CardCollectionGroup[] {
  const counts = new Map<string, number>();
  const representatives = new Map<string, CardInstance>();
  for (const instance of cards) {
    counts.set(instance.cardId, (counts.get(instance.cardId) ?? 0) + 1);
    if (!representatives.has(instance.cardId)) representatives.set(instance.cardId, instance);
  }
  return [...counts]
    .map(([cardId, count]) => ({ cardId, count }))
    .sort((left, right) => {
      const leftInstance = representatives.get(left.cardId);
      const rightInstance = representatives.get(right.cardId);
      const leftName = leftInstance
        ? getCardForInstance(leftInstance).name
        : getCard(left.cardId).name;
      const rightName = rightInstance
        ? getCardForInstance(rightInstance).name
        : getCard(right.cardId).name;
      const nameOrder = leftName.localeCompare(rightName);
      return nameOrder || left.cardId.localeCompare(right.cardId);
    });
}

export function toggleCardSelection(
  currentCardId: string | undefined,
  cardId: string,
  selectable = true,
): string | undefined {
  if (!selectable) return currentCardId;
  return currentCardId === cardId ? undefined : cardId;
}

export function chooseCardInstanceId(
  cards: readonly CardInstance[],
  cardId: string,
  canChoose?: (instance: CardInstance) => boolean,
): string | undefined {
  return cards.find((instance) => instance.cardId === cardId && (canChoose?.(instance) ?? true))
    ?.instanceId;
}

export function shouldCloseCardCollection(key: string): boolean {
  return key === "Escape";
}

function collectionAccent(discipline: ReturnType<typeof getCard>["discipline"]): string {
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
