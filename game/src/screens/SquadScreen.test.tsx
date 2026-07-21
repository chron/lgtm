import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RunState } from "../domain/models";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { SquadScreen } from "./SquadScreen";

describe("SquadScreen", () => {
  it("puts the Lock In action above the roster with a clear selection count", () => {
    const started = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
    if (!started.run) throw new Error("Expected a run");

    const markup = renderToStaticMarkup(
      <SquadScreen dispatch={() => undefined} run={started.run} />,
    );

    expect(markup).toContain("0/3 squad members chosen");
    expect(markup).toContain("Randomize");
    expect(markup.indexOf("Randomize")).toBeLessThan(markup.indexOf("squad-grid"));
    expect(markup.indexOf("Lock In")).toBeLessThan(markup.indexOf("squad-grid"));
  });

  it("enables Lock In when all three squad members are chosen", () => {
    const started = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
    if (!started.run) throw new Error("Expected a run");
    const run = {
      ...started.run,
      squad: ["paul", "odin", "madi"] as RunState["squad"],
    };

    const markup = renderToStaticMarkup(<SquadScreen dispatch={() => undefined} run={run} />);

    expect(markup).toContain("3/3 squad members chosen");
    expect(markup).toContain(
      '<button class="button button--primary" type="button">Lock In</button>',
    );
  });
});
