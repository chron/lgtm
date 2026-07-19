import { describe, expect, it } from "vitest";
import { getCardGlossaryEntries } from "./cardGlossary";
import { getCard } from "./content";

function termsFor(cardId: string): string[] {
  return getCardGlossaryEntries(getCard(cardId)).map((entry) => entry.term);
}

describe("card glossary", () => {
  it("derives Paul's specialist mechanics from the card definition", () => {
    expect(termsFor("side-quest")).toEqual(["Prototype", "Side Quest", "Exhaust"]);
    expect(termsFor("ebb-and-flow")).toEqual(["Distraction", "Exhaust"]);
    expect(termsFor("new-model-dropped")).toEqual(["Tech Debt", "Generated"]);
  });

  it("explains shared work, review, defense, and automation vocabulary", () => {
    expect(termsFor("frontend-3")).toEqual(["Unverified"]);
    expect(termsFor("flexible-2")).toEqual(["Any"]);
    expect(termsFor("quick-fix")).toEqual([
      "AI Assisted",
      "Unverified",
      "Generated",
      "Exhaust",
      "Any",
    ]);
    expect(termsFor("review-3")).toEqual(["Verify"]);
    expect(termsFor("feature-flag")).toEqual(["Stun", "Block"]);
    expect(termsFor("health-check")).toEqual(["Block", "Script", "Guard"]);
  });

  it("covers Madi's planning, automation, and Generated token vocabulary", () => {
    expect(termsFor("custom-toolchain")).toEqual(["AI Assisted", "Cycle Bonus", "Exhaust"]);
    expect(termsFor("plan-it-out")).toEqual(["Next Draw", "Exhaust"]);
    expect(termsFor("write-the-rfc")).toEqual(["Verify", "Script"]);
    expect(termsFor("agentic-loop")).toEqual([
      "Script",
      "Trigger",
      "AI Assisted",
      "Unverified",
      "Any",
    ]);
    expect(termsFor("sub-agent")).toEqual([
      "Script",
      "Trigger",
      "AI Assisted",
      "Unverified",
      "Generated",
      "Exhaust",
      "Any",
    ]);
  });

  it("covers Odin's Retain, control, AI tradeoff, and broad Review vocabulary", () => {
    expect(termsFor("one-more-diagram")).toEqual(["Verify", "Retain"]);
    expect(termsFor("strong-opinions-loosely-held")).toEqual([
      "Review Stun",
      "Day Bonus",
      "Exhaust",
    ]);
    expect(termsFor("boring-technology")).toEqual(["Stunned Task"]);
    expect(termsFor("manual-mode")).toEqual(["Day Bonus", "Discard", "AI Assisted", "Exhaust"]);
    expect(termsFor("architecture-review")).toEqual([
      "Verify",
      "Review Stun",
      "Every Task",
      "Exhaust",
    ]);
    expect(termsFor("comment")).toEqual(["Verify", "Generated", "Exhaust"]);
  });

  it("covers Irene's precise completion, spillover, and copied Work vocabulary", () => {
    expect(termsFor("quietly-automated")).toEqual(["Script", "Any"]);
    expect(termsFor("last-10-percent")).toEqual(["Precise Target", "Exhaust", "Any"]);
    expect(termsFor("no-fuss")).toEqual(["Completion", "Any"]);
    expect(termsFor("while-im-here")).toEqual(["Completion", "Spillover", "Any"]);
    expect(termsFor("quick-study")).toEqual(["Printed Work", "Generated", "Exhaust"]);
    expect(termsFor("all-sorted")).toEqual(["Complete", "Exhaust"]);
  });

  it("explains Card Storm, hand planning, and Chain cards without extra card copy", () => {
    expect(termsFor("second-attempt")).toEqual(["Exhaust Return", "Exhaust"]);
    expect(termsFor("it-all-adds-up")).toEqual(["Card Storm", "Any"]);
    expect(termsFor("put-a-pin-in-it")).toEqual(["Retain", "Exhaust"]);
    expect(termsFor("prioritise-ruthlessly")).toEqual(["Draw Order", "Exhaust"]);
    expect(termsFor("heads-down")).toEqual(["Chain"]);
    expect(termsFor("flow-state")).toEqual(["Chain", "Exhaust"]);
  });

  it("explains Seb's cascades and Matt's real overflow Review", () => {
    expect(termsFor("use-the-component")).toEqual(["Shared Components"]);
    expect(termsFor("design-system-migration")).toEqual(["Script", "Exhaust"]);
    expect(termsFor("polish-budget")).toEqual(["Finishing Touches", "Exhaust"]);
    expect(termsFor("pixel-perfect")).toEqual(["Finishing Touches", "Overflow Review", "Exhaust"]);
  });
});
