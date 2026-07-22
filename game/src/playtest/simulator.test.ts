import { describe, expect, it } from "vitest";
import { createPlaytestReport, formatPlaytestReport } from "./report";
import { cards } from "../domain/content";
import { gameReducer, initialGameState, type GameState } from "../game/gameReducer";
import {
  createPlaytestMetrics,
  choosePlaytestCardReward,
  mixedPlaytestScenarios,
  playtestScenarios,
  runPlaytestBatch,
  scorePlaytestCardInstance,
  scorePlaytestCardReward,
  simulatePlaytestRun,
  updatePlaytestMetrics,
  type PlaytestRunResult,
} from "./simulator";

describe("scripted playtest harness", () => {
  it("includes the three real squads as first-class calibration scenarios", () => {
    expect(playtestScenarios.slice(0, 3).map((scenario) => scenario.id)).toEqual([
      "research-squad",
      "platform-squad",
      "panel-squad",
    ]);
  });

  it("balances the mixed matrix evenly across the complete roster", () => {
    const appearances = new Map<string, number>();
    const combinations = new Set<string>();
    for (const scenario of mixedPlaytestScenarios) {
      const combination = [...scenario.squad].sort().join("/");
      combinations.add(combination);
      for (const developerId of scenario.squad) {
        appearances.set(developerId, (appearances.get(developerId) ?? 0) + 1);
      }
    }

    expect(mixedPlaytestScenarios).toHaveLength(12);
    expect(combinations.size).toBe(12);
    expect([...appearances.values()]).toHaveLength(12);
    expect([...appearances.values()].every((count) => count === 3)).toBe(true);
    expect(
      runPlaytestBatch({
        runsPerScenario: 1,
        seed: 77,
        scenarioIds: [mixedPlaytestScenarios[0]!.id],
        scenarios: mixedPlaytestScenarios,
      })[0]?.scenarioId,
    ).toBe(mixedPlaytestScenarios[0]!.id);
  });

  it("replays every build scenario deterministically through the real reducer", () => {
    const first = playtestScenarios.map((scenario, index) =>
      simulatePlaytestRun(scenario, 4_200 + index),
    );
    const replay = playtestScenarios.map((scenario, index) =>
      simulatePlaytestRun(scenario, 4_200 + index),
    );

    expect(replay).toEqual(first);
    expect(first.every((run) => run.outcome !== "stalled")).toBe(true);
    expect(first.every((run) => run.actions > 0 && run.encounters > 0)).toBe(true);
    expect(first.every((run) => run.loopGuardTrips === 0)).toBe(true);
  }, 15_000);

  it("scores Irene's dynamically learned cards without catalogue lookup", () => {
    const source = cards.find((card) => card.id === "approved-with-comments")!;
    const learned = {
      instanceId: "learned-test",
      cardId: `learned-${source.id}`,
      dynamicDefinition: {
        ...source,
        id: `learned-${source.id}`,
        cost: 0,
        exhaust: true,
        tags: [...source.tags, "generated" as const, "exhaust" as const],
      },
    };

    expect(scorePlaytestCardInstance(learned, playtestScenarios[0]!)).toBeGreaterThan(0);
  });

  it("lights up the distinguishing signal for each assembled engine", () => {
    const bySignal = new Map(
      playtestScenarios.map((scenario, index) => [
        scenario.expectedSignal,
        simulatePlaytestRun(scenario, 8_400 + index, "balanced", "showcase"),
      ]),
    );

    expect(bySignal.get("cards")!.maxCardsInDay).toBeGreaterThanOrEqual(5);
    expect(bySignal.get("automation")!.automationInstalled).toBeGreaterThan(0);
    expect(bySignal.get("completion")!.requirementsCompleted).toBeGreaterThan(0);
    expect(bySignal.get("block")!.blockPrevented).toBeGreaterThan(0);
    expect(bySignal.get("debt")!.maxTechDebt).toBeGreaterThan(0);
    expect(bySignal.get("chain")!.peakChain).toBeGreaterThanOrEqual(3);
  }, 15_000);

  it("renders a compact dashboard and retains raw run data", () => {
    const runs = [simulatePlaytestRun(playtestScenarios[0]!, 99)];
    const report = createPlaytestReport(runs, playtestScenarios, "2026-07-19T00:00:00.000Z");
    const output = formatPlaytestReport(report);

    expect(report.runs).toEqual(runs);
    expect(output).toContain("LGTM! // SCRIPTED PLAYTESTS");
    expect(output).toContain("Research Squad");
    expect(output).toContain("LAUNCH RATE");
    expect(output).toContain("REACH");
    expect(output).toContain("CLEAN");
    expect(output).toContain("FINAL RELEASE BOSSES");
    expect(output).toContain("CARD ASSOCIATIONS");
    expect(output).toContain("association, not causation");
    expect(output).toContain("SMOKE SIGNALS");
  });

  it("compares reward cards only within eligible squads and preserves every row in JSON", () => {
    const base = simulatePlaytestRun(playtestScenarios[0]!, 6_100);
    const makeRun = (
      seed: number,
      outcome: PlaytestRunResult["outcome"],
      squad: PlaytestRunResult["squad"],
      spikeCopies: number,
    ): PlaytestRunResult => ({
      ...base,
      seed,
      outcome,
      squad,
      finalDeck: spikeCopies > 0 ? [{ cardId: "spike-it", copies: spikeCopies }] : [],
      deckSize: spikeCopies,
    });
    const runs = [
      ...Array.from({ length: 5 }, (_, index) =>
        makeRun(10 + index, index < 4 ? "victory" : "defeat", ["paul", "odin", "madi"], 2),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        makeRun(20 + index, index === 0 ? "victory" : "defeat", ["paul", "irene", "madi"], 0),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        makeRun(30 + index, "victory", ["odin", "irene", "madi"], 0),
      ),
    ];
    const report = createPlaytestReport(runs, playtestScenarios);
    const spike = report.cardAssociations.find((card) => card.cardId === "spike-it")!;
    const neverPicked = report.cardAssociations.find((card) => card.cardId === "full-stack")!;

    expect(spike).toMatchObject({
      eligibleRuns: 10,
      presentRuns: 5,
      absentRuns: 5,
      winsWith: 4,
      winsWithout: 1,
      winRateWith: 0.8,
      winRateWithout: 0.2,
      averageCopiesWhenPresent: 2,
      winningDeckInclusionRate: 0.8,
    });
    expect(spike.winRateLift).toBeCloseTo(0.6);
    expect(spike.outcomes.clean).toMatchObject({
      successesWith: 4,
      successesWithout: 1,
      strata: 1,
      stratifiedRuns: 10,
    });
    expect(spike.outcomes.clean.stratifiedLift).toBeCloseTo(0.6);
    expect(neverPicked).toMatchObject({
      eligibleRuns: 10,
      presentRuns: 0,
      winRateWith: null,
      winRateLift: null,
      averageCopiesWhenPresent: 0,
    });
    expect(formatPlaytestReport(report)).toContain(
      "No scenario-adjusted clean association clears 30 decks per side",
    );
    expect(JSON.parse(JSON.stringify(report)).cardAssociations).toHaveLength(
      report.cardAssociations.length,
    );
  }, 15_000);

  it("records card offers, acquisitions, removals, timing, and acquisition state", () => {
    let state = gameReducer(initialGameState, { type: "START_RUN", seed: 92 });
    for (const developerId of ["paul", "odin", "madi"] as const) {
      state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
    }
    state = gameReducer(state, { type: "CONFIRM_SQUAD" });
    const rewardState: GameState = {
      screen: { name: "reward" },
      run: {
        ...state.run!,
        pendingCardReward: {
          sourceNodeId: "cycle-test",
          cardIds: ["pair-programming", "health-check", "spike-it"],
        },
      },
    };
    const metrics = createPlaytestMetrics();
    const rewardAction = { type: "CHOOSE_CARD_REWARD", cardId: "pair-programming" } as const;
    const rewarded = gameReducer(rewardState, rewardAction);
    updatePlaytestMetrics(metrics, rewardState, rewardAction, rewarded);
    const added = rewarded.run!.deck.find((card) => card.cardId === "pair-programming")!;
    const weekendState: GameState = {
      screen: { name: "weekend", nodeId: "weekend-test" },
      run: rewarded.run,
    };
    const removeAction = {
      type: "CHOOSE_WEEKEND",
      choiceId: "refactor",
      instanceId: added.instanceId,
    } as const;
    const removed = gameReducer(weekendState, removeAction);
    updatePlaytestMetrics(metrics, weekendState, removeAction, removed);

    expect(metrics.cardOffers).toEqual([
      expect.objectContaining({
        source: "cycle-reward",
        offeredCardIds: ["pair-programming", "health-check", "spike-it"],
        selectedCardIds: ["pair-programming"],
        action: 1,
        morale: 13,
        techDebt: 0,
        deckSize: 10,
      }),
    ]);
    expect(metrics.cardAcquisitions).toEqual([
      expect.objectContaining({
        cardId: "pair-programming",
        sourceAction: "CHOOSE_CARD_REWARD",
        action: 1,
      }),
    ]);
    expect(metrics.cardRemovals).toEqual([
      expect.objectContaining({
        cardId: "pair-programming",
        sourceAction: "CHOOSE_WEEKEND",
        action: 2,
      }),
    ]);
  });

  it("uses scenario strata instead of mistaking squad mix for a card effect", () => {
    const base = simulatePlaytestRun(playtestScenarios[0]!, 6_200);
    let seed = 100;
    const cohort = (
      scenarioId: string,
      runs: number,
      wins: number,
      withCard: boolean,
    ): PlaytestRunResult[] =>
      Array.from({ length: runs }, (_, index) => ({
        ...base,
        seed: seed++,
        scenarioId,
        scenarioName: scenarioId,
        outcome: index < wins ? "victory" : "defeat",
        squad: ["paul", "odin", "madi"],
        finalDeck: withCard ? [{ cardId: "spike-it", copies: 1 }] : [],
        deckSize: withCard ? 1 : 0,
      }));
    const report = createPlaytestReport(
      [
        ...cohort("strong-squad", 40, 32, true),
        ...cohort("strong-squad", 10, 8, false),
        ...cohort("weak-squad", 10, 2, true),
        ...cohort("weak-squad", 40, 8, false),
      ],
      playtestScenarios,
    );
    const spike = report.cardAssociations.find((card) => card.cardId === "spike-it")!;

    expect(spike.outcomes.clean.rawLift).toBeCloseTo(0.36);
    expect(spike.outcomes.clean.stratifiedLift).toBeCloseTo(0);
    expect(spike.outcomes.clean.strata).toBe(2);
    expect(spike.outcomes.clean.confidenceLow).toBeLessThan(0);
    expect(spike.outcomes.clean.confidenceHigh).toBeGreaterThan(0);
    expect(formatPlaytestReport(report)).not.toContain("  Spike It");
  }, 15_000);

  it("assigns every reward card a viable score in at least one relevant build state", () => {
    let state = gameReducer(initialGameState, { type: "START_RUN", seed: 93 });
    for (const developerId of ["paul", "odin", "madi"] as const) {
      state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
    }
    state = gameReducer(state, { type: "CONFIRM_SQUAD" });
    const debtRun = { ...state.run!, techDebt: 6 };
    const unviable = cards
      .filter((card) => card.tags.includes("reward"))
      .filter((card) => {
        const scenarios = mixedPlaytestScenarios.filter(
          (scenario) => !card.ownerId || scenario.squad.includes(card.ownerId),
        );
        return scenarios.every(
          (scenario) => scorePlaytestCardReward(card.id, scenario, debtRun) < 8,
        );
      });

    expect(unviable.map((card) => card.id)).toEqual([]);
  });

  it("occasionally explores viable build-arounds outside the near-best score band", () => {
    let state = gameReducer(initialGameState, { type: "START_RUN", seed: 93 });
    for (const developerId of ["levi", "odin", "madi"] as const) {
      state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
    }
    state = gameReducer(state, { type: "CONFIRM_SQUAD" });
    const scenario = mixedPlaytestScenarios.find((candidate) => candidate.squad.includes("levi"))!;
    const run = state.run!;

    expect(scorePlaytestCardReward("flow-state", scenario, run)).toBeGreaterThan(
      scorePlaytestCardReward("context-loaded", scenario, run) + 8,
    );
    expect(
      Array.from({ length: 100 }, (_, rngState) =>
        choosePlaytestCardReward(["context-loaded", "flow-state"], scenario, { ...run, rngState }),
      ),
    ).toContain("context-loaded");
  });

  it("raises smoke signals for severe build outliers instead of blessing the batch", () => {
    const base = simulatePlaytestRun(playtestScenarios[0]!, 6_300);
    const cohort = (
      scenarioId: string,
      launchCount: number,
      cleanCount: number,
    ): PlaytestRunResult[] =>
      Array.from({ length: 100 }, (_, index) => ({
        ...base,
        seed: 1_000 + index + (scenarioId === "high" ? 1_000 : 0),
        scenarioId,
        scenarioName: scenarioId === "high" ? "High Build" : "Low Build",
        reachedFinalRelease: index < Math.max(launchCount, 10),
        launchedFinalRelease: index < launchCount,
        outcome: index < cleanCount ? "victory" : "defeat",
        finalDeck: [],
        deckSize: 0,
        cardOffers: [],
        cardAcquisitions: [],
        cardRemovals: [],
      }));
    const report = createPlaytestReport(
      [...cohort("low", 10, 1), ...cohort("high", 95, 30)],
      playtestScenarios,
    );

    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Low Build: only 10% launched"),
        expect.stringContaining("High Build: 95% launched"),
        expect.stringContaining("Build launch spread is 85%"),
      ]),
    );
    expect(formatPlaytestReport(report)).not.toContain("No obvious smoke signals");
  }, 15_000);

  it("matches the launch shape of the three successful human calibration runs", () => {
    const calibrations = [
      ["research-squad", 1_631_439_368],
      ["platform-squad", 2_226_205_480],
      ["panel-squad", 3_674_038_866],
    ] as const;

    for (const [scenarioId, seed] of calibrations) {
      const scenario = playtestScenarios.find((candidate) => candidate.id === scenarioId)!;
      const run = simulatePlaytestRun(scenario, seed);
      expect(run.reachedFinalRelease).toBe(true);
      expect(run.launchedFinalRelease).toBe(true);
      expect(run.outcome === "victory" || run.cause === "technically-shipped").toBe(true);
    }
  });
});
