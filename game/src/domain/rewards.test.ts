import { describe, expect, it } from "vitest";
import { getCard } from "./content";
import type { DeveloperId, RunState } from "./models";
import {
  createCardRewardOffer,
  eligibleRewardCardIdsForRun,
  rewardArchetypesForSquad,
  sharedBridgeArchetypes,
  weightedTeamRewardCardIds,
  type RewardArchetype,
} from "./rewards";
import { gameReducer, initialGameState } from "../game/gameReducer";

function startRun(
  squad: readonly [DeveloperId, DeveloperId, DeveloperId],
  seed = 0x0ffe12,
): RunState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a confirmed run");
  return state.run;
}

function copiesOf(cardId: string, cardIds: readonly string[]): number {
  return cardIds.filter((candidate) => candidate === cardId).length;
}

describe("archetype-aware rewards", () => {
  it("covers every shared build family with intentional two-way bridges", () => {
    const covered = new Set<RewardArchetype>();
    for (const [cardId, archetypes] of Object.entries(sharedBridgeArchetypes)) {
      expect(getCard(cardId).ownerId).toBeUndefined();
      expect(new Set(archetypes)).toHaveLength(2);
      for (const archetype of archetypes) covered.add(archetype);
    }

    expect(covered).toEqual(
      new Set<RewardArchetype>([
        "card-storm",
        "automation",
        "completion",
        "block",
        "debt",
        "planned-burst",
      ]),
    );
  });

  it("soft-weights relevant bridges without removing surprising team cards", () => {
    const platform = weightedTeamRewardCardIds(["seb", "toby", "steph"]);

    expect(rewardArchetypesForSquad(["seb", "toby", "steph"])).toEqual(
      new Set<RewardArchetype>(["completion", "block", "automation"]),
    );
    expect(copiesOf("health-check", platform)).toBe(2);
    expect(copiesOf("spring-cleaning", platform)).toBe(1);
    expect(copiesOf("open-source-it", platform)).toBe(2);
  });

  it("keeps a pure Trigger out of offers until the run has a way to install Script", () => {
    const noAutomation = startRun(["paul", "irene", "levi"]);
    const madiAutomation = startRun(["paul", "madi", "levi"]);
    const draftedAutomation = {
      ...noAutomation,
      deck: [...noAutomation.deck, { cardId: "green-build", instanceId: "reward-green-build" }],
    };

    expect(eligibleRewardCardIdsForRun(noAutomation)).not.toContain("run-it-now");
    expect(eligibleRewardCardIdsForRun(madiAutomation)).toContain("run-it-now");
    expect(eligibleRewardCardIdsForRun(draftedAutomation)).toContain("run-it-now");
  });

  it("produces deterministic, varied three-card offers with a useful team lane", () => {
    const squad = ["seb", "toby", "steph"] as const;
    const baseRun = startRun(squad);
    const offers = Array.from(
      { length: 64 },
      (_, seed) => createCardRewardOffer({ ...baseRun, rngState: seed + 1 }).cardIds,
    );
    const replay = Array.from(
      { length: 64 },
      (_, seed) => createCardRewardOffer({ ...baseRun, rngState: seed + 1 }).cardIds,
    );
    const relevant = rewardArchetypesForSquad(squad);
    const relevantTeamCards = new Set(
      Object.entries(sharedBridgeArchetypes)
        .filter(([, archetypes]) => archetypes.some((archetype) => relevant.has(archetype)))
        .map(([cardId]) => cardId),
    );

    expect(replay).toEqual(offers);
    expect(offers.every((offer) => offer.length === 3 && new Set(offer).size === 3)).toBe(true);
    expect(new Set(offers.map((offer) => offer[1])).size).toBeGreaterThan(10);
    expect(offers.filter((offer) => relevantTeamCards.has(offer[1]!)).length).toBeGreaterThan(32);
  });
});
