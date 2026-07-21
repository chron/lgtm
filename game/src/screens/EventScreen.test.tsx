import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunVitals } from "../components/RunVitals";
import { getCycle, getMapNodeCycleId, mapNodes } from "../domain/content";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { EventScreen } from "./EventScreen";
import { MapScreen } from "./MapScreen";

function testRun() {
  const state = gameReducer(initialGameState, { type: "START_RUN", seed: 0xe7e17 });
  if (!state.run) throw new Error("Expected a run");
  return state.run;
}

describe("EventScreen", () => {
  it("renders definition copy and exact dynamic outcome chips", () => {
    const markup = renderToStaticMarkup(
      <EventScreen
        dispatch={() => undefined}
        run={{ ...testRun(), morale: 9 }}
        eventId="quarterly-connect"
        onInspectDeck={() => undefined}
      />,
    );

    expect(markup).toContain("Quarterly Connect");
    expect(markup).toContain("briefly remembers");
    expect(markup).toContain("+3 Morale");
    expect(markup).toContain("Borrow 1 Starter next Cycle");
    expect(markup).toContain("card choice");
  });

  it("keeps conditional and deferred choices visible with their reason", () => {
    const markup = renderToStaticMarkup(
      <EventScreen
        dispatch={() => undefined}
        run={{ ...testRun(), credits: 10 }}
        eventId="karaoke-night"
        onInspectDeck={() => undefined}
      />,
    );

    expect(markup).toContain("Duet");
    expect(markup).toContain("−15 Credits");
    expect(markup).toContain("Duplicate 1 non-Rare");
    expect(markup).toContain("Need 15 Credits");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>.*Duet/s);
  });

  it("previews fixed card rewards from the Event choice itself", () => {
    const markup = renderToStaticMarkup(
      <EventScreen
        dispatch={() => undefined}
        run={testRun()}
        eventId="design-opened-a-pr"
        onInspectDeck={() => undefined}
      />,
    );

    expect(markup).toContain("choice-preview-wrap has-card-preview");
    expect(markup).toContain("Card reward: Pair Programming.");
    expect(markup).toContain("Pair Programming, costs 1 Focus");
    expect(markup).toContain("choice-card-preview");
    const previewMarkup = markup.match(/<div class="choice-card-preview"[^>]*>(.*?)<\/div>/s)?.[1];
    expect(previewMarkup).toMatch(/<button[^>]*tabindex="-1"[^>]*aria-hidden="true"/s);
    expect(previewMarkup).not.toContain("disabled");
  });

  it("keeps authored Event titles hidden on the map", () => {
    const markup = renderToStaticMarkup(
      <MapScreen dispatch={() => undefined} run={testRun()} onInspectDeck={() => undefined} />,
    );

    expect(markup).not.toContain("Quarterly Connect");
    expect(markup).not.toContain("One Tiny Thing");
    expect(markup).not.toContain("Ship It Friday");
    expect(markup).toContain("Event, Locked");
    expect(markup).toContain("Tool + Card");
    expect(markup).toContain("Card");
    expect(markup).not.toContain("Production Incident");
    expect(markup).not.toContain("Upgrade Every Dependency");
  });

  it("renders a secondary selection without leaving the Event", () => {
    const run = {
      ...testRun(),
      credits: 40,
      deck: [{ cardId: "frontend-3", instanceId: "test-basic" }],
    };
    const pending = gameReducer(
      {
        screen: { name: "event", nodeId: "event-1", eventId: "karaoke-night" },
        run,
      },
      { type: "CHOOSE_EVENT", choiceId: "duet" },
    );
    if (pending.screen.name !== "event" || !pending.screen.resolution) {
      throw new Error("Expected a pending Event selection");
    }
    const markup = renderToStaticMarkup(
      <EventScreen
        dispatch={() => undefined}
        run={pending.run}
        eventId="karaoke-night"
        resolution={pending.screen.resolution}
        onInspectDeck={() => undefined}
      />,
    );

    expect(markup).toContain("Duplicate a card");
    expect(markup).toContain("−15 Credits");
    expect(markup).toContain("Frontend");
    expect(markup).not.toContain("Power Ballad");
  });

  it("renders Event card drafts as the same full cards used by rewards", () => {
    const run: ReturnType<typeof testRun> = {
      ...testRun(),
      squad: ["paul", "odin", "madi"],
    };
    const pending = gameReducer(
      {
        screen: { name: "event", nodeId: "event-1", eventId: "quarterly-connect" },
        run,
      },
      { type: "CHOOSE_EVENT", choiceId: "demo" },
    );
    if (pending.screen.name !== "event" || !pending.screen.resolution) {
      throw new Error("Expected an Event card draft");
    }

    const markup = renderToStaticMarkup(
      <EventScreen
        dispatch={() => undefined}
        run={pending.run}
        eventId="quarterly-connect"
        resolution={pending.screen.resolution}
        onInspectDeck={() => undefined}
      />,
    );

    expect(markup).toContain("event-selection__options is-card-options");
    expect(markup.match(/class="game-card /g)).toHaveLength(3);
    expect(markup).not.toContain("event-option--draft");
    expect(markup).toContain("Skip Card");
  });

  it("reveals requested encounter titles without revealing Event identities", () => {
    const run = {
      ...testRun(),
      mapModifiers: [{ kind: "reveal" as const, nodeIds: ["cycle-2", "event-2"] }],
    };
    const markup = renderToStaticMarkup(
      <MapScreen dispatch={() => undefined} run={run} onInspectDeck={() => undefined} />,
    );
    const node = mapNodes.find((candidate) => candidate.id === "cycle-2");
    if (!node) throw new Error("Expected cycle-2");
    const cycleId = getMapNodeCycleId(node, run.seed);
    if (!cycleId) throw new Error("Expected a seeded Cycle");

    expect(markup).toContain(getCycle(cycleId).name);
    expect(markup).not.toContain("One Tiny Thing");
  });

  it("keeps queued reward and map modifiers visible in the run HUD", () => {
    const markup = renderToStaticMarkup(
      <RunVitals
        run={{
          ...testRun(),
          nextRewardModifiers: [{ choiceCount: 4 }],
          mapModifiers: [{ kind: "reveal", nodeIds: ["cycle-2", "incident-1"] }],
        }}
      />,
    );

    expect(markup).toContain("Next reward modified");
    expect(markup).toContain("2 nodes revealed");
  });
});
