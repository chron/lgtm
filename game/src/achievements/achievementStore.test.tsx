import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AchievementsScreen } from "../screens/AchievementsScreen";
import type { AchievementId } from "./achievementStore";
import type { RunState } from "../domain/models";
import { gameReducer, initialGameState } from "../game/gameReducer";
import {
  achievementStorageKey,
  evaluateAchievements,
  loadAchievements,
  saveAchievements,
  type AchievementStorage,
} from "./achievementStore";

function testRun(overrides: Partial<RunState> = {}): RunState {
  const run = gameReducer(initialGameState, { type: "START_RUN", seed: 42 }).run;
  if (!run) throw new Error("Expected a run fixture.");
  return { ...run, squad: ["paul", "irene", "madi"], ...overrides };
}

function createStorage(initial?: string): AchievementStorage & { value?: string } {
  return {
    value: initial,
    getItem(key) {
      return key === achievementStorageKey ? (this.value ?? null) : null;
    },
    setItem(key, value) {
      if (key === achievementStorageKey) this.value = value;
    },
  };
}

describe("achievement progress", () => {
  it("unlocks a run win and every developer in the victorious squad", () => {
    const unlocked = evaluateAchievements([], { run: testRun(), victory: true });
    expect(unlocked).toEqual(
      expect.arrayContaining([
        "game-won",
        "win-paul",
        "win-irene",
        "win-madi",
        "original-research",
        "responsible-engineering",
      ]),
    );
  });

  it("persists known achievements and safely ignores corrupt or retired ids", () => {
    const storage = createStorage();
    saveAchievements(["game-won", "win-odin"], storage);
    expect(loadAchievements(storage)).toEqual(["game-won", "win-odin"]);

    storage.value = JSON.stringify(["win-madi", "old-achievement", "win-madi"]);
    expect(loadAchievements(storage)).toEqual(["win-madi"]);
    storage.value = "{nope";
    expect(loadAchievements(storage)).toEqual([]);
  });

  it("carries achievements across from the placeholder brand", () => {
    const values = new Map<string, string>([
      ["backlog.achievements.v1", JSON.stringify(["game-won", "win-irene"])],
    ]);
    const storage: AchievementStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };

    expect(loadAchievements(storage)).toEqual(["game-won", "win-irene"]);
    expect(values.get(achievementStorageKey)).toBe(JSON.stringify(["game-won", "win-irene"]));
  });

  it("renders unlocked and locked achievements with explicit states", () => {
    const markup = renderToStaticMarkup(
      <AchievementsScreen unlocked={["game-won", "win-paul"]} onBack={() => undefined} />,
    );

    expect(markup).toContain('aria-label="Achievement gallery"');
    expect(markup).toContain('aria-label="Shipped It, unlocked"');
    expect(markup).toContain('aria-label="Ship With Paul, unlocked"');
    expect(markup).toContain('aria-label="Ship With Odin, locked"');
    expect(markup).toContain("achievement-tile--major is-unlocked");
    expect(markup).toContain("is-locked");
    expect(markup).toContain("2 of 32 unlocked");
  });

  it("unlocks achievements for every newly playable roster member", () => {
    expect(
      evaluateAchievements([], {
        run: testRun({ squad: ["kirsten", "nick", "levi"] }),
        victory: true,
      }),
    ).toEqual(expect.arrayContaining(["win-kirsten", "win-nick", "win-levi"]));
    expect(
      evaluateAchievements([], {
        run: testRun({ squad: ["seb", "matt", "toby"] }),
        victory: true,
      }),
    ).toEqual(expect.arrayContaining(["win-seb", "win-matt", "win-toby"]));
    expect(
      evaluateAchievements([], {
        run: testRun({ squad: ["toby", "steph", "elspeth"] }),
        victory: true,
      }),
    ).toEqual(expect.arrayContaining(["win-toby", "win-steph", "win-elspeth"]));
  });

  it("unlocks the selected boss achievement from the boss catalogue id", () => {
    expect(
      evaluateAchievements([], {
        run: testRun({ selectedBossId: "mateja-weekend-pivot" }),
        victory: true,
      }),
    ).toContain("beat-mateja-weekend-pivot");
    expect(
      evaluateAchievements([], {
        run: testRun({ selectedBossId: "tristan-significance-test" }),
        victory: true,
      }),
    ).toContain("beat-tristan-significance-test");
  });

  it("unlocks transient run feats without requiring a victory", () => {
    const run = testRun({
      credits: 200,
      techDebt: 10,
      peakTechDebt: 10,
      tools: ["ci-runner", "merge-queue", "venture-debt"],
      history: [
        ...testRun().history,
        {
          kind: "card-played",
          nodeId: "cycle-1",
          day: 2,
          cardId: "frontend-work",
          label: "Frontend Work",
          generated: false,
          exhausted: false,
          cardsPlayedThisDay: 10,
          chain: { taskId: "primary", count: 6 },
        },
      ],
    });

    expect(evaluateAchievements([], { run, victory: false })).toEqual(
      expect.arrayContaining([
        "credits-200",
        "tech-debt-10",
        "chain-6",
        "cards-in-day-10",
        "three-tools",
      ]),
    );
  });

  it("unlocks victory feats from the final release and full-run peak", () => {
    const run = testRun({
      morale: 1,
      techDebt: 0,
      peakTechDebt: 10,
      history: [
        ...testRun().history,
        {
          kind: "final-release-launched",
          bossId: "mateja-weekend-pivot",
          day: 9,
          unverifiedWork: 0,
          defects: 0,
          moraleLoss: 0,
          outcome: "clean",
        },
      ],
    });

    expect(evaluateAchievements([], { run, victory: true })).toEqual(
      expect.arrayContaining([
        "tech-debt-10",
        "debt-cleanup",
        "clean-final-release",
        "one-morale-win",
        "final-day-win",
      ]),
    );
  });

  it("recognises known-issues launches, perfect sprints, and original squads", () => {
    const run = testRun({
      squad: ["seb", "toby", "steph"],
      history: [
        ...testRun().history,
        {
          kind: "task-shipped",
          nodeId: "cycle-1",
          taskId: "primary",
          unverifiedWork: 0,
          defects: 0,
          moraleLoss: 0,
          techDebtAdded: 0,
          focusGained: 0,
        },
        { kind: "cycle-finished", nodeId: "cycle-1", outcome: "shipped", day: 2 },
        {
          kind: "final-release-launched",
          bossId: "mateja-weekend-pivot",
          day: 4,
          unverifiedWork: 2,
          defects: 1,
          moraleLoss: 1,
          outcome: "known-issues",
        },
      ],
    });

    expect(evaluateAchievements([], { run, victory: true })).toEqual(
      expect.arrayContaining(["original-platform", "known-issues-win", "perfect-sprint"]),
    );
  });

  it("unlocks catalogue capstones after their component achievements", () => {
    const characterWins = [
      "win-paul",
      "win-odin",
      "win-irene",
      "win-madi",
      "win-kirsten",
      "win-nick",
      "win-levi",
      "win-seb",
      "win-matt",
      "win-toby",
      "win-steph",
      "win-elspeth",
    ] satisfies AchievementId[];
    const bossWins = [
      "beat-mateja-weekend-pivot",
      "beat-tristan-significance-test",
    ] satisfies AchievementId[];

    expect(
      evaluateAchievements([...characterWins, ...bossWins], {
        run: testRun(),
        victory: false,
      }),
    ).toEqual(expect.arrayContaining(["all-character-wins", "all-boss-wins"]));
  });
});
