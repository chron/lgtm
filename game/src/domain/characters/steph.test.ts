import { describe, expect, it } from "vitest";
import { stephContent } from "./steph";
import { getCard } from "../content";
import {
  automationMeterTriggerPackets,
  automationTriggerPackets,
  canRefactorAutomation,
  canTriggerAutomation,
  doubleAutomationMeters,
  goldenPathInstallations,
  installAutomationMeters,
  pavedRoadFocus,
  pavedRoadMeterIncreases,
  refactorAutomationMeters,
} from "./stephMechanics";

describe("Steph's staged catalogue", () => {
  it("contains the locked Starter, five normals, rare, and Macro", () => {
    expect(stephContent.startingCard.id).toBe("one-click-setup");
    expect(stephContent.rewardCards).toHaveLength(6);
    expect(stephContent.rewardCards.filter((card) => card.rarity === "normal")).toHaveLength(5);
    expect(stephContent.rewardCards.filter((card) => card.rarity === "rare")).toHaveLength(1);
    expect(stephContent.generatedCards.map((card) => card.id)).toEqual(["macro"]);
  });

  it("makes the two-Focus Cron Job worth three Script", () => {
    expect(getCard("cron-job")).toMatchObject({
      cost: 2,
      automation: { kind: "install", power: 3 },
      rules: "Install Script 3.",
    });
  });

  it("refunds once per automation meter that actually increases", () => {
    expect(pavedRoadFocus({ script: 0, guard: 0 }, { script: 2, guard: 0 })).toBe(1);
    expect(pavedRoadFocus({ script: 1, guard: 1 }, { script: 2, guard: 3 })).toBe(2);
    expect(pavedRoadFocus({ script: 2, guard: 3 }, { script: 2, guard: 3 })).toBe(0);
    expect(pavedRoadFocus({ script: 2, guard: 3 }, { script: 1, guard: 1 })).toBe(0);
  });

  it("emits explicit Script-then-Guard deltas with no cap or bonus for magnitude", () => {
    expect(pavedRoadMeterIncreases({ script: 1, guard: 2 }, { script: 101, guard: 52 })).toEqual([
      { meter: "script", before: 1, after: 101, added: 100, focusGained: 1 },
      { meter: "guard", before: 2, after: 52, added: 50, focusGained: 1 },
    ]);
    expect(pavedRoadMeterIncreases({ script: 2, guard: 2 }, { script: 2, guard: 1 })).toEqual([]);
  });

  it("installs additively and grants one Paved Road packet for each changed meter", () => {
    expect(installAutomationMeters({ script: 3, guard: 4 }, { script: 2, guard: 5 })).toEqual({
      meters: { script: 5, guard: 9 },
      pavedRoad: [
        { meter: "script", before: 3, after: 5, added: 2, focusGained: 1 },
        { meter: "guard", before: 4, after: 9, added: 5, focusGained: 1 },
      ],
    });
    expect(installAutomationMeters({ script: 3, guard: 4 }, { script: 0, guard: -2 })).toEqual({
      meters: { script: 3, guard: 4 },
      pavedRoad: [],
    });
  });

  it("doubles both meters and only permits a refactor with automation present", () => {
    expect(doubleAutomationMeters({ script: 2, guard: 3 })).toEqual({ script: 4, guard: 6 });
    expect(doubleAutomationMeters({ script: 0, guard: 3 })).toEqual({ script: 0, guard: 6 });
    expect(doubleAutomationMeters({ script: -2, guard: Number.NaN })).toEqual({
      script: 0,
      guard: 0,
    });
    expect(canRefactorAutomation({ script: 0, guard: 0 })).toBe(false);
    expect(canRefactorAutomation({ script: 0, guard: 2 })).toBe(true);
    expect(canTriggerAutomation({ script: 1, guard: 0 })).toBe(true);
    expect(canTriggerAutomation({ script: -1, guard: Number.NaN })).toBe(false);
    expect(refactorAutomationMeters({ script: 2, guard: 3 })).toEqual({
      meters: { script: 4, guard: 6 },
      pavedRoad: [
        { meter: "script", before: 2, after: 4, added: 2, focusGained: 1 },
        { meter: "guard", before: 3, after: 6, added: 3, focusGained: 1 },
      ],
    });
  });

  it("triggers present meters in deterministic packets without inventing missing automation", () => {
    expect(automationTriggerPackets({ script: 2, guard: 0 }, 2)).toEqual([
      { script: 2, guard: 0 },
      { script: 2, guard: 0 },
    ]);
    expect(automationTriggerPackets({ script: 2, guard: 1 }, 0)).toEqual([]);
    expect(automationTriggerPackets({ script: 2, guard: 1 }, -2)).toEqual([]);
    expect(automationTriggerPackets({ script: 2, guard: 1 }, Number.NaN)).toEqual([]);
  });

  it("orders Hot Reload and Macro triggers by iteration, skipping absent meter types", () => {
    expect(automationMeterTriggerPackets({ script: 2, guard: 3 }, 2)).toEqual([
      { iteration: 0, meter: "script", amount: 2 },
      { iteration: 0, meter: "guard", amount: 3 },
      { iteration: 1, meter: "script", amount: 2 },
      { iteration: 1, meter: "guard", amount: 3 },
    ]);
    expect(automationMeterTriggerPackets({ script: 0, guard: 4 }, 1)).toEqual([
      { iteration: 0, meter: "guard", amount: 4 },
    ]);
    expect(automationMeterTriggerPackets({ script: 0, guard: 0 }, 2)).toEqual([]);
  });

  it("installs Golden Path on every incomplete requirement in board order", () => {
    expect(
      goldenPathInstallations([
        {
          taskId: "one",
          status: "open",
          requirements: [
            { target: 3, verified: 1, unverified: 0, script: 0, guard: 0 },
            { target: 2, verified: 2, unverified: 0, script: 4, guard: 0 },
          ],
        },
        {
          taskId: "two",
          status: "ready",
          requirements: [{ target: 4, verified: 1, unverified: 1, script: 2, guard: 1 }],
        },
        {
          taskId: "done",
          status: "shipped",
          requirements: [{ target: 8, verified: 0, unverified: 0, script: 0, guard: 0 }],
        },
      ]),
    ).toEqual([
      { taskId: "one", requirementIndex: 0, meter: "script", amount: 1 },
      { taskId: "two", requirementIndex: 0, meter: "script", amount: 1 },
    ]);
    expect(goldenPathInstallations([], 1)).toEqual([]);
    expect(goldenPathInstallations([], -1)).toEqual([]);
  });
});
