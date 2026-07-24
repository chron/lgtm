import { describe, expect, it } from "vitest";
import { elspethContent } from "./elspeth";
import {
  airCoverBlock,
  blockAfterHealthyPace,
  countElspethOpenTasks,
  elspethIncomingMorale,
  healthyGuardrailsSteps,
  healthyPaceBlock,
  resolveHealthyPacePlay,
  roomToBreatheDraw,
  sustainablePaceResolution,
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
    expect(healthyPaceBlock(["flexible"], 50)).toBe(102);
    expect(healthyPaceBlock(["flexible"], -2)).toBe(2);
  });

  it("does not mistake a non-Flexible Pitch-In for Healthy Pace", () => {
    expect(healthyPaceBlock(["character", "reward"])).toBe(0);
  });

  it("counts open Tasks for Air Cover and checks safety after Block gains", () => {
    expect(airCoverBlock(4)).toBe(12);
    expect(airCoverBlock(-1)).toBe(0);
    expect(airCoverBlock(2.8)).toBe(6);
    expect(
      countElspethOpenTasks([{ status: "open" }, { status: "ready" }, { status: "shipped" }]),
    ).toBe(2);
    expect(roomToBreatheDraw(5, 5)).toBe(1);
    expect(roomToBreatheDraw(4, 5)).toBe(0);
    expect(roomToBreatheDraw(0, 0)).toBe(1);
    expect(roomToBreatheDraw(Number.NaN, 3)).toBe(0);
  });

  it("totals displayed unstunned Crunch and ignores every other intent", () => {
    expect(
      elspethIncomingMorale([
        { status: "open", stunned: false, intent: { kind: "crunch", moraleLoss: 4 } },
        { status: "ready", stunned: false, intent: { kind: "crunch", moraleLoss: 3 } },
        { status: "open", stunned: true, intent: { kind: "crunch", moraleLoss: 99 } },
        { status: "shipped", stunned: false, intent: { kind: "crunch", moraleLoss: 99 } },
        { status: "open", stunned: false, intent: { kind: "interruption" } },
        { status: "open", stunned: false, intent: undefined },
      ]),
    ).toBe(7);
  });

  it("pays Focus before granting passive Block and leaves illegal plays untouched", () => {
    expect(
      resolveHealthyPacePlay({
        currentFocus: 3,
        cardCost: 1,
        currentBlock: 4,
        tags: ["flexible"],
        psychologicalSafetyStacks: 2,
      }),
    ).toEqual({ legal: true, focusAfterCost: 2, blockGained: 6, blockAfterPassive: 10 });
    expect(
      resolveHealthyPacePlay({
        currentFocus: 0,
        cardCost: 1,
        currentBlock: 4,
        tags: ["flexible"],
        psychologicalSafetyStacks: 99,
      }),
    ).toEqual({ legal: false, focusAfterCost: 0, blockGained: 0, blockAfterPassive: 4 });
    expect(
      resolveHealthyPacePlay({
        currentFocus: 1,
        cardCost: 1,
        currentBlock: 4,
        tags: ["character"],
      }),
    ).toEqual({ legal: true, focusAfterCost: 0, blockGained: 0, blockAfterPassive: 4 });
  });

  it("keeps Healthy Guardrails in passive, Work, install, trigger order", () => {
    expect(healthyGuardrailsSteps(2)).toEqual([
      { kind: "pay-focus", amount: 1 },
      { kind: "gain-block", amount: 6, source: "healthy-pace" },
      { kind: "work", amount: 1, workKind: "verified" },
      { kind: "install-guard", amount: 2 },
      { kind: "trigger-guard", amount: 2 },
    ]);
  });

  it("models Sustainable Pace as the deliberately dramatic uncapped reset", () => {
    expect(sustainablePaceResolution({ currentBlock: 12, currentFocus: 4 })).toEqual({
      block: 22,
      focus: 7,
      cardsDrawn: 3,
    });
    expect(sustainablePaceResolution({ currentBlock: -1, currentFocus: Number.NaN })).toEqual({
      block: 10,
      focus: 3,
      cardsDrawn: 3,
    });
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
