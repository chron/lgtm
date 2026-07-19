import { describe, expect, it } from "vitest";
import { cards } from "../content";
import type { CardDefinition } from "../models";
import {
  characterContents,
  characterGeneratedCards,
  characterRewardCards,
  characterStartingCards,
  developers,
} from ".";

describe("character content aggregate", () => {
  it("keeps developer and card ids unique", () => {
    const developerIds = developers.map((developer) => developer.id);
    const cardIds = cards.map((card) => card.id);

    expect(new Set(developerIds).size).toBe(developerIds.length);
    expect(new Set(cardIds).size).toBe(cardIds.length);
  });

  it("owns each Starter card in the same character module", () => {
    for (const content of characterContents) {
      expect(content.startingCard.id).toBe(content.developer.startingCardId);
      expect(content.startingCard.ownerId).toBe(content.developer.id);
      expect(content.startingCard.tags).toContain("character");
      expect(content.startingCard.tags).not.toContain("reward");
    }
  });

  it("collates every character card without changing module order", () => {
    const moduleRewardCards = characterContents.reduce<readonly CardDefinition[]>(
      (allCards, content) => [...allCards, ...content.rewardCards],
      [],
    );

    expect(characterStartingCards).toEqual(
      characterContents.map((content) => content.startingCard),
    );
    expect(characterRewardCards).toEqual(moduleRewardCards);
    const moduleGeneratedCards = characterContents.reduce<readonly CardDefinition[]>(
      (allCards, content) => [
        ...allCards,
        ...("generatedCards" in content ? content.generatedCards : []),
      ],
      [],
    );
    expect(characterGeneratedCards).toEqual(moduleGeneratedCards);
    expect(cards).toEqual(expect.arrayContaining([...characterGeneratedCards]));

    for (const content of characterContents) {
      const moduleCardIds = [
        content.startingCard.id,
        ...content.rewardCards.map((card) => card.id),
      ];
      const aggregateCardIds = cards
        .filter((card) => card.ownerId === content.developer.id)
        .map((card) => card.id);

      expect(aggregateCardIds).toEqual(moduleCardIds);
      expect(content.rewardCards.every((card) => card.tags.includes("reward"))).toBe(true);
    }
  });
});
