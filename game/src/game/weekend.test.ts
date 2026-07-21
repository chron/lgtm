import { describe, expect, it } from "vitest";
import { getCard } from "../domain/content";
import { canRefactorCard } from "../domain/shop";
import {
  getWeekendChoiceState,
  getWeekendSquadDraftCardIds,
  weekendSideGigCredits,
  weekendSideGigMoraleCost,
  weekendSquadDraftMoraleCost,
} from "../domain/weekend";
import { reconcileTechDebt } from "./eventResolution";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";

function startWeekend(morale = 6, nodeId: "weekend-1" | "weekend-2" = "weekend-1"): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
  for (const developerId of ["paul", "odin", "madi"] as const) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  state = {
    screen: { name: "map" },
    run: {
      ...state.run,
      morale,
      currentNodeId: nodeId === "weekend-1" ? "event-2" : "event-4",
      completedNodeIds:
        nodeId === "weekend-1"
          ? ["cycle-1", "event-1", "cycle-2", "incident-1", "event-2"]
          : [
              "cycle-1",
              "event-1",
              "cycle-2",
              "incident-1",
              "event-2",
              "weekend-1",
              "cycle-3",
              "event-3",
              "cycle-4",
              "incident-2",
              "event-4",
            ],
    },
  };
  return gameReducer(state, { type: "VISIT_NODE", nodeId });
}

describe("Weekend stop", () => {
  it("rests for up to six Morale and completes the node", () => {
    let state = startWeekend(8);
    expect(state.screen).toEqual({ name: "weekend", nodeId: "weekend-1" });

    state = gameReducer(state, { type: "CHOOSE_WEEKEND", choiceId: "rest" });

    expect(state.screen).toEqual({ name: "map" });
    expect(state.run?.morale).toBe(12);
    expect(state.run?.completedNodeIds).toContain("weekend-1");
    expect(state.run?.history.at(-1)).toEqual({
      kind: "weekend-resolved",
      nodeId: "weekend-1",
      choiceId: "rest",
      outcome: ["+4 Morale"],
    });

    const tired = startWeekend(6);
    expect(getWeekendChoiceState("rest", tired.run!).outcomes).toEqual(["+6 Morale"]);
  });

  it("makes a Side Gig lucrative but never lets it zero Morale", () => {
    let state = startWeekend(3);
    const startingCredits = state.run?.credits ?? 0;

    state = gameReducer(state, { type: "CHOOSE_WEEKEND", choiceId: "side-gig" });

    expect(state.run).toMatchObject({
      morale: 3 - weekendSideGigMoraleCost,
      credits: startingCredits + weekendSideGigCredits,
    });

    const unsafe = startWeekend(2);
    expect(getWeekendChoiceState("side-gig", unsafe.run!).disabledReason).toBe("Need 3 Morale");
    expect(gameReducer(unsafe, { type: "CHOOSE_WEEKEND", choiceId: "side-gig" })).toBe(unsafe);
  });

  it("Refactors one eligible card through an explicit instance choice", () => {
    let state = startWeekend();
    if (state.screen.name !== "weekend" || !state.run) throw new Error("Expected a Weekend");
    const removed = state.run.deck.find((card) => canRefactorCard(state.run!, card))!;

    state = gameReducer(state, {
      type: "CHOOSE_WEEKEND",
      choiceId: "refactor",
      instanceId: removed.instanceId,
    });

    expect(state.run?.deck).not.toContainEqual(removed);
    expect(state.run?.deck).toHaveLength(9);
    expect(state.run?.completedNodeIds).toContain("weekend-1");
  });

  it("lets a Weekend Refactor pay down one full Tech Debt card", () => {
    let state = startWeekend();
    if (state.screen.name !== "weekend" || !state.run) throw new Error("Expected a Weekend");
    state = { ...state, run: reconcileTechDebt(state.run, 3) };
    if (!state.run) throw new Error("Expected a run with Tech Debt");
    const debt = state.run.deck.find((card) => card.cardId === "tech-debt");
    if (!debt) throw new Error("Expected Tech Debt in deck");

    state = gameReducer(state, {
      type: "CHOOSE_WEEKEND",
      choiceId: "refactor",
      instanceId: debt.instanceId,
    });

    expect(state.run?.techDebt).toBe(0);
    expect(state.run?.deck.some((card) => card.cardId === "tech-debt")).toBe(false);
  });

  it("keeps full-Morale Rest and minimum-deck Refactor visibly unavailable", () => {
    const full = startWeekend(12);
    expect(getWeekendChoiceState("rest", full.run!)).toEqual({
      disabledReason: "Morale full",
      outcomes: ["Morale full"],
    });

    const minimum = {
      ...full.run!,
      deck: full.run!.deck.slice(0, 5),
    };
    expect(getWeekendChoiceState("refactor", minimum).disabledReason).toBe("No removable cards");
  });

  it("keeps One Last PR exclusive to the final Weekend", () => {
    const early = startWeekend(8);
    const final = startWeekend(8, "weekend-2");
    const finalCards = getWeekendSquadDraftCardIds(final.run!, "weekend-2");

    expect(getWeekendSquadDraftCardIds(early.run!, "weekend-1")).toEqual([]);
    expect(getWeekendChoiceState("squad-draft", early.run!, "weekend-1").disabledReason).toBe(
      "Final Weekend only",
    );
    expect(
      gameReducer(early, {
        type: "CHOOSE_WEEKEND",
        choiceId: "squad-draft",
        cardId: finalCards[0],
      }),
    ).toBe(early);
  });

  it("deterministically deals one real card per squad member and adds the chosen card", () => {
    let state = startWeekend(8, "weekend-2");
    if (state.screen.name !== "weekend" || !state.run) throw new Error("Expected final Weekend");
    const startingDeckSize = state.run.deck.length;
    const startingNextId = state.run.nextCardInstanceId;
    const cardIds = getWeekendSquadDraftCardIds(state.run, state.screen.nodeId);

    expect(cardIds).toHaveLength(3);
    expect(getWeekendSquadDraftCardIds(state.run, state.screen.nodeId)).toEqual(cardIds);
    expect(cardIds.map((cardId) => getCard(cardId).ownerId)).toEqual(state.run.squad);

    const chosenCardId = cardIds[1]!;
    state = gameReducer(state, {
      type: "CHOOSE_WEEKEND",
      choiceId: "squad-draft",
      cardId: chosenCardId,
    });

    expect(state.screen).toEqual({ name: "map" });
    expect(state.run?.morale).toBe(8 - weekendSquadDraftMoraleCost);
    expect(state.run?.deck).toHaveLength(startingDeckSize + 1);
    expect(state.run?.deck.at(-1)).toEqual({
      cardId: chosenCardId,
      instanceId: `card-${startingNextId}`,
    });
    expect(state.run?.history.slice(-2)).toEqual([
      { kind: "card-added", cardId: chosenCardId, sourceNodeId: "weekend-2" },
      {
        kind: "weekend-resolved",
        nodeId: "weekend-2",
        choiceId: "squad-draft",
        outcome: ["Gain 1 Squad card", "−2 Morale"],
      },
    ]);
  });

  it("keeps One Last PR meaningful at minimum deck size but not at lethal Morale", () => {
    const final = startWeekend(8, "weekend-2");
    const minimumDeckRun = { ...final.run!, deck: final.run!.deck.slice(0, 5) };
    expect(
      getWeekendChoiceState("squad-draft", minimumDeckRun, "weekend-2").disabledReason,
    ).toBeUndefined();

    const unsafe = startWeekend(weekendSquadDraftMoraleCost, "weekend-2");
    expect(getWeekendChoiceState("squad-draft", unsafe.run!, "weekend-2").disabledReason).toBe(
      "Need 3 Morale",
    );
  });
});
