import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { WeekendScreen } from "./WeekendScreen";

describe("WeekendScreen", () => {
  it("renders the calendar break, three exact plans, outcomes, and Deck access", () => {
    let state = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
    for (const developerId of ["paul", "odin", "madi"] as const) {
      state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
    }
    state = gameReducer(state, { type: "CONFIRM_SQUAD" });
    const run = state.run && { ...state.run, morale: 6 };

    const markup = renderToStaticMarkup(
      <WeekendScreen dispatch={() => undefined} run={run} onInspectDeck={() => undefined} />,
    );

    expect(markup).toContain("WEEKEND");
    expect(markup).toContain("Do");
    expect(markup).toContain("Nothing?");
    expect(markup).toContain("Rest");
    expect(markup).toContain("Refactor");
    expect(markup).toContain("Side Gig");
    expect(markup).toContain("+$80");
    expect(markup).toContain("−2 Morale");
    expect(markup).toContain("Inspect Deck, 10 cards");
  });
});
