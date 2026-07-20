import { describe, expect, it } from "vitest";
import { mattContent } from "./matt";

describe("Matt's locked catalogue", () => {
  it("authors exactly one Starter, five normals, and one rare", () => {
    expect(mattContent.startingCard).toMatchObject({
      id: "delight-moment",
      ownerId: "matt",
      cost: 1,
      discipline: "frontend",
      amount: 5,
      workKind: "verified",
    });
    expect(mattContent.rewardCards.map(({ id }) => id)).toEqual([
      "one-more-pass",
      "polish-budget",
      "no-rough-edges",
      "delight-budget",
      "microinteraction",
      "pixel-perfect",
    ]);
    expect(mattContent.rewardCards.filter(({ rarity }) => rarity === "normal")).toHaveLength(5);
    expect(mattContent.rewardCards.filter(({ rarity }) => rarity === "rare")).toHaveLength(1);
  });

  it("keeps completion, overflow, and real-Review payoffs explicit for lifecycle integration", () => {
    expect(mattContent.developer).toMatchObject({
      passiveName: "Finishing Touches",
      startingCardId: "delight-moment",
    });
    expect(mattContent.startingCard.cardsDrawnOnRequirementComplete).toBe(1);
    expect(mattContent.rewardCards[1]).toMatchObject({ blockPerFinishingTouchesReview: 1 });
    expect(mattContent.rewardCards[3]).toMatchObject({
      blockPerCompletedRequirement: 3,
      display: { value: "×3", label: "Block", rules: "Per complete bar on unfinished Tasks." },
    });
    expect(mattContent.rewardCards[4]).toMatchObject({ spilloverVerifiedOnCompletion: 2 });
    expect(mattContent.rewardCards[5]).toMatchObject({
      amount: 10,
      finishingTouchesEveryTask: true,
      cardsDrawnPerTaskCleaned: 1,
      exhaust: true,
    });
  });
});
