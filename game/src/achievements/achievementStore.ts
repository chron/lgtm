import type { DeveloperId } from "../domain/models";
import { bossDefinitions } from "../domain/bosses";

const squadAchievementDefinitions = [
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
  {
    id: "win-kirsten",
    name: "Ship With Kirsten",
    rules: "Win with Kirsten.",
    developerId: "kirsten",
  },
  {
    id: "win-nick",
    name: "Ship With Nick",
    rules: "Win with Nick.",
    developerId: "nick",
  },
  {
    id: "win-levi",
    name: "Ship With Levi",
    rules: "Win with Levi.",
    developerId: "levi",
  },
  {
    id: "win-seb",
    name: "Ship With Seb",
    rules: "Win with Seb.",
    developerId: "seb",
  },
  {
    id: "win-matt",
    name: "Ship With Matt",
    rules: "Win with Matt.",
    developerId: "matt",
  },
] as const satisfies readonly {
  id: string;
  name: string;
  rules: string;
  developerId?: DeveloperId;
}[];

const bossAchievementDefinitions = bossDefinitions.map((boss) => ({
  id: `beat-${boss.id}` as const,
  name: boss.achievement.name,
  rules: boss.achievement.rules,
  bossId: boss.id,
}));

export const achievementDefinitions = [
  ...squadAchievementDefinitions,
  ...bossAchievementDefinitions,
];

type SquadAchievementId = (typeof squadAchievementDefinitions)[number]["id"];
type BossAchievementId = `beat-${string}`;
export type AchievementId = SquadAchievementId | BossAchievementId;

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
  bossId?: string,
): readonly AchievementId[] {
  const unlocked = new Set<AchievementId>(current);
  unlocked.add("game-won");
  for (const developerId of squad) {
    const achievement = achievementDefinitions.find(
      (candidate) => "developerId" in candidate && candidate.developerId === developerId,
    );
    if (achievement) unlocked.add(achievement.id);
  }
  const bossAchievement = bossAchievementDefinitions.find(
    (achievement) => achievement.bossId === bossId,
  );
  if (bossAchievement) unlocked.add(bossAchievement.id);
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
