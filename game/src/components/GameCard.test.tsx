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
  });
});
