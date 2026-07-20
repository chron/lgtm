import { describe, expect, it } from "vitest";
import { sebContent } from "./seb";

describe("Seb's locked catalogue", () => {
  it("authors exactly one Starter, five normals, and one rare", () => {
    expect(sebContent.startingCard).toMatchObject({
      id: "use-the-component",
      ownerId: "seb",
      cost: 1,
      discipline: "frontend",
      amount: 4,
      workKind: "verified",
    });
    expect(sebContent.rewardCards.map(({ id }) => id)).toEqual([
      "design-tokens",
      "ladle",
      "extract-component",
      "used-everywhere",
      "polish-the-primitives",
      "design-system-migration",
    ]);
    expect(sebContent.rewardCards.filter(({ rarity }) => rarity === "normal")).toHaveLength(5);
    expect(sebContent.rewardCards.filter(({ rarity }) => rarity === "rare")).toHaveLength(1);
  });

  it("keeps Shared Components, spread, and Script effects explicit for lifecycle integration", () => {
    expect(sebContent.developer).toMatchObject({
      passiveName: "Shared Components",
      startingCardId: "use-the-component",
    });
    expect(sebContent.startingCard.frontendSpreadToOtherTasks).toBe(1);
    expect(sebContent.rewardCards[0]).toMatchObject({ frontendWorkToEveryTask: 2, exhaust: true });
    expect(sebContent.rewardCards[2]).toMatchObject({ extraSharedComponentsOnCompletion: 1 });
    expect(sebContent.rewardCards[5]).toMatchObject({
      scriptPowerOnEveryIncompleteFrontend: 1,
      triggerInstalledScripts: true,
      exhaust: true,
    });
  });
});
