import { describe, expect, it } from "vitest";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { selectEventDefinition } from "../game/eventSelection";
import { resolveEventChoice } from "../game/eventResolution";
import { eventDefinitions, getEvent, type EventDefinition } from "./events";

function testRun() {
  const state = gameReducer(initialGameState, { type: "START_RUN", seed: 0xe7e17 });
  if (!state.run) throw new Error("Expected a run");
  return state.run;
}

describe("Event catalogue", () => {
  it("authors unique typed definitions with one usable foundation choice each", () => {
    const run = testRun();
    expect(eventDefinitions.map((event) => event.id)).toEqual([
      "quarterly-connect",
      "level-up-day",
      "quiet-hours",
      "karaoke-night",
      "coffee-summit",
      "cat-tax",
      "mascot-council",
      "founder-hackathon",
      "customer-feedback-flood",
      "enterprise-request",
      "design-opened-a-pr",
      "daylight-saving-incident",
    ]);
    expect(new Set(eventDefinitions.map((event) => event.id)).size).toBe(eventDefinitions.length);
    for (const event of eventDefinitions) {
      expect(event.title).toBeTruthy();
      expect(event.setup).toBeTruthy();
      expect(event.artTreatment).toBeTruthy();
      expect(event.weight(run)).toBeGreaterThan(0);
      expect(event.choices.some((choice) => !resolveEventChoice(choice, run).disabledReason)).toBe(
        true,
      );
      expect(new Set(event.choices.map((choice) => choice.id)).size).toBe(event.choices.length);
    }
  });

  it("resolves exact dynamic ledger previews and concise disabled reasons", () => {
    const baseRun = testRun();
    const quarterlyConnect = getEvent("quarterly-connect");
    const retro = quarterlyConnect.choices.find((choice) => choice.id === "retro");
    if (!retro) throw new Error("Expected Retro");

    expect(resolveEventChoice(retro, { ...baseRun, morale: 9 }).outcome).toEqual([
      { text: "+1 Morale", tone: "good" },
      { text: "0 Tech Debt", tone: "good" },
    ]);
    expect(resolveEventChoice(retro, { ...baseRun, morale: 10 }).outcome).toEqual([
      { text: "Morale Full", tone: "neutral" },
      { text: "0 Tech Debt", tone: "good" },
    ]);

    const duet = getEvent("karaoke-night").choices.find((choice) => choice.id === "duet");
    if (!duet) throw new Error("Expected Duet");
    expect(resolveEventChoice(duet, { ...baseRun, credits: 10 })).toMatchObject({
      disabledReason: "Need 15 Credits",
      outcome: [
        { text: "−15 Credits", tone: "risk" },
        { text: "Duplicate 1 non-Rare", tone: "good" },
      ],
    });
    expect(
      resolveEventChoice(duet, {
        ...baseRun,
        credits: 40,
        deck: [{ cardId: "frontend-3", instanceId: "test-basic" }],
      }).disabledReason,
    ).toBeUndefined();
  });

  it("filters ineligible definitions and excludes seen Events while alternatives remain", () => {
    const run = testRun();
    const excluded: EventDefinition = {
      ...getEvent("quarterly-connect"),
      id: "excluded",
      eligibility: () => false,
      weight: () => 100,
    };
    const seen = getEvent("karaoke-night");
    const unseen = getEvent("cat-tax");
    const runWithHistory = {
      ...run,
      history: [
        ...run.history,
        {
          kind: "event-resolved" as const,
          nodeId: "event-1",
          eventId: seen.id,
          choiceId: "solo",
          outcome: ["Morale Full"],
        },
      ],
    };

    expect(selectEventDefinition(runWithHistory, [excluded, seen, unseen]).event.id).toBe(
      unseen.id,
    );
  });
});
