import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getBossDefinition } from "../domain/bosses";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { MapScreen } from "./MapScreen";

describe("Final Release preview", () => {
  it("reveals the selected stakeholder, project, and strategic warning from run start", () => {
    const started = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
    if (!started.run) throw new Error("Expected run");
    const boss = getBossDefinition(started.run.selectedBossId);

    const markup = renderToStaticMarkup(
      <MapScreen dispatch={() => undefined} run={started.run} onInspectDeck={() => undefined} />,
    );

    expect(markup).toContain("Final Review");
    expect(markup).toContain(boss.stakeholder);
    expect(markup).toContain(boss.projectTitle);
    expect(markup).toContain(boss.warning);
    expect(markup).toContain(boss.portrait);
  });
});
