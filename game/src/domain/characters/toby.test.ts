import { describe, expect, it } from "vitest";
import { tobyContent } from "./toby";
import {
  aboveAndBeyondBlock,
  canTobyTriage,
  resolveTobyCrunchSequence,
  tobyConversionRequirementIndex,
  tobyCrunchConversions,
  tobyIncomingMorale,
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

  it("falls back from completed Infra and breaks equal ties by board order", () => {
    expect(
      tobyConversionRequirementIndex([
        { discipline: "infra", target: 2, verified: 2, unverified: 0 },
        { discipline: "backend", target: 4, verified: 2, unverified: 0 },
        { discipline: "frontend", target: 3, verified: 1, unverified: 0 },
      ]),
    ).toBe(1);
    expect(
      tobyConversionRequirementIndex([
        { discipline: "infra", target: 5, verified: 2, unverified: 0 },
        { discipline: "infra", target: 6, verified: 3, unverified: 0 },
      ]),
    ).toBe(0);
    expect(
      tobyConversionRequirementIndex([
        { discipline: "infra", target: 1, verified: 4, unverified: 2 },
      ]),
    ).toBeUndefined();
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
    expect(tobyCrunchConversions(tasks, "missing", 3)).toEqual([]);
    expect(tobyCrunchConversions(tasks, "source", Number.NaN)).toEqual([]);
  });

  it("reads On Call from current unstunned, unshipped Crunch intents only", () => {
    expect(
      tobyIncomingMorale([
        {
          taskId: "one",
          status: "open",
          stunned: false,
          intent: { kind: "crunch", moraleLoss: 4 },
        },
        {
          taskId: "two",
          status: "ready",
          stunned: false,
          intent: { kind: "crunch", moraleLoss: 3 },
        },
        {
          taskId: "three",
          status: "open",
          stunned: true,
          intent: { kind: "crunch", moraleLoss: 10 },
        },
        {
          taskId: "four",
          status: "shipped",
          stunned: false,
          intent: { kind: "crunch", moraleLoss: 10 },
        },
        { taskId: "five", status: "open", stunned: false, intent: { kind: "interruption" } },
        { taskId: "six", status: "open", stunned: false, intent: null },
      ]),
    ).toBe(7);
  });

  it("gains flat Block before doubling and clamps corrupt pools", () => {
    expect(aboveAndBeyondBlock(0)).toBe(4);
    expect(aboveAndBeyondBlock(5)).toBe(14);
    expect(aboveAndBeyondBlock(-4)).toBe(4);
    expect(aboveAndBeyondBlock(Number.NaN)).toBe(4);
  });

  it("spends shared Block sequentially and converts exactly the prevented damage", () => {
    const tasks = [
      {
        taskId: "first",
        status: "open" as const,
        requirements: [{ discipline: "infra" as const, target: 9, verified: 0, unverified: 0 }],
      },
      {
        taskId: "second",
        status: "open" as const,
        requirements: [{ discipline: "backend" as const, target: 9, verified: 0, unverified: 0 }],
      },
    ];

    expect(
      resolveTobyCrunchSequence(
        tasks,
        5,
        [
          { taskId: "first", moraleLoss: 3 },
          { taskId: "second", moraleLoss: 4 },
        ],
        "source-task",
      ),
    ).toEqual({
      block: 0,
      moraleLost: 2,
      events: [
        {
          taskId: "first",
          moraleLoss: 3,
          blockBefore: 5,
          blocked: 3,
          blockAfter: 2,
          moraleLost: 0,
          conversions: [{ taskId: "first", requirementIndex: 0, amount: 3 }],
        },
        {
          taskId: "second",
          moraleLoss: 4,
          blockBefore: 2,
          blocked: 2,
          blockAfter: 0,
          moraleLost: 2,
          conversions: [{ taskId: "second", requirementIndex: 0, amount: 2 }],
        },
      ],
    });
  });

  it("broadens each prevented Crunch event board-wide without double-hitting its source", () => {
    const tasks = [
      {
        taskId: "first",
        status: "open" as const,
        requirements: [{ discipline: "infra" as const, target: 9, verified: 0, unverified: 0 }],
      },
      {
        taskId: "second",
        status: "ready" as const,
        requirements: [{ discipline: "backend" as const, target: 9, verified: 0, unverified: 0 }],
      },
    ];
    const result = resolveTobyCrunchSequence(
      tasks,
      2,
      [{ taskId: "first", moraleLoss: 5 }],
      "all-open-tasks",
    );
    expect(result.events[0]?.conversions).toEqual([
      { taskId: "first", requirementIndex: 0, amount: 2 },
      { taskId: "second", requirementIndex: 0, amount: 2 },
    ]);
    expect(result).toMatchObject({ block: 0, moraleLost: 3 });
  });

  it("treats invalid or negative Crunch values as zero", () => {
    expect(
      resolveTobyCrunchSequence([], -3, [
        { taskId: "one", moraleLoss: -2 },
        { taskId: "two", moraleLoss: Number.NaN },
      ]),
    ).toMatchObject({ block: 0, moraleLost: 0 });
  });

  it("keeps Crunch available for conversion while triaging other intents", () => {
    expect(canTobyTriage({ kind: "crunch", moraleLoss: 4 })).toBe(false);
    expect(canTobyTriage({ kind: "interruption" })).toBe(true);
    expect(canTobyTriage(null)).toBe(false);
  });
});
