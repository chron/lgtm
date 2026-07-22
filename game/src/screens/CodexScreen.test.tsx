import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cards, developers } from "../domain/content";
import { buildCodexCategories, CodexScreen } from "./CodexScreen";

describe("CodexScreen", () => {
  it("catalogues every card exactly once", () => {
    const categories = buildCodexCategories(cards, developers);
    const cataloguedIds = categories.flatMap((category) => category.cards.map((card) => card.id));

    expect(cataloguedIds).toHaveLength(cards.length);
    expect(new Set(cataloguedIds).size).toBe(cards.length);
    expect(categories.map((category) => category.label)).toEqual([
      "Basics",
      "Team",
      ...developers.map((developer) => developer.name),
      "Generated",
      "Status",
    ]);
  });

  it("renders the reference with costs and a top-level Back action", () => {
    const markup = renderToStaticMarkup(<CodexScreen onBack={() => undefined} />);

    expect(markup).toContain(">CODEX</h1>");
    expect(markup).toContain(">Back</button>");
    expect(markup).toContain('aria-label="1 Focus"');
    expect(markup).toContain("Frontend");
  });

  it("keeps Matt's rare in his catalogue", () => {
    const matt = buildCodexCategories(cards, developers).find((category) => category.id === "matt");

    expect(matt?.cards.find((card) => card.id === "pixel-perfect")?.rules).toBe(
      "Frontend 10. Overflow Reviews every open Task. Draw per Task cleaned. Exhaust.",
    );
  });
});
