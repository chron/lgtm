import { useMemo, useState, type CSSProperties } from "react";
import { CardReferenceCard } from "../components/CardCollectionBrowser";
import { cards, developers } from "../domain/content";
import type { CardDefinition, Developer } from "../domain/models";

export interface CodexCategory {
  id: string;
  label: string;
  accent: string;
  cards: readonly CardDefinition[];
}

interface CodexScreenProps {
  onBack: () => void;
}

export function buildCodexCategories(
  catalogue: readonly CardDefinition[],
  roster: readonly Developer[],
): readonly CodexCategory[] {
  const basics = catalogue.filter((card) => card.tags.includes("basic"));
  const team = catalogue.filter(
    (card) =>
      !card.ownerId &&
      !card.tags.includes("basic") &&
      !card.tags.includes("generated") &&
      card.kind !== "status",
  );
  const generated = catalogue.filter(
    (card) => !card.ownerId && card.tags.includes("generated") && card.kind !== "status",
  );
  const statuses = catalogue.filter((card) => !card.ownerId && card.kind === "status");

  return [
    { id: "basic", label: "Basics", accent: "var(--yellow)", cards: basics },
    { id: "team", label: "Team", accent: "var(--blue)", cards: team },
    ...roster.map((developer) => ({
      id: developer.id,
      label: developer.name,
      accent: developer.accent,
      cards: catalogue.filter((card) => card.ownerId === developer.id),
    })),
    { id: "generated", label: "Generated", accent: "var(--mint)", cards: generated },
    { id: "status", label: "Status", accent: "var(--pink)", cards: statuses },
  ].filter((category) => category.cards.length > 0);
}

export function CodexScreen({ onBack }: CodexScreenProps) {
  const categories = useMemo(() => buildCodexCategories(cards, developers), []);
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "basic");
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0];

  if (!activeCategory) return null;

  return (
    <section className="screen codex-screen" aria-labelledby="codex-heading">
      <header className="codex-heading">
        <div>
          <h1 id="codex-heading" className="display-title">
            CODEX
          </h1>
          <p>{cards.length} cards. No secrets. Probably.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={onBack}>
          Back
        </button>
      </header>

      <nav className="codex-categories" aria-label="Card categories">
        {categories.map((category) => (
          <button
            className="codex-category"
            style={{ "--codex-accent": category.accent } as CSSProperties}
            type="button"
            key={category.id}
            aria-pressed={category.id === activeCategory.id}
            onClick={() => setActiveCategoryId(category.id)}
          >
            <span>{category.label}</span>
            <b>{category.cards.length}</b>
          </button>
        ))}
      </nav>

      <div
        className="codex-section-heading"
        style={{ "--codex-accent": activeCategory.accent } as CSSProperties}
      >
        <h2>{activeCategory.label}</h2>
        <span>{activeCategory.cards.length}</span>
      </div>

      <div className="codex-grid" aria-live="polite" aria-label={`${activeCategory.label} cards`}>
        {activeCategory.cards.map((card) => (
          <CardReferenceCard cardId={card.id} showCost key={card.id} />
        ))}
      </div>
    </section>
  );
}
