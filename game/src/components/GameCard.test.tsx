import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GameCard } from "./GameCard";

describe("GameCard", () => {
  it("shows compressed visual copy while preserving the complete accessible rules", () => {
    const markup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "new-model-dropped", instanceId: "test-new-model" }}
        effectiveCost={1}
        selected={false}
      />,
    );

    expect(markup).toContain(
      'aria-label="New Model Dropped, costs 1 Focus. Generate 2 Quick Fixes. Gain 1 Tech Debt."',
    );
    expect(markup).toContain("<b>2</b><small>Quick Fixes</small>");
    expect(markup).toContain('<span class="game-card__rules">+1 Tech Debt.</span>');
    expect(markup).toContain("game-card--long-title");
    expect(markup).toContain("Tech Debt: Persists for the run.");
    expect(markup).toContain("Generated: Created during a Cycle.");
    expect(markup).toContain('class="game-card__glossary" aria-hidden="true"');
    expect(markup).toMatch(/aria-describedby="[^"]+"/);
  });

  it("omits glossary markup when a card has no specialist vocabulary", () => {
    const markup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "ui-polish", instanceId: "test-ui-polish" }}
        effectiveCost={1}
        selected={false}
      />,
    );

    expect(markup).not.toContain("game-card__glossary");
    expect(markup).not.toContain("aria-describedby");
    expect(markup).toContain("UI Polish");
  });

  it("keeps Elspeth's playable Cycle status interactive", () => {
    const markup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "psychological-safety", instanceId: "test-safety" }}
        effectiveCost={1}
        selected={false}
      />,
    );

    expect(markup).not.toContain("game-card--unplayable");
    expect(markup).not.toContain('disabled=""');
    expect(markup).toContain("Psychological Safety");
  });

  it("makes Rare cards visually explicit beyond their reward tag", () => {
    const markup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "architecture-review", instanceId: "test-rare" }}
        effectiveCost={1}
        selected={false}
      />,
    );

    expect(markup).toContain("game-card--rare");
    expect(markup).toContain('class="game-card__family">Rare</span>');
  });

  it("presents Tech Debt as a harmful Status without a Focus cost", () => {
    const markup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "tech-debt", instanceId: "test-debt" }}
        effectiveCost={0}
        selected={false}
      />,
    );

    expect(markup).toContain("game-card--harmful-status");
    expect(markup).toContain('<span class="game-card__owner">Status</span>');
    expect(markup).not.toContain("game-card__cost");
  });

  it("visibly distinguishes legal and hovered hand-card targets", () => {
    const markup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "frontend-3", instanceId: "target-card" }}
        effectiveCost={1}
        selected={false}
        cardTarget={{ key: "hand:target-card", kind: "hand-card", instanceId: "target-card" }}
        aimed
      />,
    );

    expect(markup).toContain("is-hand-targetable");
    expect(markup).toContain("is-aimed");
    expect(markup).toContain('data-target-kind="hand-card"');
    expect(markup).toContain('aria-label="Choose Frontend as the hand target."');
    expect(markup).toContain('class="game-card__target-hint">Choose</span>');
  });

  it("renders the exact card face as a non-interactive reference", () => {
    const cronJobMarkup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "cron-job", instanceId: "codex-cron-job" }}
        effectiveCost={2}
        selected={false}
        referenceOnly
      />,
    );
    const runItNowMarkup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "run-it-now", instanceId: "codex-run-it-now" }}
        effectiveCost={1}
        selected={false}
        referenceOnly
      />,
    );
    const mattMarkup = renderToStaticMarkup(
      <GameCard
        instance={{ cardId: "pixel-perfect", instanceId: "codex-pixel-perfect" }}
        effectiveCost={1}
        selected={false}
        referenceOnly
      />,
    );

    expect(cronJobMarkup).toContain(
      '<article class="game-card game-card--work game-card--reference"',
    );
    expect(cronJobMarkup).toContain('class="game-card__cost" aria-label="2 Focus">2</span>');
    expect(cronJobMarkup).toContain("<b>3</b><small>Script</small>");
    expect(cronJobMarkup).not.toContain("<button");
    expect(runItNowMarkup).toContain("<b>▶</b><small>Run</small>");
    expect(mattMarkup).toContain("game-card--rare has-owner");
    expect(mattMarkup).toContain("character-portrait--card");
  });
});
