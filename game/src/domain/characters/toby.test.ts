import { describe, expect, it } from "vitest";
import { tobyContent } from "./toby";
import {
  canTobyTriage,
  tobyConversionRequirementIndex,
  tobyCrunchConversions,
} from "./tobyMechanics";

describe("Toby's staged catalogue", () => {
  it("contains the locked Starter, five normals, and rare", () => {
    expect(tobyContent.startingCard.id).toBe("check-the-logs");
    expect(tobyContent.rewardCards).toHaveLength(6);
    expect(tobyContent.rewardCards.filter((card) => card.rarity === "normal")).toHaveLength(5);
    expect(tobyContent.rewardCards.filter((card) => card.rarity === "rare")).toHaveLength(1);
    expect(tobyContent.rewardCards.every((card) => card.ownerId === "toby")).toBe(true);
  });

  it("prefers Infra before the lowest remaining requirement", () => {
    expect(
      tobyConversionRequirementIndex([
        { discipline: "frontend", target: 2, verified: 1, unverified: 0 },
        { discipline: "infra", target: 8, verified: 0, unverified: 0 },
        { discipline: "infra", target: 5, verified: 1, unverified: 0 },
      ]),
    ).toBe(2);
  });

  it("converts only the actual prevented Crunch amount and can broaden board-wide", () => {
    const tasks = [
      {
        taskId: "source",
        status: "open" as const,
        requirements: [{ discipline: "infra" as const, target: 8, verified: 2, unverified: 0 }],
      },
      {
        taskId: "other",
        status: "ready" as const,
        requirements: [{ discipline: "backend" as const, target: 4, verified: 0, unverified: 1 }],
      },
      {
        taskId: "done",
        status: "shipped" as const,
        requirements: [{ discipline: "infra" as const, target: 4, verified: 0, unverified: 0 }],
      },
    ];

    expect(tobyCrunchConversions(tasks, "source", 3)).toEqual([
      { taskId: "source", requirementIndex: 0, amount: 3 },
    ]);
    expect(tobyCrunchConversions(tasks, "source", 3, "all-open-tasks")).toEqual([
      { taskId: "source", requirementIndex: 0, amount: 3 },
      { taskId: "other", requirementIndex: 0, amount: 3 },
    ]);
    expect(tobyCrunchConversions(tasks, "source", 0, "all-open-tasks")).toEqual([]);
  });

  it("keeps Crunch available for conversion while triaging other intents", () => {
    expect(canTobyTriage({ kind: "crunch", moraleLoss: 4 })).toBe(false);
    expect(canTobyTriage({ kind: "interruption" })).toBe(true);
  });
});
