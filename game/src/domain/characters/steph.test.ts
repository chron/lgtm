import { describe, expect, it } from "vitest";
import { stephContent } from "./steph";
import {
  automationTriggerPackets,
  canRefactorAutomation,
  doubleAutomationMeters,
  pavedRoadFocus,
} from "./stephMechanics";

describe("Steph's staged catalogue", () => {
  it("contains the locked Starter, five normals, rare, and Macro", () => {
    expect(stephContent.startingCard.id).toBe("one-click-setup");
    expect(stephContent.rewardCards).toHaveLength(6);
    expect(stephContent.rewardCards.filter((card) => card.rarity === "normal")).toHaveLength(5);
    expect(stephContent.rewardCards.filter((card) => card.rarity === "rare")).toHaveLength(1);
    expect(stephContent.generatedCards.map((card) => card.id)).toEqual(["macro"]);
  });

  it("refunds once per automation meter that actually increases", () => {
    expect(pavedRoadFocus({ script: 0, guard: 0 }, { script: 2, guard: 0 })).toBe(1);
    expect(pavedRoadFocus({ script: 1, guard: 1 }, { script: 2, guard: 3 })).toBe(2);
    expect(pavedRoadFocus({ script: 2, guard: 3 }, { script: 2, guard: 3 })).toBe(0);
    expect(pavedRoadFocus({ script: 2, guard: 3 }, { script: 1, guard: 1 })).toBe(0);
  });

  it("doubles both meters and only permits a refactor with automation present", () => {
    expect(doubleAutomationMeters({ script: 2, guard: 3 })).toEqual({ script: 4, guard: 6 });
    expect(canRefactorAutomation({ script: 0, guard: 0 })).toBe(false);
    expect(canRefactorAutomation({ script: 0, guard: 2 })).toBe(true);
  });

  it("triggers present meters in deterministic packets without inventing missing automation", () => {
    expect(automationTriggerPackets({ script: 2, guard: 0 }, 2)).toEqual([
      { script: 2, guard: 0 },
      { script: 2, guard: 0 },
    ]);
    expect(automationTriggerPackets({ script: 2, guard: 1 }, 0)).toEqual([]);
  });
});
