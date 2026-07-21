import { bossDefinitions, getBossDefinition } from "../domain/bosses";
import type { DeveloperId, RunHistoryEvent, RunState } from "../domain/models";

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
  {
    id: "win-toby",
    name: "Ship With Toby",
    rules: "Win with Toby.",
    developerId: "toby",
  },
  {
    id: "win-steph",
    name: "Ship With Steph",
    rules: "Win with Steph.",
    developerId: "steph",
  },
  {
    id: "win-elspeth",
    name: "Ship With Elspeth",
    rules: "Win with Elspeth.",
    developerId: "elspeth",
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

const runAchievementDefinitions = [
  {
    id: "original-research",
    name: "Peer Reviewed",
    rules: "Win with any three of Paul, Odin, Madi, and Irene.",
  },
  {
    id: "original-platform",
    name: "Paved the Golden Path",
    rules: "Win with Seb, Toby, and Steph.",
  },
  {
    id: "original-panel",
    name: "Panel Complete",
    rules: "Win with Elspeth, Matt, and Kirsten.",
  },
  {
    id: "credits-200",
    name: "War Chest",
    rules: "Hold $200 at once.",
  },
  {
    id: "tech-debt-10",
    name: "We'll Fix It Later",
    rules: "Reach 10 Tech Debt at once.",
  },
  {
    id: "debt-cleanup",
    name: "Actually Fixed It",
    rules: "Reach 10 Tech Debt, clean it all up, then win.",
  },
  {
    id: "clean-final-release",
    name: "No Notes",
    rules: "Win with no Unverified Work or defects in the Final Release.",
  },
  {
    id: "known-issues-win",
    name: "Known Issues",
    rules: "Win by launching with known issues.",
  },
  {
    id: "one-morale-win",
    name: "By a Thread",
    rules: "Win with exactly 1 Morale remaining.",
  },
  {
    id: "final-day-win",
    name: "Last-Minute Deploy",
    rules: "Defeat a boss on its final available Day.",
  },
  {
    id: "chain-6",
    name: "Chain Reaction",
    rules: "Reach Chain 6.",
  },
  {
    id: "cards-in-day-10",
    name: "Too Many Tabs",
    rules: "Play 10 cards in one Day.",
  },
  {
    id: "three-tools",
    name: "Fully Tooled",
    rules: "Collect three Tools in one run.",
  },
  {
    id: "all-character-wins",
    name: "Whole Team Offsite",
    rules: "Win with every developer.",
  },
  {
    id: "all-boss-wins",
    name: "Stakeholder Management",
    rules: "Defeat every available boss.",
  },
  {
    id: "perfect-sprint",
    name: "Perfect Sprint",
    rules: "Ship an encounter with no Unverified Work, defects, or added Tech Debt.",
  },
  {
    id: "responsible-engineering",
    name: "Responsible Engineering",
    rules: "Win without ever exceeding 2 Tech Debt.",
  },
] as const;

export const achievementDefinitions = [
  ...squadAchievementDefinitions,
  ...bossAchievementDefinitions,
  ...runAchievementDefinitions,
];

type SquadAchievementId = (typeof squadAchievementDefinitions)[number]["id"];
type BossAchievementId = `beat-${string}`;
type RunAchievementId = (typeof runAchievementDefinitions)[number]["id"];
export type AchievementId = SquadAchievementId | BossAchievementId | RunAchievementId;

export interface AchievementStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const achievementStorageKey = "lgtm.achievements.v1";
const legacyAchievementStorageKey = "backlog.achievements.v1";

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
    const currentValue = storage.getItem(achievementStorageKey);
    const legacyValue = currentValue === null ? storage.getItem(legacyAchievementStorageKey) : null;
    const stored = JSON.parse(currentValue ?? legacyValue ?? "[]") as unknown;
    if (!Array.isArray(stored)) return [];
    const achievements = stored.filter(
      (id, index): id is AchievementId =>
        typeof id === "string" &&
        achievementIds.has(id as AchievementId) &&
        stored.indexOf(id) === index,
    );
    if (legacyValue !== null) storage.setItem(achievementStorageKey, JSON.stringify(achievements));
    return achievements;
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

function isExactSquad(squad: readonly DeveloperId[], expected: readonly DeveloperId[]): boolean {
  return (
    squad.length === expected.length && expected.every((developerId) => squad.includes(developerId))
  );
}

function isResearchSquad(squad: readonly DeveloperId[]): boolean {
  const researchDevelopers: readonly DeveloperId[] = ["paul", "odin", "madi", "irene"];
  return (
    squad.length === 3 && squad.every((developerId) => researchDevelopers.includes(developerId))
  );
}

function finalReleaseEvent(run: RunState) {
  return [...run.history]
    .reverse()
    .find(
      (event): event is Extract<RunHistoryEvent, { kind: "final-release-launched" }> =>
        event.kind === "final-release-launched",
    );
}

function hasPerfectSprint(history: readonly RunHistoryEvent[]): boolean {
  return history.some((event) => {
    if (event.kind !== "cycle-finished" || event.outcome !== "shipped") return false;
    const shippedTasks = history.filter(
      (candidate): candidate is Extract<RunHistoryEvent, { kind: "task-shipped" }> =>
        candidate.kind === "task-shipped" && candidate.nodeId === event.nodeId,
    );
    return (
      shippedTasks.length > 0 &&
      shippedTasks.every(
        (task) =>
          (task.unverifiedWork ?? 0) === 0 && task.defects === 0 && task.techDebtAdded === 0,
      )
    );
  });
}

export interface AchievementEvaluation {
  run: RunState | null;
  victory: boolean;
}

export function evaluateAchievements(
  current: readonly AchievementId[],
  { run, victory }: AchievementEvaluation,
): readonly AchievementId[] {
  const unlocked = new Set<AchievementId>(current);
  if (!run) return current;

  if (run.credits >= 200) unlocked.add("credits-200");
  if (run.peakTechDebt >= 10) unlocked.add("tech-debt-10");
  if (run.tools.length >= 3) unlocked.add("three-tools");
  if (
    (run.cycle?.peakChain !== undefined && run.cycle.peakChain >= 6) ||
    run.history.some((event) => event.kind === "card-played" && (event.chain?.count ?? 0) >= 6)
  ) {
    unlocked.add("chain-6");
  }
  if (run.history.some((event) => event.kind === "card-played" && event.cardsPlayedThisDay >= 10)) {
    unlocked.add("cards-in-day-10");
  }
  if (hasPerfectSprint(run.history)) unlocked.add("perfect-sprint");

  if (victory) {
    unlocked.add("game-won");
    for (const developerId of run.squad) {
      const achievement = squadAchievementDefinitions.find(
        (candidate) => "developerId" in candidate && candidate.developerId === developerId,
      );
      if (achievement) unlocked.add(achievement.id);
    }
    const bossAchievement = bossAchievementDefinitions.find(
      (achievement) => achievement.bossId === run.selectedBossId,
    );
    if (bossAchievement) unlocked.add(bossAchievement.id);

    if (isResearchSquad(run.squad)) unlocked.add("original-research");
    if (isExactSquad(run.squad, ["seb", "toby", "steph"])) unlocked.add("original-platform");
    if (isExactSquad(run.squad, ["elspeth", "matt", "kirsten"])) {
      unlocked.add("original-panel");
    }

    const release = finalReleaseEvent(run);
    if (release?.unverifiedWork === 0 && release.defects === 0) {
      unlocked.add("clean-final-release");
    }
    if (release?.outcome === "known-issues") unlocked.add("known-issues-win");
    if (run.morale === 1) unlocked.add("one-morale-win");
    if (release?.day === getBossDefinition(run.selectedBossId).project.maxDays) {
      unlocked.add("final-day-win");
    }
    if (unlocked.has("tech-debt-10") && run.techDebt === 0) unlocked.add("debt-cleanup");
    if (run.peakTechDebt <= 2) unlocked.add("responsible-engineering");
  }

  const characterWinIds = squadAchievementDefinitions
    .filter((achievement) => "developerId" in achievement)
    .map((achievement) => achievement.id);
  if (characterWinIds.every((id) => unlocked.has(id))) unlocked.add("all-character-wins");
  if (bossAchievementDefinitions.every((achievement) => unlocked.has(achievement.id))) {
    unlocked.add("all-boss-wins");
  }

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
