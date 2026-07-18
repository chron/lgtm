import type { DeveloperId } from "../domain/models";

export const achievementDefinitions = [
  {
    id: "game-won",
    name: "Shipped It",
    rules: "Win a run.",
  },
  {
    id: "win-paul",
    name: "Ship With Paul",
    rules: "Win with Paul.",
    developerId: "paul",
  },
  {
    id: "win-odin",
    name: "Ship With Odin",
    rules: "Win with Odin.",
    developerId: "odin",
  },
  {
    id: "win-irene",
    name: "Ship With Irene",
    rules: "Win with Irene.",
    developerId: "irene",
  },
  {
    id: "win-madi",
    name: "Ship With Madi",
    rules: "Win with Madi.",
    developerId: "madi",
  },
] as const satisfies readonly {
  id: string;
  name: string;
  rules: string;
  developerId?: DeveloperId;
}[];

export type AchievementId = (typeof achievementDefinitions)[number]["id"];

export interface AchievementStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const achievementStorageKey = "backlog.achievements.v1";

const achievementIds = new Set<AchievementId>(
  achievementDefinitions.map((achievement) => achievement.id),
);

function getBrowserStorage(): AchievementStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadAchievements(
  storage: AchievementStorage | undefined = getBrowserStorage(),
): readonly AchievementId[] {
  if (!storage) return [];

  try {
    const stored = JSON.parse(storage.getItem(achievementStorageKey) ?? "[]") as unknown;
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (id, index): id is AchievementId =>
        typeof id === "string" &&
        achievementIds.has(id as AchievementId) &&
        stored.indexOf(id) === index,
    );
  } catch {
    return [];
  }
}

export function saveAchievements(
  achievements: readonly AchievementId[],
  storage: AchievementStorage | undefined = getBrowserStorage(),
): void {
  if (!storage) return;

  try {
    storage.setItem(achievementStorageKey, JSON.stringify(achievements));
  } catch {
    // Progress still lives for this session if storage is unavailable.
  }
}

export function unlockVictoryAchievements(
  current: readonly AchievementId[],
  squad: readonly DeveloperId[],
): readonly AchievementId[] {
  const unlocked = new Set<AchievementId>(current);
  unlocked.add("game-won");
  for (const developerId of squad) unlocked.add(`win-${developerId}`);
  return achievementDefinitions
    .map((achievement) => achievement.id)
    .filter((id) => unlocked.has(id));
}

export function haveSameAchievements(
  left: readonly AchievementId[],
  right: readonly AchievementId[],
): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
