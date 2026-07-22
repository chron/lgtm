import { describe, expect, it } from "vitest";
import { cards, getCard, tools } from "./content";

function normaliseName(name: string): string {
  return name
    .toLocaleLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

describe("shared content catalogue", () => {
  it("keeps card and Tool ids and player-facing names distinct", () => {
    const cardIds = new Set(cards.map((card) => card.id));
    const cardNames = new Set(cards.map((card) => normaliseName(card.name)));

    expect(tools.filter((tool) => cardIds.has(tool.id))).toEqual([]);
    expect(tools.filter((tool) => cardNames.has(normaliseName(tool.name)))).toEqual([]);
  });

  it("makes Buffer Time a real upgrade over the starting Block card", () => {
    expect(getCard("buffer-time")).toMatchObject({
      name: "Buffer Time",
      cost: 1,
      block: 4,
      cardsDrawn: 1,
      rules: "Gain 4 Block. Draw 1.",
    });
    expect(getCard("standup-cover")).not.toHaveProperty("cardsDrawn");
  });
});
