import { describe, expect, it } from "vitest";
import { getCardForInstance } from "../domain/content";
import { getEvent, type EventEffect } from "../domain/events";
import type { RunState } from "../domain/models";
import { isCycleShipped } from "./rules";
import {
  advanceEventResolution,
  continueEventResolution,
  reconcileTechDebt,
  resolveEventChoice,
} from "./eventResolution";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";

function playableRun(seed = 0xe7e17): RunState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of ["paul", "odin", "madi"] as const) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  return state.run;
}

function visitFirstCycle(run: RunState): GameState {
  return gameReducer({ screen: { name: "map" }, run }, { type: "VISIT_NODE", nodeId: "cycle-1" });
}

describe("Event outcome engine", () => {
  it("reconciles Debt score and persistent Debt cards in both directions", () => {
    const run = playableRun();
    const indebted = reconcileTechDebt(run, 7);
    expect(indebted.techDebt).toBe(7);
    expect(indebted.deck.filter((card) => card.cardId === "tech-debt")).toHaveLength(2);

    const cleaned = reconcileTechDebt(indebted, -5);
    expect(cleaned.techDebt).toBe(2);
    expect(cleaned.deck.filter((card) => card.cardId === "tech-debt")).toHaveLength(0);
    expect(cleaned.nextCardInstanceId).toBe(indebted.nextCardInstanceId);
  });

  it("treats maximum Morale and queued Statuses as ordinary composable ledger effects", () => {
    const run = { ...playableRun(), morale: 9, maxMorale: 10 };
    const powerBallad = getEvent("karaoke-night").choices.find(
      (choice) => choice.id === "power-ballad",
    );
    if (!powerBallad) throw new Error("Expected Power Ballad");
    const progress = advanceEventResolution(run, powerBallad.effects);

    expect(progress.run).toMatchObject({ morale: 9, maxMorale: 12 });
    expect(progress.run.nextCycleModifiers).toContainEqual({
      kind: "queued-status",
      cardId: "distraction",
      count: 1,
    });
    expect(progress.outcome).toEqual(["+2 Max Morale", "+1 Distraction next Cycle"]);
  });

  it("keeps a composed Event active across deck surgery and records exact applied outcomes", () => {
    const run = playableRun();
    const duet = getEvent("karaoke-night").choices.find((choice) => choice.id === "duet");
    if (!duet) throw new Error("Expected Duet");
    const state: GameState = {
      screen: { name: "event", nodeId: "event-1", eventId: "karaoke-night" },
      run: { ...run, currentNodeId: "event-1" },
    };

    const pending = gameReducer(state, { type: "CHOOSE_EVENT", choiceId: "duet" });
    expect(pending.screen.name).toBe("event");
    expect(pending.run?.credits).toBe(25);
    expect(pending.run?.completedNodeIds).not.toContain("event-1");
    if (pending.screen.name !== "event" || !pending.screen.resolution) {
      throw new Error("Expected a pending card selection");
    }
    expect(pending.screen.resolution.pending.prompt).toBe("Duplicate a card");
    expect(pending.screen.resolution.outcome).toEqual(["−15 Credits"]);

    const invalid = gameReducer(pending, { type: "CHOOSE_EVENT_OPTION", optionId: "nope" });
    expect(invalid).toBe(pending);

    const selected = pending.screen.resolution.pending.options[0];
    if (!selected) throw new Error("Expected a duplicate option");
    const resolved = gameReducer(pending, {
      type: "CHOOSE_EVENT_OPTION",
      optionId: selected.id,
    });
    expect(resolved.screen.name).toBe("map");
    expect(resolved.run?.deck).toHaveLength(run.deck.length + 1);
    expect(resolved.run?.history.at(-1)).toMatchObject({
      kind: "event-resolved",
      eventId: "karaoke-night",
      choiceId: "duet",
      outcome: ["−15 Credits", `Duplicated ${selected.label}`],
    });
  });

  it("supports removal, verification transforms, direct additions, drafts, Tools, and guests", () => {
    const run = playableRun(1234);
    const effects: readonly EventEffect[] = [
      {
        kind: "deck-surgery",
        operation: "remove",
        filter: { tagsAll: ["basic"] },
      },
      { kind: "deck-surgery", operation: "add", cardId: "pair-programming" },
      {
        kind: "filtered-draft",
        count: 3,
        filter: { tagsAny: ["reward"], owner: "squad" },
      },
      { kind: "tool-offer", count: 3 },
      { kind: "temporary-guest-card", count: 3 },
    ];

    let progress = advanceEventResolution(run, effects);
    const removed = progress.pending?.options[0];
    if (!removed) throw new Error("Expected removal options");
    progress = continueEventResolution(progress.run, effects, progress, removed.id)!;
    expect(progress.outcome).toContain(`Removed ${removed.label}`);
    expect(progress.run.deck.some((card) => card.instanceId === removed.id)).toBe(false);

    expect(progress.pending?.kind).toBe("draft");
    expect(progress.pending?.options).toHaveLength(3);
    const drafted = progress.pending?.options[0];
    if (!drafted) throw new Error("Expected draft options");
    progress = continueEventResolution(progress.run, effects, progress, drafted.id)!;
    expect(progress.run.deck.some((card) => card.cardId === "pair-programming")).toBe(true);
    expect(progress.run.deck.some((card) => card.cardId === drafted.cardId)).toBe(true);

    expect(progress.pending?.kind).toBe("tool");
    const tool = progress.pending?.options[0];
    if (!tool?.toolId) throw new Error("Expected Tool options");
    progress = continueEventResolution(progress.run, effects, progress, tool.id)!;
    expect(progress.run.tools).toContain(tool.toolId);

    expect(progress.pending?.kind).toBe("guest");
    const guest = progress.pending?.options[0];
    if (!guest?.cardId) throw new Error("Expected guest options");
    progress = continueEventResolution(progress.run, effects, progress, guest.id)!;
    expect(progress.pending).toBeUndefined();
    expect(progress.run.nextCycleModifiers).toContainEqual({
      kind: "temporary-guest",
      cardId: guest.cardId,
    });
    const guestCycle = visitFirstCycle(progress.run);
    expect(
      [...(guestCycle.run?.cycle?.hand ?? []), ...(guestCycle.run?.cycle?.drawPile ?? [])].some(
        (card) => card.cardId === guest.cardId,
      ),
    ).toBe(true);
    expect(guestCycle.run?.deck.some((card) => card.cardId === guest.cardId)).toBe(false);
    if (!guestCycle.run) throw new Error("Expected a guest Cycle");
    const followingCycle = gameReducer(
      {
        screen: { name: "map" },
        run: {
          ...guestCycle.run,
          cycle: null,
          currentNodeId: "event-1",
          completedNodeIds: ["cycle-1", "event-1"],
        },
      },
      { type: "VISIT_NODE", nodeId: "cycle-2" },
    );
    expect(
      [
        ...(followingCycle.run?.cycle?.hand ?? []),
        ...(followingCycle.run?.cycle?.drawPile ?? []),
      ].some((card) => card.cardId === guest.cardId),
    ).toBe(false);

    const verifyEffect: readonly EventEffect[] = [
      {
        kind: "deck-surgery",
        operation: "transform",
        filter: { tagsAll: ["basic"], disciplines: ["frontend", "backend", "infra"] },
        transform: { kind: "verify" },
      },
    ];
    let verification = advanceEventResolution(progress.run, verifyEffect);
    const basic = verification.pending?.options[0];
    if (!basic) throw new Error("Expected transform options");
    verification = continueEventResolution(verification.run, verifyEffect, verification, basic.id)!;
    const transformed = verification.run.deck.find((card) => card.instanceId === basic.id);
    expect(transformed && getCardForInstance(transformed).workKind).toBe("verified");
  });

  it("builds deterministic filtered and Tool offers without owned duplicates", () => {
    const run = playableRun(9876);
    const effects: readonly EventEffect[] = [
      {
        kind: "filtered-draft",
        count: 3,
        filter: { tagsAny: ["ai-assisted"], rarities: ["normal", "rare"] },
      },
    ];
    const first = advanceEventResolution(run, effects);
    const second = advanceEventResolution(run, effects);
    expect(first.pending?.options.map((option) => option.id)).toEqual(
      second.pending?.options.map((option) => option.id),
    );
    expect(new Set(first.pending?.options.map((option) => option.id)).size).toBe(
      first.pending?.options.length,
    );

    const toolEffects: readonly EventEffect[] = [
      { kind: "tool-offer", count: 3, toolIds: ["ci-runner", "test-suite", "merge-queue"] },
    ];
    const offer = advanceEventResolution({ ...run, tools: ["ci-runner"] }, toolEffects);
    expect(offer.pending?.options.map((option) => option.id).sort()).toEqual([
      "merge-queue",
      "test-suite",
    ]);
  });

  it("applies and consumes every one-Cycle modifier plus an optional Bounty", () => {
    const run = playableRun();
    const effects: readonly EventEffect[] = [
      { kind: "next-cycle-modifier", modifier: { kind: "opening-focus", amount: 2 } },
      { kind: "next-cycle-modifier", modifier: { kind: "opening-draw", amount: 2 } },
      {
        kind: "next-cycle-modifier",
        modifier: { kind: "queued-status", cardId: "distraction", count: 1 },
      },
      {
        kind: "next-cycle-modifier",
        modifier: { kind: "intent-protection", intentKind: "scope", count: 1 },
      },
      {
        kind: "bounty-task",
        bounty: {
          id: "customer-pain",
          name: "Fix Top Pain",
          requirements: [{ discipline: "frontend", target: 2 }],
          reward: { kind: "tool-offer" },
        },
      },
    ];
    const prepared = advanceEventResolution(run, effects);
    const state = visitFirstCycle(prepared.run);
    expect(state.screen.name).toBe("cycle");
    expect(state.run?.nextCycleModifiers).toEqual([]);
    expect(state.run?.pendingBounties).toEqual([]);
    expect(state.run?.cycle?.focus).toBe(5);
    expect(state.run?.cycle?.hand).toHaveLength(7);
    expect(state.run?.cycle?.hand.some((card) => card.cardId === "distraction")).toBe(true);
    expect(state.run?.cycle?.intentProtections.scope).toBe(1);
    expect(state.run?.cycle?.tasks).toContainEqual(
      expect.objectContaining({ taskId: "customer-pain", role: "bounty" }),
    );

    const cycle = state.run?.cycle;
    if (!cycle) throw new Error("Expected a Cycle");
    const nonBountyShipped = {
      ...cycle,
      tasks: cycle.tasks.map((task) =>
        task.role === "bounty" ? task : { ...task, status: "shipped" as const },
      ),
    };
    expect(isCycleShipped(nonBountyShipped)).toBe(true);

    const bountyReady: GameState = {
      ...state,
      run: {
        ...state.run!,
        cycle: {
          ...cycle,
          tasks: cycle.tasks.map((task) =>
            task.role === "bounty"
              ? {
                  ...task,
                  status: "ready",
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.target,
                  })),
                }
              : task,
          ),
        },
      },
    };
    const shippedBounty = gameReducer(bountyReady, {
      type: "SHIP_TASK",
      taskId: "customer-pain",
    });
    expect(shippedBounty.screen.name).toBe("cycle");
    expect(shippedBounty.run?.queuedBountyToolOffers).toBe(1);

    const protectedDay = gameReducer(state, { type: "END_DAY" });
    expect(protectedDay.run?.morale).toBe(10);
    expect(protectedDay.run?.cycle?.intentProtections.scope).toBe(0);
    expect(protectedDay.run?.cycle?.resolvedIntents).toContain("Protected · Scope · Frontend +2");
  });

  it("queues visible reward and map modifiers, then consumes reward modifiers once", () => {
    const run = playableRun(13579);
    const effects: readonly EventEffect[] = [
      { kind: "reward-modifier", modifier: { choiceCount: 4 } },
      { kind: "reward-modifier", modifier: { guaranteedRarity: "rare" } },
      { kind: "map-modifier", modifier: { kind: "reveal-upcoming", count: 2 } },
      {
        kind: "map-modifier",
        modifier: {
          kind: "connection",
          edge: { fromNodeId: "cycle-1", toNodeId: "event-2" },
        },
      },
    ];
    const prepared = advanceEventResolution({ ...run, currentNodeId: "event-1" }, effects);
    expect(prepared.run.nextRewardModifiers).toHaveLength(2);
    expect(prepared.run.mapModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "reveal", nodeIds: ["cycle-2", "incident-1"] }),
        expect.objectContaining({ kind: "connection" }),
      ]),
    );
    const connected = gameReducer(
      {
        screen: { name: "map" },
        run: {
          ...prepared.run,
          currentNodeId: "cycle-1",
          completedNodeIds: ["cycle-1"],
        },
      },
      { type: "VISIT_NODE", nodeId: "event-2" },
    );
    expect(connected.screen.name).toBe("event");

    let state = visitFirstCycle({ ...prepared.run, currentNodeId: null });
    if (!state.run?.cycle) throw new Error("Expected a Cycle");
    const activeRun = state.run;
    const activeCycle = state.run.cycle;
    state = {
      ...state,
      run: {
        ...activeRun,
        cycle: {
          ...activeCycle,
          tasks: activeCycle.tasks.map((task) => ({
            ...task,
            status: "ready",
            requirements: task.requirements.map((requirement) => ({
              ...requirement,
              verified: requirement.target,
            })),
          })),
        },
      },
    };
    const taskId = activeCycle.tasks.find((task) => task.role !== "bounty")?.taskId;
    if (!taskId) throw new Error("Expected a Task");
    state = gameReducer(state, { type: "SHIP_TASK", taskId });
    expect(state.run?.pendingCardReward?.cardIds).toHaveLength(4);
    expect(
      state.run?.pendingCardReward?.cardIds.some(
        (cardId) => getCardForInstance({ cardId, instanceId: "test" }).rarity === "rare",
      ),
    ).toBe(true);
    expect(state.run?.nextRewardModifiers).toEqual([]);
  });

  it("disables impossible secondary selections before charging their costs", () => {
    const empty = { ...playableRun(), deck: [] };
    const duet = getEvent("karaoke-night").choices.find((choice) => choice.id === "duet");
    if (!duet) throw new Error("Expected Duet");
    expect(resolveEventChoice(duet, empty).disabledReason).toBe("No eligible cards");

    const mascot = getEvent("cat-tax").choices.find((choice) => choice.id === "make-them-mascot");
    if (!mascot) throw new Error("Expected mascot choice");
    expect(resolveEventChoice(mascot, { ...empty, tools: ["cat-tax"] }).disabledReason).toBe(
      "No Tools available",
    );
  });
});
