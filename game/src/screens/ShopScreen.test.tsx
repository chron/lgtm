import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCard, getTool } from "../domain/content";
import type { RunState } from "../domain/models";
import { createShopInventory } from "../domain/shop";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { ShopScreen } from "./ShopScreen";

describe("ShopScreen", () => {
  it("renders Sharkimedes, exact stock, services, and affordability", () => {
    const started = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
    if (!started.run) throw new Error("Expected a run");
    const run = {
      ...started.run,
      squad: ["paul", "odin", "madi"] as RunState["squad"],
      credits: 0,
    };
    const inventory = createShopInventory(run, "shop-1");
    const markup = renderToStaticMarkup(
      <ShopScreen
        dispatch={() => undefined}
        run={run}
        inventory={inventory}
        onInspectDeck={() => undefined}
      />,
    );

    expect(markup).toContain("MARKETPLACE");
    expect(markup).toContain("Sharkimedes");
    expect(markup).toContain("sharkimedes");
    expect(markup).toContain(getCard(inventory.cardOffers[0]!.cardId).name.split(" ")[0]);
    expect(markup).toContain(getTool(inventory.toolOffers[0]!.toolId).name);
    expect(markup).toContain(
      `aria-label="Costs ${getCard(inventory.cardOffers[0]!.cardId).cost} Focus"`,
    );
    expect(markup).toContain("Refactor");
    expect(markup).toContain("Clone");
    expect(markup).toContain("Clean Debt");
    expect(markup).toContain("disabled");
  });
});
