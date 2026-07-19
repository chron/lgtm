import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AchievementsScreen } from "../screens/AchievementsScreen";
import {
  achievementStorageKey,
  loadAchievements,
  saveAchievements,
  unlockVictoryAchievements,
  type AchievementStorage,
} from "./achievementStore";

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
    expect(unlockVictoryAchievements([], ["paul", "irene", "madi"])).toEqual([
      "game-won",
      "win-paul",
      "win-irene",
      "win-madi",
    ]);
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
    expect(markup).toContain("2 of 12 unlocked");
  });

  it("unlocks achievements for every newly playable roster member", () => {
    expect(unlockVictoryAchievements([], ["kirsten", "nick", "levi"])).toEqual([
      "game-won",
      "win-kirsten",
      "win-nick",
      "win-levi",
    ]);
    expect(unlockVictoryAchievements([], ["seb", "matt"])).toEqual([
      "game-won",
      "win-seb",
      "win-matt",
    ]);
  });

  it("unlocks the selected boss achievement from the boss catalogue id", () => {
    expect(
      unlockVictoryAchievements([], ["paul", "odin", "irene"], "mateja-weekend-pivot"),
    ).toContain("beat-mateja-weekend-pivot");
    expect(
      unlockVictoryAchievements([], ["paul", "odin", "irene"], "tristan-significance-test"),
    ).toContain("beat-tristan-significance-test");
  });
});
