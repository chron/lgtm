import { describe, expect, it } from "vitest";
import { elspethContent } from "./elspeth";
import {
  airCoverBlock,
  blockAfterHealthyPace,
  healthyPaceBlock,
  roomToBreatheDraw,
} from "./elspethMechanics";

describe("Elspeth's staged catalogue", () => {
  it("contains the locked Starter, five normals, and rare", () => {
    expect(elspethContent.startingCard.id).toBe("make-space");
    expect(elspethContent.rewardCards).toHaveLength(6);
    expect(elspethContent.rewardCards.filter((card) => card.rarity === "normal")).toHaveLength(5);
    expect(elspethContent.rewardCards.filter((card) => card.rarity === "rare")).toHaveLength(1);
    expect(elspethContent.rewardCards.every((card) => card.ownerId === "elspeth")).toBe(true);
  });

  it("triggers Healthy Pace only from an explicit Flexible tag and stacks uncapped", () => {
    expect(healthyPaceBlock(["flexible"])).toBe(2);
    expect(healthyPaceBlock(["flexible", "generated"], 3)).toBe(8);
    expect(healthyPaceBlock(["character"], 3)).toBe(0);
    expect(blockAfterHealthyPace(4, ["flexible"], 2)).toBe(10);
  });

  it("does not mistake a non-Flexible Pitch-In for Healthy Pace", () => {
    expect(healthyPaceBlock(["character", "reward"])).toBe(0);
  });

  it("counts open Tasks for Air Cover and checks safety after Block gains", () => {
    expect(airCoverBlock(4)).toBe(12);
    expect(airCoverBlock(-1)).toBe(0);
    expect(roomToBreatheDraw(5, 5)).toBe(2);
    expect(roomToBreatheDraw(4, 5)).toBe(0);
  });

  it("generates the shared Snippet and Checklist tokens", () => {
    const checkIn = elspethContent.rewardCards.find((card) => card.id === "check-in");
    expect(checkIn).toMatchObject({
      generatedCards: [
        { cardId: "snippet", count: 1 },
        { cardId: "checklist", count: 1 },
      ],
    });
  });
});
