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
    expect(markup).toContain('class="game-card__cost" aria-label="1 Focus"');
    expect(markup).toContain("game-card--reference");
    expect(markup).not.toContain("collection-card");
    expect(markup).toContain("Frontend");
  });

  it("uses the combat renderer for automation output language", () => {
    const team = buildCodexCategories(cards, developers).find((category) => category.id === "team");
    const cronJob = team?.cards.find((card) => card.id === "cron-job");
    const runItNow = team?.cards.find((card) => card.id === "run-it-now");

    expect(cronJob?.automation).toEqual({ kind: "install", power: 3 });
    expect(runItNow?.automation).toEqual({ kind: "trigger" });
  });

  it("keeps Matt's rare in his catalogue", () => {
    const matt = buildCodexCategories(cards, developers).find((category) => category.id === "matt");

    expect(matt?.cards.find((card) => card.id === "pixel-perfect")?.rules).toBe(
      "Frontend 10. Overflow Reviews every open Task. Draw per Task cleaned. Exhaust.",
    );
  });
});
